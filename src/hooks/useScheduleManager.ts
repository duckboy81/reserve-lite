import { useState } from "react";
import { ScheduleData, Option, RowData } from "../types";
import { DataService } from "../services/DataService";

export function useScheduleManager() {
  const [scheduleData, setScheduleData] = useState<ScheduleData>({});
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [stagingData, setStagingData] = useState<ScheduleData | null>(null);
  const [history, setHistory] = useState<ScheduleData[]>([]);
  const [future, setFuture] = useState<ScheduleData[]>([]);

  const enterEditMode = () => {
    setStagingData(JSON.parse(JSON.stringify(scheduleData)));
    setHistory([]);
    setFuture([]);
    setIsEditMode(true);
  };

  const executeCommit = () => {
    if (stagingData) {
      setScheduleData(stagingData);
      DataService.saveScheduleData(stagingData);
    }
    setStagingData(null);
    setHistory([]);
    setFuture([]);
    setIsEditMode(false);
  };

  const executeDiscard = () => {
    setStagingData(null);
    setHistory([]);
    setFuture([]);
    setIsEditMode(false);
  };

  const updateStaging = (newData: ScheduleData) => {
    if (stagingData) setHistory([...history, stagingData]);
    setFuture([]);
    setStagingData(newData);
  };

  const handleUndo = () => {
    if (history.length === 0 || !stagingData) return;
    const prev = history[history.length - 1];
    if (prev) {
      setFuture([stagingData, ...future]);
      setHistory(history.slice(0, -1));
      setStagingData(prev);
    }
  };

  const handleRedo = () => {
    if (future.length === 0 || !stagingData) return;
    const next = future[0];
    if (next) {
      setHistory([...history, stagingData]);
      setFuture(future.slice(1));
      setStagingData(next);
    }
  };

  const modifyOptions = (airport: string, rowId: string, action: (options: Option[]) => void) => {
    let currentData = stagingData || JSON.parse(JSON.stringify(scheduleData));
    if (!isEditMode) {
      setIsEditMode(true);
      currentData = JSON.parse(JSON.stringify(scheduleData));
    }

    const newData = JSON.parse(JSON.stringify(currentData));
    if (!newData[airport]) newData[airport] = [];

    let row = newData[airport].find((r: RowData) => r.key === rowId);

    // If row doesn't exist, create it (enables pasting into empty hours)
    if (!row) {
      const date = rowId.split("T")[0] || "";
      const callET = rowId.split("T")[1] || "";
      row = { key: rowId, date, callET, options: [] };
      newData[airport].push(row);
    }

    action(row.options);
    updateStaging(newData);
  };

  const saveOptionToStaging = (
    airport: string,
    rowId: string,
    index: number | null,
    option: Option,
    dateContext: string,
  ) => {
    let currentData = stagingData;
    if (!isEditMode || !currentData) {
      setIsEditMode(true);
      currentData = JSON.parse(JSON.stringify(scheduleData));
    }

    const newData = JSON.parse(JSON.stringify(currentData));
    if (!newData[airport]) newData[airport] = [];
    let row = newData[airport].find((r: RowData) => r.key === rowId);
    if (!row) {
      // We need to create the row if it doesn't exist
      row = { key: rowId, date: dateContext || "", callET: rowId.split("T")[1] || "", options: [] };
      newData[airport].push(row);
    }

    if (index !== null) row.options[index] = option;
    else row.options.push(option);

    updateStaging(newData);
  };

  return {
    scheduleData,
    setScheduleData, // For initial load
    isEditMode,
    setIsEditMode,
    stagingData,
    history,
    future,
    enterEditMode,
    executeCommit,
    executeDiscard,
    handleUndo,
    handleRedo,
    modifyOptions,
    saveOptionToStaging,
    activeData: isEditMode && stagingData ? stagingData : scheduleData,
  };
}
