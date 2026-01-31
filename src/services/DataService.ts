import { db, FlightCacheItem, ScheduleRow } from '../db/ReserveDatabase';
import { ReserveBlock, ScheduleData, RowData } from '../types';

export const DataService = {
    initialize: async () => {
        // Check for legacy data in localStorage
        const legacyBlocks = localStorage.getItem('reserve_lite_blocks');
        const legacySchedule = localStorage.getItem('reserve_lite_data_v2');
        const legacyCache = localStorage.getItem('flight_status_cache');

        if (legacyBlocks || legacySchedule || legacyCache) {
            console.log('Migrating legacy data to IndexedDB...');
            await db.transaction('rw', db.blocks, db.schedule, db.flightCache, async () => {

                // Migrate Blocks
                if (legacyBlocks) {
                    try {
                        const blocks: ReserveBlock[] = JSON.parse(legacyBlocks);
                        await db.blocks.bulkPut(blocks);
                    } catch (e) {
                        console.error('Failed to migrate blocks', e);
                    }
                }

                // Migrate Schedule
                if (legacySchedule) {
                    try {
                        const schedule: ScheduleData = JSON.parse(legacySchedule);
                        const rows: ScheduleRow[] = [];
                        Object.entries(schedule).forEach(([airport, airportRows]) => {
                            airportRows.forEach(row => {
                                rows.push({ ...row, airport });
                            });
                        });
                        await db.schedule.bulkPut(rows);
                    } catch (e) {
                        console.error('Failed to migrate schedule', e);
                    }
                }

                // Migrate Flight Cache
                if (legacyCache) {
                    try {
                        const cache = JSON.parse(legacyCache);
                        const items: FlightCacheItem[] = [];
                        Object.entries(cache).forEach(([key, val]: [string, any]) => {
                            if (val && val.data && val.timestamp) {
                                items.push({
                                    flightNumber: key,
                                    timestamp: val.timestamp,
                                    data: val.data
                                });
                            }
                        });
                        await db.flightCache.bulkPut(items);
                    } catch (e) {
                        console.error('Failed to migrate cache', e);
                    }
                }
            });

            // Clear legacy data after successful migration (or partial)
            // We keep config and auth in localStorage
            localStorage.removeItem('reserve_lite_blocks');
            localStorage.removeItem('reserve_lite_data_v2');
            localStorage.removeItem('flight_status_cache');
            console.log('Migration complete.');
        }
    },

    // Block Methods
    getBlocks: () => db.blocks.toArray(),
    addBlock: (block: ReserveBlock) => db.blocks.put(block),
    updateBlock: (block: ReserveBlock) => db.blocks.put(block),
    deleteBlock: async (id: string, permanent = false) => {
        if (permanent) {
            return db.blocks.delete(id);
        } else {
            return db.blocks.update(id, { isDeleted: true, deletedAt: Date.now() });
        }
    },
    restoreBlock: async (id: string) => {
        const block = await db.blocks.get(id);
        if (block) {
            block.isDeleted = false;
            delete block.deletedAt;
            await db.blocks.put(block);
        }
    },

    // Schedule Methods
    getSchedule: async (): Promise<ScheduleData> => {
        const rows = await db.schedule.toArray();
        const data: ScheduleData = {};
        rows.forEach(row => {
            if (!data[row.airport]) data[row.airport] = [];
            const { airport, ...rowData } = row;
            data[row.airport]?.push(rowData as RowData);
        });
        return data;
    },
    saveScheduleRow: (airport: string, row: RowData) => {
        return db.schedule.put({ ...row, airport });
    },
    saveScheduleData: async (data: ScheduleData) => {
        await db.transaction('rw', db.schedule, async () => {
            // This acts as a full replacement or update. 
            // Existing logic in App.tsx replaces the entire object.
            // We probably want to replicate that behavior or be smarter.
            // Implemeting "Dump and Load" for simplicity to match previous behavior if needed, 
            // but ideally we only touch changed rows. 
            // For now, let's bulkPut all rows.
            const rows: ScheduleRow[] = [];
            Object.entries(data).forEach(([airport, airportRows]) => {
                airportRows.forEach(row => {
                    rows.push({ ...row, airport });
                });
            });
            await db.schedule.bulkPut(rows);
        });
    },

    // Lifecycle Methods
    processLifecycle: async () => {
        // Trash Cleanup (90 days)
        const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
        await db.blocks
            .where('isDeleted').equals(true as any)
            .filter(b => !!b.deletedAt && b.deletedAt < ninetyDaysAgo)
            .delete();

        // Archive Auto-Move
        // Last day of reserve + 1 day passed.
        // We need to parse dates. 'end' is ISO string.
        const now = new Date();
        const blocks = await db.blocks.filter(b => !b.isDeleted && !b.isArchived).toArray();
        const toArchive: string[] = [];

        blocks.forEach(b => {
            const endDate = new Date(b.end);
            // "last day of reserve plus 1 day has passed"
            // effectively: now > endDate + 1 day
            const cutoff = new Date(endDate);
            cutoff.setDate(cutoff.getDate() + 1);

            if (now > cutoff) {
                toArchive.push(b.id);
            }
        });

        if (toArchive.length > 0) {
            await db.transaction('rw', db.blocks, async () => {
                for (const id of toArchive) {
                    await db.blocks.update(id, { isArchived: true });
                }
            });
        }
    },

    // Export / Import
    exportData: async () => {
        const blocks = await db.blocks.toArray();
        const scheduleRows = await db.schedule.toArray();
        const schedule: ScheduleData = {};
        scheduleRows.forEach(row => {
            const { airport, ...rowData } = row;
            if (!schedule[airport]) schedule[airport] = [];
            schedule[airport].push(rowData as RowData);
        });

        const exportObj = {
            version: 2,
            timestamp: Date.now(),
            blocks,
            schedule
        };
        return JSON.stringify(exportObj, null, 2);
    },

    getStats: async () => {
        const blocks = await db.blocks.count();
        const rows = await db.schedule.toArray();
        let flights = 0;
        rows.forEach(r => {
            r.options.forEach(o => {
                if (o.type === 'hub-strategy') {
                    if (o.inbound) flights += o.inbound.length;
                    if (o.outbound) flights += o.outbound.length;
                } else {
                    if (o.segments) flights += o.segments.length;
                }
            });
        });
        return { blocks, flights, rows: rows.length };
    },

    validateImport: (jsonStr: string) => {
        try {
            const data = JSON.parse(jsonStr);
            if (!data.blocks || !data.schedule) throw new Error("Invalid format");

            let flightCount = 0;
            let rowCount = 0;
            Object.values(data.schedule as ScheduleData).forEach(rows => {
                rowCount += rows.length;
                rows.forEach(r => {
                    r.options.forEach(o => {
                        if (o.type === 'hub-strategy') {
                            if (o.inbound) flightCount += o.inbound.length;
                            if (o.outbound) flightCount += o.outbound.length;
                        } else {
                            if (o.segments) flightCount += o.segments.length;
                        }
                    });
                });
            });

            return {
                valid: true,
                stats: { blocks: data.blocks.length, flights: flightCount, rows: rowCount },
                data: data
            };
        } catch (e) {
            return { valid: false, error: e };
        }
    },

    importData: async (data: any) => {
        await db.transaction('rw', db.blocks, db.schedule, async () => {
            await db.blocks.clear();
            await db.schedule.clear();

            if (data.blocks) await db.blocks.bulkPut(data.blocks);
            if (data.schedule) {
                const rows: ScheduleRow[] = [];
                Object.entries(data.schedule as ScheduleData).forEach(([airport, airportRows]) => {
                    airportRows.forEach((row: RowData) => {
                        rows.push({ ...row, airport });
                    });
                });
                await db.schedule.bulkPut(rows);
            }
        });
    }
};
