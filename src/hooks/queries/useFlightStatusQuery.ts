import { useQuery } from "@tanstack/react-query";
import { FlightService } from "../../services/FlightService";
import { AuthService } from "../../services/AuthService";
import { RowData, FlightSegment } from "../../types";

// Helper to extract flight details including departure time
const extractUniqueFlights = (scheduleData: Record<string, RowData[]> | undefined) => {
    if (!scheduleData) return [];
    const uniqueFlights = new Map<string, { flight: string; dep: string }>();

    const processSegments = (segments: FlightSegment[] | undefined) => {
        if (!segments) return;
        for (const s of segments) {
            // Use a composite key to ensure uniqueness of flight + departure time
            const key = `${s.flight}-${s.dep}`;
            if (!uniqueFlights.has(key)) {
                uniqueFlights.set(key, { flight: s.flight, dep: s.dep });
            }
        }
    };

    for (const rows of Object.values(scheduleData)) {
        for (const row of rows) {
            for (const opt of row.options) {
                processSegments(opt.segments);
                processSegments(Array.isArray(opt.inbound) ? opt.inbound : opt.inbound ? [opt.inbound] : []);
                processSegments(opt.outbound);
            }
        }
    }

    return Array.from(uniqueFlights.values());
};

export function useFlightStatusQuery(scheduleData: Record<string, RowData[]> | undefined) {
    const flightDetails = extractUniqueFlights(scheduleData);

    // Sort for stable query key
    const stableKey = JSON.stringify(
        flightDetails.sort((a, b) => a.flight.localeCompare(b.flight) || a.dep.localeCompare(b.dep))
    );

    return useQuery({
        queryKey: ["flightStatus", stableKey],
        queryFn: async () => {
            if (AuthService.isGuest()) return {};
            if (flightDetails.length === 0) return {};

            const statuses: Record<string, any> = {};
            const toFetch: FlightSegment[] = [];

            for (const { flight, dep } of flightDetails) {
                const cached = await FlightService.getCachedStatus(flight);
                if (cached) {
                    statuses[flight] = cached;
                } else {
                    // Include the departure time so the FlightService constructs the correct date
                    toFetch.push({ flight, dep, arr: "", status: "" } as FlightSegment);
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
        retry: 2,
        refetchInterval: 1000 * 60 * 30, // 30 minutes
    });
}
