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
  ground?: {
    hub: string;
    duration: string;
    mode: string;
  } | null;
  depAirport?: string;
  arrAirport?: string;
  isPrimary?: boolean;
  isSecondary?: boolean;
}

export interface Option {
  type: 'direct' | 'hub-strategy';
  label?: string;
  hub?: string;
  segments?: FlightSegment[];
  inbound?: FlightSegment[];
  outbound?: FlightSegment[];
  finalArr?: string;
}

export interface RowData {
  key: string;
  date: string;
  callET: string;
  options: Option[];
}

export interface ScheduleData {
  [airport: string]: RowData[];
}

export interface ReserveBlock {
  id: string;
  start: string;
  end: string;
}

export interface Config {
  homeBase: string;
  reserveBase: string;
  homeTz: string;
  reserveTz: string;
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
