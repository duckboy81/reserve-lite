import { StateCreator } from "zustand";
import { EditContext, ConfirmType } from "../../types";

export interface UIState {
    // Modals
    modals: {
        edit: boolean;
        config: boolean;
        blocks: boolean;
    };
    // Selection
    activeBlockId: string | null;
    // Edit Context
    editContext: EditContext | null;
    // Confirm Modal
    confirmModal: {
        isOpen: boolean;
        type: ConfirmType | null;
    };
    // Paste Context
    pasteContext: { rowId: string } | null;
}

export interface UISlice extends UIState {
    setModalOpen: (modal: keyof UIState["modals"], isOpen: boolean) => void;
    setActiveBlockId: (id: string | null) => void;
    setEditContext: (context: EditContext | null) => void;
    setConfirmModal: (payload: { isOpen: boolean; type: ConfirmType | null }) => void;
    setPasteContext: (context: { rowId: string } | null) => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
    modals: {
        edit: false,
        config: false,
        blocks: false,
    },
    activeBlockId: null,
    editContext: null,
    confirmModal: {
        isOpen: false,
        type: null,
    },
    pasteContext: null,

    setModalOpen: (modal, isOpen) =>
        set((state) => ({ modals: { ...state.modals, [modal]: isOpen } })),
    setActiveBlockId: (id) => set({ activeBlockId: id }),
    setEditContext: (context) => set({ editContext: context }),
    setConfirmModal: (payload) => set({ confirmModal: payload }),
    setPasteContext: (context) => set({ pasteContext: context }),
});
