import { db, FlightCacheItem, ScheduleRow } from "../db/ReserveDatabase";
import { ReserveBlock, ScheduleData, RowData } from "../types";
import { compareBlocks } from "../utils/dateUtil";

const TRASH_RETENTION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const ARCHIVE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

// Helpers
const flattenSchedule = (data: ScheduleData): ScheduleRow[] => {
  const rows: ScheduleRow[] = [];
  Object.entries(data).forEach(([airport, airportRows]) => {
    airportRows.forEach((row) => {
      rows.push({ ...row, airport });
    });
  });
  return rows;
};

const inflateSchedule = (rows: ScheduleRow[]): ScheduleData => {
  const data: ScheduleData = {};
  rows.forEach((row) => {
    const { airport, ...rowData } = row;
    if (!data[airport]) data[airport] = [];
    data[airport]?.push(rowData as RowData);
  });
  return data;
};

export const DataService = {
  initialize: async (): Promise<void> => {
    const legacyBlocks = localStorage.getItem("reserve_lite_blocks");
    const legacySchedule = localStorage.getItem("reserve_lite_data_v2");
    const legacyCache = localStorage.getItem("flight_status_cache");

    if (legacyBlocks || legacySchedule || legacyCache) {
      console.log("Migrating legacy data to IndexedDB...");
      await db.transaction("rw", db.blocks, db.schedule, db.flightCache, async () => {
        // Migrate Blocks
        if (legacyBlocks) {
          try {
            const blocks: ReserveBlock[] = JSON.parse(legacyBlocks);
            await db.blocks.bulkPut(blocks);
          } catch (e) {
            console.error("Failed to migrate blocks", e);
          }
        }

        // Migrate Schedule
        if (legacySchedule) {
          try {
            const schedule: ScheduleData = JSON.parse(legacySchedule);
            const rows = flattenSchedule(schedule);
            await db.schedule.bulkPut(rows);
          } catch (e) {
            console.error("Failed to migrate schedule", e);
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
                  data: val.data,
                });
              }
            });
            await db.flightCache.bulkPut(items);
          } catch (e) {
            console.error("Failed to migrate cache", e);
          }
        }
      });

      // Clear legacy data
      localStorage.removeItem("reserve_lite_blocks");
      localStorage.removeItem("reserve_lite_data_v2");
      localStorage.removeItem("flight_status_cache");
      console.log("Migration complete.");
    }
  },

  // Block Methods
  getBlocks: (): Promise<ReserveBlock[]> =>
    db.blocks.toArray().then(blocks =>
      blocks.sort(compareBlocks)
    ),
  addBlock: (block: ReserveBlock) => db.blocks.put(block),
  updateBlock: (block: ReserveBlock) => db.blocks.put(block),
  deleteBlock: async (id: string, permanent = false): Promise<void> => {
    if (permanent) {
      await db.blocks.delete(id);
    } else {
      await db.blocks.update(id, { isDeleted: true, deletedAt: Date.now() });
    }
  },
  restoreBlock: async (id: string): Promise<void> => {
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
    return inflateSchedule(rows);
  },

  saveScheduleRow: (airport: string, row: RowData) => {
    return db.schedule.put({ ...row, airport });
  },

  saveScheduleData: async (data: ScheduleData): Promise<void> => {
    await db.transaction("rw", db.schedule, async () => {
      // Full replacement strategy: clear existing schedule and insert new data
      await db.schedule.clear();
      const rows = flattenSchedule(data);
      await db.schedule.bulkPut(rows);
    });
  },

  // Lifecycle Methods
  processLifecycle: async (): Promise<void> => {
    const now = Date.now();

    // 1. Move expired active blocks to Archive
    const activeBlocks = await db.blocks.filter((b) => !b.isDeleted && !b.isArchived).toArray();
    const toArchive: string[] = [];

    activeBlocks.forEach((b) => {
      const endDate = new Date(b.end);
      // Archive if now > endDate + 1 day
      const archiveCutoff = new Date(endDate);
      archiveCutoff.setDate(archiveCutoff.getDate() + 1);

      if (now > archiveCutoff.getTime()) {
        toArchive.push(b.id);
      }
    });

    if (toArchive.length > 0) {
      await db.blocks.where("id").anyOf(toArchive).modify({ isArchived: true });
    }

    // 2. Trash Cleanup (Safe Retention: Last 10)
    const trashBlocks = await db.blocks.filter((b) => !!b.isDeleted).toArray();
    // Sort by deletedAt desc (newest deleted first)
    trashBlocks.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));

    // Keep top 10, check the rest for expiration
    const trashToDelete: string[] = [];
    const trashCutoffDate = now - TRASH_RETENTION_MS;

    trashBlocks.forEach((b, index) => {
      if (index < 10) return; // Always keep the last 10 deleted blocks
      if (b.deletedAt && b.deletedAt < trashCutoffDate) {
        trashToDelete.push(b.id);
      }
    });

    if (trashToDelete.length > 0) {
      await db.blocks.bulkDelete(trashToDelete);
    }

    // 3. Archive Cleanup (Safe Retention: Last 10)
    const archiveBlocks = await db.blocks.filter((b) => !!b.isArchived && !b.isDeleted).toArray();
    // Sort by end date desc (newest archive first)
    archiveBlocks.sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime());

    // Keep top 10, check the rest for expiration
    const archiveToDelete: string[] = [];
    const archiveCutoffDate = now - ARCHIVE_RETENTION_MS;

    archiveBlocks.forEach((b, index) => {
      if (index < 10) return; // Always keep the last 10 archived blocks
      if (new Date(b.end).getTime() < archiveCutoffDate) {
        archiveToDelete.push(b.id);
      }
    });

    if (archiveToDelete.length > 0) {
      await db.blocks.bulkDelete(archiveToDelete);
    }
  },

  // Export / Import
  exportData: async (): Promise<string> => {
    const blocks = await db.blocks.toArray();
    const schedule = await DataService.getSchedule();

    const exportObj = {
      version: 2,
      timestamp: Date.now(),
      blocks,
      schedule,
    };
    return JSON.stringify(exportObj, null, 2);
  },

  getStats: async () => {
    const blocks = await db.blocks.count();
    const rows = await db.schedule.toArray();
    let flights = 0;
    rows.forEach((r) => {
      r.options.forEach((o) => {
        if (o.type === "hub-strategy") {
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
      Object.values(data.schedule as ScheduleData).forEach((rows) => {
        rowCount += rows.length;
        rows.forEach((r) => {
          r.options.forEach((o) => {
            if (o.type === "hub-strategy") {
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
        data: data,
      };
    } catch (e) {
      return { valid: false, error: e };
    }
  },

  importData: async (data: any): Promise<void> => {
    await db.transaction("rw", db.blocks, db.schedule, async () => {
      await db.blocks.clear();
      await db.schedule.clear();

      if (data.blocks) await db.blocks.bulkPut(data.blocks);
      if (data.schedule) {
        const rows = flattenSchedule(data.schedule);
        await db.schedule.bulkPut(rows);
      }
    });
  },
};

