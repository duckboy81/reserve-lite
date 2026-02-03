import { useQuery } from "@tanstack/react-query";
import { FlightService } from "../../services/FlightService";
import { AuthService } from "../../services/AuthService";
import { RowData, FlightSegment } from "../../types";

// Helper to extract flight keys
const extractFlightKeys = (scheduleData: Record<string, RowData[]> | undefined) => {
    if (!scheduleData) return [];
    const flightNumbers: string[] = [];

    for (const rows of Object.values(scheduleData)) {
        for (const row of rows) {
            for (const opt of row.options) {
                if (opt.segments) {
                    for (const s of opt.segments) {
                        flightNumbers.push(s.flight);
                    }
                }
                if (opt.inbound) {
                    const inbound = Array.isArray(opt.inbound) ? opt.inbound : [opt.inbound];
                    for (const s of inbound) {
                        flightNumbers.push(s.flight);
                    }
                }
                if (opt.outbound) {
                    for (const s of opt.outbound) {
                        flightNumbers.push(s.flight);
                    }
                }
            }
        }
    }

    return [...new Set(flightNumbers)];
};

export function useFlightStatusQuery(scheduleData: Record<string, RowData[]> | undefined) {

    return useQuery({
        queryKey: ["flightStatus", extractFlightKeys(scheduleData).sort().join(",")],
        queryFn: async () => {
            if (AuthService.isGuest()) return {};

            const flightKeys = extractFlightKeys(scheduleData);
            if (flightKeys.length === 0) return {};

            const statuses: Record<string, any> = {};
            const toFetch: FlightSegment[] = [];

            for (const fNum of flightKeys) {
                const cached = await FlightService.getCachedStatus(fNum);
                if (cached) {
                    statuses[fNum] = cached;
                } else {
                    toFetch.push({ flight: fNum, dep: "", arr: "", status: "" } as FlightSegment);
                }
            }

            if (toFetch.length === 0) return statuses;

            const today = new Date().toISOString().split("T")[0] || "";
            const chunkSize = 15;

            for (let i = 0; i < toFetch.length; i += chunkSize) {
                const batch = toFetch.slice(i, i + chunkSize);
                const results = await FlightService.fetchStatuses(batch, today);

                if (!results) continue;

                for (const res of results) {
                    if (!res.legs || res.legs.length === 0) continue;

                    const leg = res.legs[0];
                    if (!leg) continue;

                    const key = `${leg.carrierCodeIATA}${leg.aircraftIdentification.flightNumber}`;
                    FlightService.setCachedStatus(key, leg);
                    statuses[key] = leg;
                }
            }

            return statuses;
        },
        enabled: !AuthService.isGuest() && !!scheduleData,
        staleTime: 1000 * 60 * 10, // 10 mins
    });
}
