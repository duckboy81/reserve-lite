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

export interface RowData {
  key: string;
  date: string;
  callET: string;
  options: Option[];
}

export interface SearchLeg {
  carrierCodeIATA: string;
  aircraftIdentification: {
    flightNumber: string;
  };
  departureAirportCode: string;
  arrivalAirportCode: string;
  departure: {
    scheduledDate: string;
    gate?: string;
  };
  arrival: {
    scheduledDate: string;
    gate?: string;
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
  isDeleted?: boolean;
  deletedAt?: number;
  isArchived?: boolean;
}

export interface Config {
  homeBase: string;
  reserveBase: string;
  homeTz: string;
  reserveTz: string;
  commuteBufferHours?: number;
  releaseBufferHours?: number;
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
