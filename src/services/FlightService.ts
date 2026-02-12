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
  searchFlights: async (from: string, to: string, date: string): Promise<{ flights: SearchResult[] }> => {
    const token = AuthService.getToken();

    // Mock Data Fallback for Dev/Guest
    if (!token || AuthService.isGuest()) {
      console.log("Returning mock flight results for", from, to, date);
      return {
        flights: [
          {
            legs: [{
              carrierCodeIATA: "DL",
              aircraftIdentification: { flightNumber: "123" },
              departureAirportCode: from,
              arrivalAirportCode: to,
              departure: { scheduledDate: `${date}T08:00:00`, gate: "A12" },
              arrival: { scheduledDate: `${date}T10:30:00`, gate: "C4" }
            }]
          },
          {
            legs: [{
              carrierCodeIATA: "UA",
              aircraftIdentification: { flightNumber: "456" },
              departureAirportCode: from,
              arrivalAirportCode: to,
              departure: { scheduledDate: `${date}T14:00:00`, gate: "B7" },
              arrival: { scheduledDate: `${date}T16:45:00`, gate: "D2" }
            }]
          },
          {
            legs: [{
              carrierCodeIATA: "AA",
              aircraftIdentification: { flightNumber: "789" },
              departureAirportCode: from,
              arrivalAirportCode: to,
              departure: { scheduledDate: `${date}T18:30:00`, gate: "C10" },
              arrival: { scheduledDate: `${date}T21:15:00`, gate: "A5" }
            }]
          }
        ]
      };
    }

    const payload = {
      departureLocation: { code: from, latitude: 0, longitude: 0, isCity: false },
      arrivalLocation: { code: to, latitude: 0, longitude: 0, isCity: false },
      departBy: `${date} 00:00:00`,
      ...DEFAULT_SEARCH_PARAMS,
    };
    const response = await fetch(API_CONFIG.SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },
};
