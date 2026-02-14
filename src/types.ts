export interface User {
  id: string;
  name: string;
  email?: string;
}

export interface FlightStatus {
  carrierCodeIATA: string;
  aircraftIdentification: {
    flightNumber: string;
  };
  departureAirport?: {
    iata: string;
  };
  arrivalAirport?: {
    iata: string;
  };
  departureTime?: {
    scheduled: string;
    actual?: string;
    estimated?: string;
  };
  arrivalTime?: {
    scheduled: string;
    actual?: string;
    estimated?: string;
  };
  status?: string;
  _retrievedAt?: number;
}

export interface EditContext {
  rowId: string;
  index: number | null;
  option: Option | null;
  dateContext: string;
}

export interface FlightSegment {
  flight: string;
  dep: string;
  arr: string;
  status: string;
  ground?:
    | {
        hub: string;
        duration: string;
        mode: string;
      }
    | null
    | undefined;
  depAirport?: string | undefined;
  arrAirport?: string | undefined;
  isPrimary?: boolean | undefined;
  isSecondary?: boolean | undefined;
}

export interface Option {
  type: "direct" | "hub-strategy";
  hub?: string | undefined;
  segments?: FlightSegment[] | undefined;
  inbound?: FlightSegment[] | undefined;
  outbound?: FlightSegment[] | undefined;
  finalArr?: string | undefined;
}

// export type ConfirmType = "commit" | "discard" | "logout" | "paste" | null;
export type ConfirmType = "commit" | "discard" | "logout" | null;

export interface RowData {
  key: string;
  date: string;
  callET: string;
  options: Option[];
}
export interface SearchLeg {
  carrierCodeIATA: string;
  carrierCodeICAO: string;
  airline: string;
  aircraftIdentification: {
    flightNumber: string;
    airline: {
      iata: string;
      icao: string | null;
    };
  };
  departure: FlightEvent;
  arrival: FlightEvent;
  elapsedTime: string;
  postFlightLayover: string | null;
  aircraft: string;
  isCancelled: boolean;
  operatedByCarrierCode: string;
  operatedByCarrierName: string;
  codeShares: CodeShare[];
  scheduleKey: string;
  lastUpdated: string;
  lastStatus: string;
  cacheExpiration: string;
  statusFresh: boolean;
}

interface FlightEvent {
  airportCode: string;
  originalDate: string;
  scheduledDate: string;
  estimatedDate: string;
  terminal: string;
  gate?: string;
}

interface CodeShare {
  flightNumber: string;
  airline: {
    iata: string;
    icao: string | null;
  };
}

export interface SearchResult {
  legs: SearchLeg[];
}

export interface ScheduleData {
  [airport: string]: RowData[];
}

export interface ReserveBlock {
  id: string;
  start: string;
  end: string;
  homeBase?: string;
  deleted?: number;
  isArchived?: boolean;
  timezone?: string;
}

export interface Config {
  homeBase: string;
  reserveBase: string;
  homeTz: string;
  reserveTz: string;
  // commuteBufferHours?: number;
  // releaseBufferHours?: number;
}

export interface TimelineRowData {
  id: string;
  key: string;
  dateDisplay: string;
  rawDate: string;
  callET: string;
  showPT: string;
  is14HrCallout: boolean;
  options: Option[];
}
