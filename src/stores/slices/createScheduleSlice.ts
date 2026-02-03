import { StateCreator } from "zustand";
import { produce, castDraft } from "immer";
import { ScheduleData, Option, RowData } from "../../types";

export interface ScheduleSlice {
    // State
    isEditMode: boolean;
    stagingData: ScheduleData | null;
    history: ScheduleData[];
    future: ScheduleData[];

    // Actions
    enterEditMode: (currentData: ScheduleData) => void;
    executeCommit: () => void;
    executeDiscard: () => void;
    updateStaging: (newData: ScheduleData) => void;
    handleUndo: () => void;
    handleRedo: () => void;

    // Complex Modifiers
    modifyOptions: (airport: string, rowId: string, action: (options: Option[]) => void) => void;
    saveOptionToStaging: (
        airport: string,
        rowId: string,
        index: number | null,
        option: Option,
        dateContext: string
    ) => void;
}

export const createScheduleSlice: StateCreator<ScheduleSlice> = (set, get) => ({
    isEditMode: false,
    stagingData: null,
    history: [],
    future: [],

    enterEditMode: (currentData) => {
        set(
            produce((state: ScheduleSlice) => {
                state.stagingData = castDraft(currentData);
                state.history = [];
                state.future = [];
                state.isEditMode = true;
            })
        );
    },

    executeCommit: () => {
        set({
            stagingData: null,
            history: [],
            future: [],
            isEditMode: false,
        });
    },

    executeDiscard: () => {
        set({
            stagingData: null,
            history: [],
            future: [],
            isEditMode: false,
        });
    },

    updateStaging: (newData) => {
        const { stagingData, history } = get();
        if (stagingData) {
            set({
                history: [...history, stagingData],
                future: [],
                stagingData: newData,
            });
        } else {
            set({ stagingData: newData });
        }
    },

    handleUndo: () => {
        const { history, stagingData, future } = get();
        if (history.length === 0 || !stagingData) return;

        const prev = history[history.length - 1];
        if (prev) { // Strict null check
            set({
                future: [stagingData, ...future],
                history: history.slice(0, -1),
                stagingData: prev,
            });
        }
    },

    handleRedo: () => {
        const { future, stagingData, history } = get();
        if (future.length === 0 || !stagingData) return;

        const next = future[0];
        if (next) { // Strict null check
            set({
                history: [...history, stagingData],
                future: future.slice(1),
                stagingData: next,
            });
        }
    },

    modifyOptions: (airport, rowId, action) => {
        const { stagingData, updateStaging } = get();

        if (!stagingData) {
            console.warn("Attempted to modify options without staging data");
            return;
        }

        const newData = produce(stagingData, (draft) => {
            if (!draft[airport]) draft[airport] = [];

            let row = draft[airport].find((r: RowData) => r.key === rowId);

            // Create row if not exists
            if (!row) {
                const date = rowId.split("T")[0] || "";
                const callET = rowId.split("T")[1] || "";
                row = { key: rowId, date, callET, options: [] };
                draft[airport].push(row);
            }

            action(row.options);
        });

        updateStaging(newData);
    },

    saveOptionToStaging: (airport, rowId, index, option, dateContext) => {
        const { stagingData, updateStaging } = get();

        if (!stagingData) {
            console.warn("Attempted to save option without staging data");
            return;
        }

        const newData = produce(stagingData, (draft) => {
            if (!draft[airport]) draft[airport] = [];

            let row = draft[airport].find((r: RowData) => r.key === rowId);
            if (!row) {
                row = {
                    key: rowId,
                    date: dateContext || "",
                    callET: rowId.split("T")[1] || "",
                    options: []
                };
                draft[airport].push(row);
            }

            if (index !== null) {
                row.options[index] = option;
            } else {
                row.options.push(option);
            }
        });

        updateStaging(newData);
    },
});
