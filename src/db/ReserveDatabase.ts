import Dexie, { Table } from "dexie";
import { FlightStatus, ReserveBlock, RowData, SearchResult } from "../types";

export interface ScheduleRow extends RowData {
  airport: string;
}

export interface FlightCacheItem {
  flightNumber: string;
  timestamp: number;
  data: FlightStatus;
}

export interface CachedSearchResults {
  from: string;
  to: string;
  date: string;
  timestamp: number;
  flights: SearchResult[];
}

export class ReserveDatabase extends Dexie {
  blocks!: Table<ReserveBlock, string>;
  schedule!: Table<ScheduleRow, [string, string]>; // Compound key: [airport, key]
  flightCache!: Table<FlightCacheItem, string>;
  searchResults!: Table<CachedSearchResults, [string, string, string]>; // Compound: [from, to, date]

  constructor() {
    super("ReserveLiteDB");
    this.version(1).stores({
      blocks: "id, start, end, homeBase, deleted, isArchived",
      schedule: "[airport+key], date",
      flightCache: "flightNumber, timestamp",
    });
    this.version(2).stores({
      searchResults: "[from+to+date], timestamp",
    });
  }
}

export const db = new ReserveDatabase();
