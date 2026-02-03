import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { generateTimeline } from "./utils/dateUtil";
import { TimelineRowData, RowData, Config } from "./types";
import { useNetworkStatus } from "./hooks/useNetworkStatus";

// Architecture Imports
import { useBoundStore } from "./stores/useBoundStore";
import { useBlocksQuery } from "./hooks/queries/useBlocksQuery";
import { useScheduleQuery } from "./hooks/queries/useScheduleQuery";
import { useFlightStatusQuery } from "./hooks/queries/useFlightStatusQuery";
import { useScheduleMutations } from "./hooks/queries/useScheduleMutations";
import { DataService } from "./services/DataService";
import { AuthService } from "./services/AuthService";

// Components
import { OfflineIndicator } from "./components/OfflineIndicator";
import LoginScreen from "./screens/LoginScreen";
import TimelineRow from "./components/timeline/TimelineRow";
import EditOptionModal from "./components/modals/EditOptionModal";
import ConfigModal from "./components/modals/ConfigModal";
import BlockManager from "./components/modals/BlockManager";
import ConfirmModal from "./components/modals/ConfirmModal"; // ConfirmType is inferred
import Header from "./components/layout/Header";
import { ConfigScreen } from "./screens/ConfigScreen";
import { useCrossTabSync } from "./hooks/useCrossTabSync";
import { useQueryClient } from "@tanstack/react-query";
import { useBlockMutations } from "./hooks/queries/useBlockMutations";

