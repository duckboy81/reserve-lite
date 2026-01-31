// noinspection JSUnusedGlobalSymbols

import { Config, TimelineRowData } from "../types";

export const formatDate = (date: Date): string => date.toISOString().split("T")[0] || "";

export const addHours = (date: Date, h: number): Date => new Date(date.getTime() + h * 60 * 60 * 1000);

export const moveItem = <T>(arr: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= arr.length) return arr;
  const newArr = [...arr];
  const moved = newArr.splice(from, 1)[0];
  if (moved !== undefined) {
    newArr.splice(to, 0, moved);
  }
  return newArr;
};

export const generateTimeline = (startStr: string, endStr: string, config: Config): TimelineRowData[] => {
  const rows: TimelineRowData[] = [];
  const getTimeInTz = (date: Date, tz: string) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const getPart = (type: Intl.DateTimeFormatPartTypes) => {
      const p = parts.find((p) => p.type === type);
      return p ? parseInt(p.value) : 0;
    };
    return {
      year: getPart("year"),
      month: getPart("month"),
      day: getPart("day"),
      hour: getPart("hour"),
      minute: getPart("minute"),
    };
  };

  let iterator = new Date(`${startStr}T00:00:00`);

  iterator = new Date(iterator.getTime() - 12 * 60 * 60 * 1000);
  let limit = 0;
  const SAFETY_BREAK = 2000;
  let keepGoing = true;

  while (keepGoing && limit < SAFETY_BREAK) {
    limit++;
    const reportTz = getTimeInTz(iterator, config.reserveTz);
    const reportDateStr = `${reportTz.year}-${String(reportTz.month).padStart(2, "0")}-${String(reportTz.day).padStart(2, "0")}`;

    if (reportDateStr < startStr) {
      iterator = new Date(iterator.getTime() + 60 * 60 * 1000);
      continue;
    }
    if (reportDateStr === startStr && reportTz.hour < 10) {
      iterator = new Date(iterator.getTime() + 60 * 60 * 1000);
      continue;
    }

    const callTime = new Date(iterator.getTime() - 18 * 60 * 60 * 1000);
    const callTz = getTimeInTz(callTime, config.reserveTz);
    const callDateStr = `${callTz.year}-${String(callTz.month).padStart(2, "0")}-${String(callTz.day).padStart(2, "0")}`;

    if (callDateStr > endStr) {
      keepGoing = false;
      break;
    }
    if (callDateStr === endStr && (callTz.hour > 6 || (callTz.hour === 6 && callTz.minute > 0))) {
      keepGoing = false;
      break;
    }

    const callHomeTz = getTimeInTz(callTime, config.homeTz);
    const callDateDisplay = new Intl.DateTimeFormat("en-US", {
      timeZone: config.homeTz,
      month: "short",
      day: "numeric",
    }).format(callTime);
    const callDateHomeStr = `${callHomeTz.year}-${String(callHomeTz.month).padStart(2, "0")}-${String(callHomeTz.day).padStart(2, "0")}`;
    const callTimeHomeStr = `${String(callHomeTz.hour).padStart(2, "0")}:${String(callHomeTz.minute).padStart(2, "0")}`;

    const key = `${callDateHomeStr}T${callTimeHomeStr}`;
    const showPT = `${String(reportTz.hour).padStart(2, "0")}:${String(reportTz.minute).padStart(2, "0")}`;
    const is14HrCallout = callTz.hour >= 12 && callTz.hour < 14;

    rows.push({
      id: key,
      key,
      dateDisplay: callDateDisplay,
      rawDate: callDateHomeStr,
      callET: callTimeHomeStr,
      showPT: showPT,
      is14HrCallout,
      options: [],
    });

    if (callTz.hour === 13 && callTz.minute === 0) {
      const specialCall = new Date(callTime.getTime() + 59 * 60 * 1000);
      const specialReport = new Date(iterator.getTime() + 59 * 60 * 1000);
      const sPtTz = getTimeInTz(specialReport, config.reserveTz);
      const sEtTz = getTimeInTz(specialCall, config.homeTz);
      const sEtStr = `${String(sEtTz.hour).padStart(2, "0")}:${String(sEtTz.minute).padStart(2, "0")}`;
      const sPtStr = `${String(sPtTz.hour).padStart(2, "0")}:${String(sPtTz.minute).padStart(2, "0")}`;
      const sDateStr = `${sEtTz.year}-${String(sEtTz.month).padStart(2, "0")}-${String(sEtTz.day).padStart(2, "0")}`;
      rows.push({
        id: key + "-59",
        key: `${sDateStr}T${sEtStr}`,
        dateDisplay: "",
        rawDate: sDateStr,
        callET: sEtStr,
        showPT: sPtStr,
        is14HrCallout: true,
        options: [],
      });
    }
    iterator = new Date(iterator.getTime() + 60 * 60 * 1000);
  }
  return rows;
};
