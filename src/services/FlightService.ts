import { API_CONFIG, DEFAULT_CONFIG, DEFAULT_SEARCH_PARAMS } from '../config/constants';
import { AuthService } from './AuthService';
import { FlightSegment, FlightStatus, SearchResult } from '../types';

interface CachedItem {
  timestamp: number;
  data: FlightStatus;
}

export const FlightService = {
  getCachedStatus: (flightKey: string): FlightStatus | null => {
    const cache = JSON.parse(localStorage.getItem('flight_status_cache') || '{}');
    const cachedItem = cache[flightKey] as CachedItem | undefined;
    if (cachedItem && Date.now() - cachedItem.timestamp < API_CONFIG.CACHE_DURATION_MS) return cachedItem.data;
    return null;
  },
  setCachedStatus: (flightKey: string, data: FlightStatus) => {
    const cache = JSON.parse(localStorage.getItem('flight_status_cache') || '{}');
    cache[flightKey] = { timestamp: Date.now(), data: data };
    localStorage.setItem('flight_status_cache', JSON.stringify(cache));
  },
  buildInfoPayload: (flightObj: FlightSegment, dateStr: string) => {
    const match = flightObj.flight.match(/([A-Z0-9]{2})(\d+)/);
    if (!match) return null;
    return {
      legs: [{
        departureAirportCode: DEFAULT_CONFIG.homeBase,
        departureDate: `${dateStr} ${flightObj.dep}:00`,
        carrierCode: match[1],
        flightNumber: match[2]
      }]
    };
  },
  fetchStatuses: async (flightsToFetch: FlightSegment[], dateStr: string): Promise<{ legs: FlightStatus[] }[] | null> => {
    const token = AuthService.getToken();
    if (!token) return null;
    const validPayloads = flightsToFetch.map(f => FlightService.buildInfoPayload(f, dateStr || '2026-01-29')).filter(p => p !== null);
    if (validPayloads.length === 0) return null;
    try {
      const response = await fetch(API_CONFIG.FLIGHT_INFO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(validPayloads)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (e) { return null; }
  },
  searchFlights: async (from: string, to: string, date: string): Promise<{ flights: SearchResult[] }> => {
    const token = AuthService.getToken();
    if (!token) throw new Error("Not authenticated");
    const payload = {
      departureLocation: { code: from, latitude: 0, longitude: 0, isCity: false },
      arrivalLocation: { code: to, latitude: 0, longitude: 0, isCity: false },
      departBy: `${date} 00:00:00`,
      ...DEFAULT_SEARCH_PARAMS
    };
    const response = await fetch(API_CONFIG.SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    return await response.json();
  }
};
