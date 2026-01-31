import { useState } from "react";
import { ReserveBlock, FlightStatus, FlightSegment, ScheduleData, RowData } from "../types";
import { DataService } from "../services/DataService";
import { FlightService } from "../services/FlightService";
import { AuthService } from "../services/AuthService";

export function useReserveData() {
    const [reserveBlocks, setReserveBlocks] = useState<ReserveBlock[]>([]);
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
    const [flightStatuses, setFlightStatuses] = useState<Record<string, FlightStatus>>({});
    const [loading, setLoading] = useState<boolean>(false);

    const handleBlockAdd = (b: Omit<ReserveBlock, "id">) => {
        const newB: ReserveBlock = { ...b, id: Date.now().toString() };
        const next = [...reserveBlocks, newB];
        setReserveBlocks(next);
        DataService.addBlock(newB);
        if (next.length === 1) setActiveBlockId(newB.id);
    };

    const handleBlockEdit = (id: string, b: Partial<ReserveBlock>) => {
        const next = reserveBlocks.map((blk) => (blk.id === id ? { ...blk, ...b } : blk));
        setReserveBlocks(next);
        const updated = next.find((blk) => blk.id === id);
        if (updated) DataService.updateBlock(updated);
    };

    const handleBlockDelete = (id: string) => {
        const next = reserveBlocks.filter((b) => b.id !== id);
        setReserveBlocks(next);
        DataService.deleteBlock(id);
        if (activeBlockId === id) setActiveBlockId(next[0]?.id || null);
    };

    const refreshFlights = async (activeData: ScheduleData) => {
        if (AuthService.isGuest()) {
            alert("Flight search is disabled in Guest Mode.");
            return;
        }
        setLoading(true);
        try {
            let allFlights: FlightSegment[] = [];

            Object.values(activeData).forEach((airportRows) => {
                airportRows.forEach((row: RowData) => {
                    row.options.forEach((opt) => {
                        if (opt.segments)
                            opt.segments.forEach((s) => {
                                if (s.flight) allFlights.push(s);
                            });
                        if (opt.inbound)
                            (Array.isArray(opt.inbound) ? opt.inbound : [opt.inbound]).forEach((s) => {
                                if (s.flight) allFlights.push(s);
                            });
                        if (opt.outbound)
                            opt.outbound.forEach((s) => {
                                if (s.flight) allFlights.push(s);
                            });
                    });
                });
            });

            const uniqueFlights = [...new Set(allFlights.map((f) => f.flight))]
                .map((fNum) => {
                    return allFlights.find((obj) => obj.flight === fNum);
                })
                .filter((f): f is FlightSegment => !!f);

            const newStatuses = { ...flightStatuses };
            const flightsToFetch: FlightSegment[] = [];

            await Promise.all(
                uniqueFlights.map(async (f) => {
                    const cached = await FlightService.getCachedStatus(f.flight);
                    if (cached) newStatuses[f.flight] = cached;
                    else flightsToFetch.push(f);
                }),
            );

            if (flightsToFetch.length > 0) {
                const chunkSize = 15;
                const today = new Date().toISOString().split("T")[0] || "";
                for (let i = 0; i < flightsToFetch.length; i += chunkSize) {
                    const batch = flightsToFetch.slice(i, i + chunkSize);
                    const apiResults = await FlightService.fetchStatuses(batch, today);
                    if (apiResults) {
                        apiResults.forEach((res) => {
                            if (res.legs && res.legs.length > 0) {
                                const leg = res.legs[0];
                                if (leg) {
                                    const key = `${leg.carrierCodeIATA}${leg.aircraftIdentification.flightNumber}`;
                                    FlightService.setCachedStatus(key, leg);
                                    newStatuses[key] = leg;
                                }
                            }
                        });
                    }
                }
            }

            setFlightStatuses(newStatuses);
        } catch (e) {
            console.error("Error refreshing flights:", e);
        } finally {
            setLoading(false);
        }
    };

    return {
        reserveBlocks,
        setReserveBlocks,
        activeBlockId,
        setActiveBlockId,
        flightStatuses,
        loading,
        setLoading, // exposed for overall loading state
        handleBlockAdd,
        handleBlockEdit,
        handleBlockDelete,
        refreshFlights
    };
}
