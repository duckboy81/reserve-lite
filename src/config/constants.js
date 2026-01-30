export const API_CONFIG = {
  AUTH_URL: 'https://authsvc2.alpa.org/api/token/auth',
  FLIGHT_INFO_URL: 'https://gateway.alpa.org/api/FlightSearchV2/FindFlightsInfo',
  SEARCH_URL: 'https://gateway.alpa.org/api/FlightSearchV2/SearchFlights',
  CACHE_DURATION_MS: 1000 * 60 * 30, // 30 minutes
};

export const DEFAULT_CONFIG = {
  homeBase: 'ATL',
  homeTz: 'America/New_York',
  reserveBase: 'LAX',
  reserveTz: 'America/Los_Angeles',
  commuteBufferHours: 0,
  releaseBufferHours: 0
};

export const TIMEZONES = [
  { label: 'Eastern Time', value: 'America/New_York' },
  { label: 'Central Time', value: 'America/Chicago' },
  { label: 'Mountain Time', value: 'America/Denver' },
  { label: 'Pacific Time', value: 'America/Los_Angeles' },
  { label: 'Hawaii Time', value: 'Pacific/Honolulu' },
  { label: 'UTC', value: 'UTC' }
];

export const COMMON_HUBS = ['DTW', 'MSP', 'SLC', 'SEA', 'ATL', 'LAX', 'JFK', 'LGA', 'BOS', 'CVG'];

export const SEED_CSV_DATA = {
  LAX: `Date,Call ET,Show PT,1st Option,2nd Option,3rd Option,
2026-01-29,19:00:00,10:00:00,2030/2240 DL319,2141/2351 DL331,0725/0939 DL996,
2026-01-29,20:00:00,11:00:00,2141/2351 DL331,0725/0939 DL996,0855/1100 DL898,
2026-01-29,21:00:00,12:00:00,0725/0939 DL996,0855/1100 DL898,,`,
  ONT: `Date,Call ET,Show PT,1st Option,2nd Option,3rd Option,,
2026-01-29,19:00:00,10:00:00,2030/2240 DL319 - LAX+2Huber,2141/2351 DL331 - LAX+2Huber,
2026-01-29,20:00:00,11:00:00,2141/2351 DL331 - LAX+2Huber,2257/0027 DL818 - DFW - 0645/0821 DL439 LAX+2Huber,`
};
