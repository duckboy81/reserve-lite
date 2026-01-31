import Dexie, { Table } from "dexie";
import { FlightStatus, ReserveBlock, RowData } from "../types";

export interface ScheduleRow extends RowData {
  airport: string;
}

export interface FlightCacheItem {
  flightNumber: string;
  timestamp: number;
  data: FlightStatus;
}

export class ReserveDatabase extends Dexie {
  blocks!: Table<ReserveBlock, string>;
  schedule!: Table<ScheduleRow, [string, string]>; // Compound key: [airport, key]
  flightCache!: Table<FlightCacheItem, string>;

  constructor() {
    super("ReserveLiteDB");
    this.version(1).stores({
      blocks: "id, start, end, homeBase, isDeleted, deletedAt, isArchived",
      schedule: "[airport+key], date",
      flightCache: "flightNumber, timestamp",
    });
  }
}

export const db = new ReserveDatabase();