export default function App() {
  // --- ZUSTAND SELECTORS (Atomic & Shallow) ---
  const user = useBoundStore((state) => state.user);
  const config = useBoundStore((state) => state.config);
  const hasConfigured = useBoundStore((state) => state.hasConfigured);
  const modals = useBoundStore((state) => state.modals);
  const activeBlockId = useBoundStore((state) => state.activeBlockId);
  const editContext = useBoundStore((state) => state.editContext);
  const confirmModal = useBoundStore((state) => state.confirmModal);
  const pasteContext = useBoundStore((state) => state.pasteContext);

  // Schedule / Edit Mode State
  const isEditMode = useBoundStore((state) => state.isEditMode);
  const stagingData = useBoundStore((state) => state.stagingData);
  const history = useBoundStore((state) => state.history);
  const future = useBoundStore((state) => state.future);

  // Actions
  const {
    initializeAuth,
    setHasConfigured,
    setConfig,
    setModalOpen,
    setActiveBlockId,
    setEditContext,
    setConfirmModal,
    setPasteContext,
    enterEditMode,
    executeCommit,
    executeDiscard,
    handleUndo,
    handleRedo,
    modifyOptions,
    saveOptionToStaging
  } = useBoundStore(useShallow((state) => ({
    initializeAuth: state.initializeAuth,
    setHasConfigured: state.setHasConfigured,
    setConfig: state.setConfig,
    setModalOpen: state.setModalOpen,
    setActiveBlockId: state.setActiveBlockId,
    setEditContext: state.setEditContext,
    setConfirmModal: state.setConfirmModal,
    setPasteContext: state.setPasteContext,
    enterEditMode: state.enterEditMode,
    executeCommit: state.executeCommit,
    executeDiscard: state.executeDiscard,
    handleUndo: state.handleUndo,
    handleRedo: state.handleRedo,
    modifyOptions: state.modifyOptions,
    saveOptionToStaging: state.saveOptionToStaging
  })));

  // --- TANSTACK QUERY ---
  const queryClient = useQueryClient(); // Expose client for manual invalidation
  const { data: reserveBlocks = [] } = useBlocksQuery();
  const { data: scheduleData = {}, isFetching: isScheduleFetching } = useScheduleQuery();
  const { addBlock, updateBlock, deleteBlock, restoreBlock } = useBlockMutations();

  // Decide which data is "Active" (Server vs Staging)
  const activeData = isEditMode && stagingData ? stagingData : scheduleData;

  const { data: flightStatuses = {}, isFetching: isFlightFetching } = useFlightStatusQuery(activeData);
  const { saveMutation } = useScheduleMutations();

  const isOnline = useNetworkStatus();
  const loading = isScheduleFetching || isFlightFetching || saveMutation.isPending || addBlock.isPending || updateBlock.isPending || deleteBlock.isPending || restoreBlock.isPending;

  // --- CROSS-TAB SYNC ---
  useCrossTabSync();

  // --- EFFECTS ---

  // 1. Init Auth & Config
  useEffect(() => {
    initializeAuth();
    // Config persistence is handled by middlewares, but we might check if user changed
    DataService.initialize().then(() => {
      DataService.processLifecycle();
    });
  }, [initializeAuth]);

  // 2. Active Block Initialization
  useEffect(() => {
    if (reserveBlocks.length > 0) {
      if (!activeBlockId || !reserveBlocks.some(b => b.id === activeBlockId)) {
        const active = reserveBlocks.find((b) => !b.isDeleted && !b.isArchived) || reserveBlocks[0];
        if (active) setActiveBlockId(active.id);
      }
    }
  }, [reserveBlocks, activeBlockId, setActiveBlockId]);


  // --- HANDLERS ---

  const handleCommit = () => {
    if (stagingData) {
      saveMutation.mutate(stagingData);
    } else {
      executeCommit(); // Just exit if nothing changed (though this path shouldn't strictly happen if logic is correct)
    }
  };

  const handleGuestLogin = () => {
    AuthService.clearGuestMode();
    useBoundStore.getState().setUser(null); // Direct access or via hook
  };

  const handleRefresh = () => {
    // Force a refetch of all data
    queryClient.invalidateQueries();
    useBoundStore.getState().initializeAuth();
  };

  // Clipboard State (Local is fine for clipboard)
  const [clipboardPlan, setClipboardPlan] = useState<any>(null); // Using any or Option[]

  // --- ACTIONS (Proxied to Store) ---

  const handleAddOption = (rowId: string, dateContext: string) => {
    setEditContext({ rowId, index: null, option: null, dateContext });
    setModalOpen("edit", true);
  };

  const handleEditOption = (rowId: string, index: number, option: any, dateContext: string) => {
    setEditContext({ rowId, index, option, dateContext });
    setModalOpen("edit", true);
  };

  const handleSaveOption = (option: any) => {
    if (!editContext) return;
    saveOptionToStaging(airport, editContext.rowId, editContext.index, option, editContext.dateContext);
    setModalOpen("edit", false);
  };

  const handlePastePlan = (rowId: string, targetOptions: any[]) => {
    if (!clipboardPlan) return;
    if (targetOptions.length > 0) {
      setPasteContext({ rowId });
      setConfirmModal({ isOpen: true, type: "paste" });
    } else {
      // Paste directly
      if (!isEditMode) enterEditMode(scheduleData);
      modifyOptions(airport, rowId, (options) => {
        options.length = 0;
        options.push(...JSON.parse(JSON.stringify(clipboardPlan)));
      });
    }
  };

  const executePaste = () => {
    if (!pasteContext || !clipboardPlan) return;
    if (!isEditMode) enterEditMode(scheduleData);

    modifyOptions(airport, pasteContext.rowId, (options) => {
      options.length = 0;
      options.push(...JSON.parse(JSON.stringify(clipboardPlan)));
    });
    setPasteContext(null);
    setConfirmModal({ isOpen: false, type: null });
  };

  const deleteOption = (rowId: string, index: number) => {
    if (!isEditMode) enterEditMode(scheduleData);
    modifyOptions(airport, rowId, (options) => options.splice(index, 1));
  };

  const reorderOptions = (rowId: string, from: number, to: number) => {
    if (!isEditMode) enterEditMode(scheduleData);
    modifyOptions(airport, rowId, (options) => {
      const moved = options.splice(from, 1)[0];
      if (moved) options.splice(to, 0, moved);
    });
  };

  // --- RENDER PREP ---
  const [airport, setAirport] = useState("ONT"); // Local state for airport selection is fine, or move to UI slice if needed globally.

  let timelineRows: TimelineRowData[] = [];
  const activeBlock = reserveBlocks.find((b) => b.id === activeBlockId);

  if (activeBlock) {
    const sDate = activeBlock.start.split("T")[0] || "";
    const eDate = activeBlock.end.split("T")[0] || "";
    if (sDate && eDate) {
      timelineRows = generateTimeline(sDate, eDate, config, activeBlock.timezone);
      timelineRows.forEach((row) => {
        const storedRow = activeData[airport]?.find((r: RowData) => r.key === row.key);
        if (storedRow) row.options = storedRow.options;
      });
    }
  }

  // Wrappers for BlockManager
  const handleBlockAdd = (b: any) => {
    const newId = Date.now().toString();
    addBlock.mutateAsync({ ...b, id: newId }).then(() => {
      useBoundStore.getState().setActiveBlockId(newId);
    });
  };

  return (
    <div className={`min-h-screen font-sans text-gray-900 pb-20 ${isEditMode ? "bg-gray-100" : "bg-white"}`}>
      <Header
        isEditMode={isEditMode}
        airport={airport}
        setAirport={setAirport}
        activeBlock={activeBlock}
        config={config}
        setModals={(m: any) => setModalOpen(m.config ? "config" : m.blocks ? "blocks" : "edit", true)} // Adapter for legacy prop shape if needed, or update Header
        enterEditMode={() => enterEditMode(scheduleData)}
        handleGlobalRefresh={handleRefresh}
        loading={loading}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        history={history}
        future={future}
        setConfirmModal={setConfirmModal}
        user={user}
        executeGuestLogin={handleGuestLogin}
        onSave={handleCommit}
      />

      <main className="max-w-6xl mx-auto min-h-125 border-x border-gray-100 shadow-sm bg-white">
        {timelineRows.length > 0 ? (
          timelineRows.map((row) => (
            <TimelineRow
              key={row.key}
              row={row}
              isEdit={isEditMode}
              onAddOption={handleAddOption}
              onDeleteOption={deleteOption}
              onEditOption={handleEditOption}
              onReorderOptions={reorderOptions}
              flightStatuses={flightStatuses}
              onCopyPlan={(opt) => setClipboardPlan(JSON.parse(JSON.stringify(opt)))}
              onPastePlan={(rowId) => handlePastePlan(rowId, row.options)}
              hasClipboard={!!clipboardPlan}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Calendar size={48} className="mb-4 text-gray-200" />
            <p>No active reserve block selected.</p>
            <button
              onClick={() => setModalOpen("blocks", true)}
              className="mt-4 text-indigo-600 font-bold hover:underline"
            >
              Add a Reserve Block
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      <EditOptionModal
        isOpen={modals.edit}
        onClose={() => setModalOpen("edit", false)}
        onSave={handleSaveOption}
        initialOption={editContext ? editContext.option : null}
        dateContext={editContext ? editContext.dateContext : ""}
        config={config}
        isGuest={AuthService.isGuest()}
      />

      <ConfigModal
        isOpen={modals.config}
        onClose={() => setModalOpen("config", false)}
        config={config}
        onSave={(c: Config) => {
          setConfig(c);
          setModalOpen("config", false);
        }}
      />

      <BlockManager
        isOpen={modals.blocks}
        onClose={() => setModalOpen("blocks", false)}
        blocks={reserveBlocks}
        activeId={activeBlockId}
        onSelect={setActiveBlockId}
        onAdd={handleBlockAdd}
        onEdit={async (id, b) => {
          const blk = reserveBlocks.find(x => x.id === id);
          if (blk) updateBlock.mutate({ ...blk, ...b });
        }}
        onDelete={async (id) => deleteBlock.mutate({ id })}
        onRestore={async (id) => restoreBlock.mutate(id)}
        config={config}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        type={confirmModal.type}
        onConfirm={() => {
          if (confirmModal.type === "commit") handleCommit();
          else if (confirmModal.type === "logout") { AuthService.logout(); useBoundStore.getState().setUser(null); setConfirmModal({ isOpen: false, type: null }); }
          else if (confirmModal.type === "paste") executePaste();
          else executeDiscard();
          setConfirmModal({ isOpen: false, type: null });
        }}
        onCancel={() => setConfirmModal({ isOpen: false, type: null })}
      />

      <OfflineIndicator isOnline={isOnline} />

      {/* Login Overlay */}
      {!user && (
        <div className="fixed inset-0 z-200 backdrop-blur-sm bg-black/30 flex items-center justify-center">
          <LoginScreen onLogin={(u) => useBoundStore.getState().setUser(u)} />
        </div>
      )}

      {/* Onboarding Overlay */}
      {user && !hasConfigured && (
        <div className="fixed inset-0 z-100 bg-white flex items-center justify-center">
          <ConfigScreen
            initialConfig={config}
            onSave={(c: Config) => {
              setConfig(c);
              setHasConfigured(true);
            }}
          />
        </div>
      )}

    </div>
  );
}
