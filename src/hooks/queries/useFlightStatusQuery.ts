import { useQuery } from "@tanstack/react-query";
import { FlightService } from "../../services/FlightService";
import { AuthService } from "../../services/AuthService";
import { RowData, FlightSegment } from "../../types";

// Helper to extract flight keys
const extractFlightKeys = (scheduleData: Record<string, RowData[]> | undefined) => {
    if (!scheduleData) return [];
    const flightNumbers: string[] = [];

    Object.values(scheduleData).forEach((rows) => {
        rows.forEach((row) => {
            row.options.forEach((opt) => {
                if (opt.segments) {
                    opt.segments.forEach(s => flightNumbers.push(s.flight));
                }
                if (opt.inbound) {
                    (Array.isArray(opt.inbound) ? opt.inbound : [opt.inbound]).forEach(s => flightNumbers.push(s.flight));
                }
                if (opt.outbound) {
                    opt.outbound.forEach(s => flightNumbers.push(s.flight));
                }
            })
        })
    });

    return [...new Set(flightNumbers)];
};

export function useFlightStatusQuery(scheduleData: Record<string, RowData[]> | undefined) {

    return useQuery({
        queryKey: ["flightStatus", extractFlightKeys(scheduleData).sort().join(",")],
        queryFn: async () => {
            if (AuthService.isGuest()) return {};

            const flightKeys = extractFlightKeys(scheduleData);
            if (flightKeys.length === 0) return {};

            // We can reuse the batch logic or just rely on the service if it handles it. 
            // For now, let's implement a simple fetcher that mimics the old hook but cleaner.
            // Actually, React Query de-dupes requests, but we want to batch them.
            // The original hook had complex logic to check cache first.

            // Simpler approach for now:
            // We will just return the map of statuses. 
            // Since the FlightService seems to have internal logic, let's try to leverage it or reimplement the loop.
            // Given complexity, let's stick to the logic: check cache, fetch missing.

            const statuses: Record<string, any> = {};
            // Using logic from legacy: only fetch if not cached
            const toFetch: FlightSegment[] = [];

            for (const fNum of flightKeys) {
                const cached = await FlightService.getCachedStatus(fNum);
                if (cached) {
                    statuses[fNum] = cached;
                } else {
                    // Cast to FlightSegment to satisfy array type. 
                    // FlightService.fetchStatuses only needs 'flight' property effectively, 
                    // but the type contract might be strict.
                    toFetch.push({ flight: fNum, dep: "", arr: "", status: "" } as FlightSegment);
                }
            }

            if (toFetch.length > 0) {
                const today = new Date().toISOString().split("T")[0] || "";
                // Chunking logic from original hook
                const chunkSize = 15;
                for (let i = 0; i < toFetch.length; i += chunkSize) {
                    const batch = toFetch.slice(i, i + chunkSize);
                    // Need to cast or fix types if FlightService expects specific shape
                    const results = await FlightService.fetchStatuses(batch, today);
                    if (results) {
                        results.forEach(res => {
                            if (res.legs && res.legs.length > 0) {
                                const leg = res.legs[0];
                                if (leg) {
                                    const key = `${leg.carrierCodeIATA}${leg.aircraftIdentification.flightNumber}`;
                                    FlightService.setCachedStatus(key, leg);
                                    statuses[key] = leg;
                                }
                            }
                        })
                    }
                }
            }

            return statuses;
        },
        enabled: !AuthService.isGuest() && !!scheduleData,
        staleTime: 1000 * 60 * 10, // 10 mins
    });
}
