import { API_CONFIG, DEFAULT_CONFIG } from '../config/constants';
import { AuthService } from './AuthService';

export const FlightService = {
  getCachedStatus: (flightKey) => {
    const cache = JSON.parse(localStorage.getItem('flight_status_cache') || '{}');
    const cachedItem = cache[flightKey];
    if (cachedItem && Date.now() - cachedItem.timestamp < API_CONFIG.CACHE_DURATION_MS) return cachedItem.data;
    return null;
  },
  setCachedStatus: (flightKey, data) => {
    const cache = JSON.parse(localStorage.getItem('flight_status_cache') || '{}');
    cache[flightKey] = { timestamp: Date.now(), data: data };
    localStorage.setItem('flight_status_cache', JSON.stringify(cache));
  },
  buildInfoPayload: (flightObj, dateStr) => {
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
  fetchStatuses: async (flightsToFetch, dateStr) => {
    const token = AuthService.getToken();
    if (!token) return null;
    const validPayloads = flightsToFetch.map(f => FlightService.buildInfoPayload(f, dateStr || '2026-01-29')).filter(p => p !== null);
    if(validPayloads.length === 0) return null;
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
  searchFlights: async (from, to, date) => {
    const token = AuthService.getToken();
    if (!token) throw new Error("Not authenticated");
    const payload = {
      departureLocation: { code: from, latitude: 0, longitude: 0, isCity: false },
      arrivalLocation: { code: to, latitude: 0, longitude: 0, isCity: false },
      isNonStopSearch: true, isOneStopSearch: false, isTwoStopSearch: false,
      departBy: `${date} 00:00:00`, arriveBy: "1970-01-01 23:59:59",
      avoidConnectionAirportCodes: [], requireConnectionAirportCodes: [],
      minConnectionTime: 30, maxTotalTravelTime: 2880, isCargoIncluded: true, isRegionalIncluded: true,
      page: 1, pageSize: 30, sortBy: 0, isSortDesc: false, lighteningMode: true, requiredAircrafts: [], requiredAirlines: [], IsPinned: false
    };
    const response = await fetch(API_CONFIG.SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    return await response.json();
  }
};
