import { API_CONFIG, DEFAULT_CONFIG, DEFAULT_SEARCH_PARAMS } from "../config/constants";
import { AuthService } from "./AuthService";
import { FlightSegment, FlightStatus, SearchResult } from "../types";
import { db } from "../db/ReserveDatabase";

export const FlightService = {
  getCachedStatus: async (flightKey: string): Promise<FlightStatus | null> => {
    try {
      const cachedItem = await db.flightCache.get(flightKey);
      if (cachedItem && Date.now() - cachedItem.timestamp < API_CONFIG.CACHE_DURATION_MS) {
        return { ...cachedItem.data, _retrievedAt: cachedItem.timestamp };
      }
      return null;
    } catch (e) {
      console.error("Cache read error", e);
      return null;
    }
  },
  setCachedStatus: async (flightKey: string, data: FlightStatus) => {
    try {
      await db.flightCache.put({
        flightNumber: flightKey,
        timestamp: Date.now(),
        data: data,
      });
    } catch (e) {
      console.error("Cache write error", e);
    }
  },
  buildInfoPayload: (flightObj: FlightSegment, dateStr: string) => {
    // Basic regex for parsing carrier and flight number, e.g. "DL123"
    // Assuming simple format for now.
    const match = flightObj.flight.match(/([A-Z0-9]{2})(\d+)/);
    if (!match) return null;
    return {
      legs: [
        {
          departureAirportCode: DEFAULT_CONFIG.homeBase,
          departureDate: `${dateStr} ${flightObj.dep}:00`,
          carrierCode: match[1],
          flightNumber: match[2],
        },
      ],
    };
  },
  fetchStatuses: async (
    flightsToFetch: FlightSegment[],
    dateStr: string,
  ): Promise<{ legs: FlightStatus[] }[] | null> => {
    const token = AuthService.getToken();
    if (!token) return null;
    const validPayloads = flightsToFetch
      .map((f) => FlightService.buildInfoPayload(f, dateStr || "2026-01-29"))
      .filter((p) => p !== null);
    if (validPayloads.length === 0) return null;
    try {
      const response = await fetch(API_CONFIG.FLIGHT_INFO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(validPayloads),
      });
      if (!response.ok) return null;
      const data = await response.json();
      // Inject timestamp
      const now = Date.now();
      if (Array.isArray(data)) {
        return data.map((group: any) => ({
          ...group,
          legs: group.legs.map((leg: FlightStatus) => ({ ...leg, _retrievedAt: now })),
        }));
      }
      return data;
    } catch (e) {
      return null;
    }
  },
  getCachedSearchResults: async (from: string, to: string, date: string): Promise<{ flights: SearchResult[], retrievedAt: number } | null> => {
    try {
      const cachedItem = await db.searchResults.get([from, to, date]);
      if (cachedItem && Date.now() - cachedItem.timestamp < API_CONFIG.CACHE_DURATION_MS) {
        return { flights: cachedItem.flights, retrievedAt: cachedItem.timestamp };
      }
      return null;
    } catch (e) {
      console.error("Search cache read error", e);
      return null;
    }
  },
  setCachedSearchResults: async (from: string, to: string, date: string, flights: SearchResult[]) => {
    try {
      await db.searchResults.put({
        from,
        to,
        date,
        timestamp: Date.now(),
        flights
      });
    } catch (e) {
      console.error("Search cache write error", e);
    }
  },
  searchFlights: async (from: string, to: string, date: string, forceRefresh = false): Promise<{ flights: SearchResult[], retrievedAt: number }> => {
    // 1. Check Cache if not forcing refresh
    if (!forceRefresh) {
      const cached = await FlightService.getCachedSearchResults(from, to, date);
      if (cached) {
        console.log("Returning cached search results");
        return cached;
      }
    }

    const token = AuthService.getToken();
    const now = Date.now();

    // Mock Data Fallback REMOVED.
    if (!token || AuthService.isGuest()) {
      console.log("Search disabled in guest mode or no token available.");
      return { flights: [], retrievedAt: now };
    }

    const payload = {
      departureLocation: { code: from, latitude: 0, longitude: 0, isCity: false },
      arrivalLocation: { code: to, latitude: 0, longitude: 0, isCity: false },
      departBy: `${date} 00:00:00`,
      ...DEFAULT_SEARCH_PARAMS,
    };

    try {
      const response = await fetch(API_CONFIG.SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      // Cache the successful result
      if (data.flights) {
        await FlightService.setCachedSearchResults(from, to, date, data.flights);
      }

      return { flights: data.flights || [], retrievedAt: now };
    } catch (e) {
      console.error("Search fetch error", e);
      throw e;
    }
  },

  cleanupExpiredCache: async () => {
    try {
      const expirationThreshold = Date.now() - API_CONFIG.CACHE_DURATION_MS;
      const deleteCount = await db.searchResults.where("timestamp").below(expirationThreshold).delete();
      if (deleteCount > 0) {
        console.log(`Cleaned up ${deleteCount} expired flight search records.`);
      }
    } catch (e) {
      console.error("Error cleaning up expired cache", e);
    }
  },
};
