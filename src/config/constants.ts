export const API_CONFIG = {
  AUTH_URL: "https://authsvc2.alpa.org/api/token/auth",
  FLIGHT_INFO_URL: "https://gateway.alpa.org/api/FlightSearchV2/FindFlightsInfo",
  SEARCH_URL: "https://gateway.alpa.org/api/FlightSearchV2/SearchFlights",
  CACHE_DURATION_MS: 1000 * 60 * 30, // 30 minutes
};

export const DEFAULT_SEARCH_PARAMS = {
  isNonStopSearch: true,
  isOneStopSearch: false,
  isTwoStopSearch: false,
  arriveBy: "1970-01-01 23:59:59",
  avoidConnectionAirportCodes: [] as string[],
  requireConnectionAirportCodes: [] as string[],
  minConnectionTime: 30,
  maxTotalTravelTime: 2880,
  isCargoIncluded: true,
  isRegionalIncluded: true,
  page: 1,
  pageSize: 30,
  sortBy: 0,
  isSortDesc: false,
  lighteningMode: true,
  requiredAircrafts: [] as string[],
  requiredAirlines: [] as string[],
  IsPinned: false,
};

export const DEFAULT_CONFIG = {
  homeBase: "ATL",
  homeTz: "America/New_York",
  reserveBase: "LAX",
  reserveTz: "America/Los_Angeles",
  commuteBufferHours: 0,
  releaseBufferHours: 0,
};

export const TIMEZONES = [
  { label: "Eastern Time", value: "America/New_York" },
  { label: "Central Time", value: "America/Chicago" },
  { label: "Mountain Time", value: "America/Denver" },
  { label: "Pacific Time", value: "America/Los_Angeles" },
  { label: "Hawaii Time", value: "Pacific/Honolulu" },
  { label: "UTC", value: "UTC" },
];


