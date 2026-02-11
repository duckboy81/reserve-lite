import { useEffect, useState, useRef, useLayoutEffect } from "react";
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
import ConfirmModal from "./components/modals/ConfirmModal";
import Header from "./components/layout/Header";
import { ConfigScreen } from "./screens/ConfigScreen";
import { useCrossTabSync } from "./hooks/useCrossTabSync";
import { useQueryClient } from "@tanstack/react-query";
import { useBlockMutations } from "./hooks/queries/useBlockMutations";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

export default function App() {
  // --- ZUSTAND SELECTORS (Atomic & Shallow) ---
  const user = useBoundStore((state) => state.user);
  const config = useBoundStore((state) => state.config);
  const hasConfigured = useBoundStore((state) => state.hasConfigured);
  const modals = useBoundStore((state) => state.modals);
  const activeBlockId = useBoundStore((state) => state.activeBlockId);
  const editContext = useBoundStore((state) => state.editContext);
  const confirmModal = useBoundStore((state) => state.confirmModal);

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
  const { data: reserveBlocks = [], isFetching: isReserveBlockFetching } = useBlocksQuery();
  const { data: scheduleData = {}, isFetching: isScheduleFetching } = useScheduleQuery();
  const { addBlock, updateBlock, deleteBlock, restoreBlock } = useBlockMutations();

  // Decide which data is "Active" (Server vs Staging)
  const activeData = isEditMode && stagingData ? stagingData : scheduleData;

  const { data: flightStatuses = {}, isFetching: isFlightFetching } = useFlightStatusQuery(activeData);
  const { saveMutation } = useScheduleMutations();

  const isOnline = useNetworkStatus();
  const loading = isReserveBlockFetching || isScheduleFetching || isFlightFetching || saveMutation.isPending || addBlock.isPending || updateBlock.isPending || deleteBlock.isPending || restoreBlock.isPending;

  // --- CROSS-TAB SYNC ---
  useCrossTabSync();

  // --- EFFECTS ---

  // 1. Init Auth & Config
  useEffect(() => {
    initializeAuth();
    // Config persistence is handled by middlewares, but we might check if user changed
    DataService.processLifecycle();
  }, [initializeAuth]);

  // 2. Active Block Initialization
  useEffect(() => {
    if (reserveBlocks.length > 0) {
      if (!activeBlockId || !reserveBlocks.some(b => b.id === activeBlockId)) {
        const active = reserveBlocks.find((b) => !b.deleted && !b.isArchived) || reserveBlocks[0];
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

  const executePaste = (rowId: string) => {
    if (!clipboardPlan) return;
    modifyOptions(airport, rowId, (options) => {
      options.length = 0;
      options.push(...JSON.parse(JSON.stringify(clipboardPlan)));
    });
    setClipboardPlan(null);
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
    const newId = crypto.randomUUID();
    addBlock.mutateAsync({ ...b, id: newId }).then(() => {
      useBoundStore.getState().setActiveBlockId(newId);
    });
  };

  const handleBlockDelete = (id: string) => {
    deleteBlock.mutateAsync({ id }).then(() => {
      useBoundStore.getState().setActiveBlockId(null);
    });
  };

  // Virtualization
  const parentRef = useRef<HTMLDivElement>(null);
  const [parentOffset, setParentOffset] = useState(0);

  useLayoutEffect(() => {
    if (parentRef.current) {
      const offset = parentRef.current.offsetTop;
      setParentOffset((prev) => (prev !== offset ? offset : prev));
    }
  }, [isEditMode, activeBlock?.deleted, activeBlock?.isArchived]);

  const rowVirtualizer = useWindowVirtualizer({
    count: timelineRows.length,
    estimateSize: () => 180, // Better average for rows with flights
    scrollMargin: parentOffset,
    getItemKey: (index) => timelineRows[index]?.key || index,
    overscan: 25, // Increased overscan for smoother scrolling
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    if (!isEditMode) setClipboardPlan(null);
  }, [isEditMode])

  return (
    <div className={`min-h-screen font-sans text-gray-900 pb-20 ${isEditMode ? "bg-gray-100" : "bg-white"}`}>
      <Header
        isEditMode={isEditMode}
        airport={airport}
        setAirport={setAirport}
        activeBlock={activeBlock}
        config={config}
        setModalOpen={setModalOpen}
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

      <main
        ref={parentRef}
        className="max-w-6xl mx-auto min-h-125 border-x border-gray-100 shadow-sm bg-white"
      >
        {timelineRows.length > 0 ? (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualItems.map((virtualRow) => {
              const row = timelineRows[virtualRow.index];
              if (!row) return null;
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start - parentOffset}px)`,
                  }}
                >
                  <TimelineRow
                    row={row}
                    isEdit={isEditMode}
                    onAddOption={handleAddOption}
                    onDeleteOption={deleteOption}
                    onEditOption={handleEditOption}
                    onReorderOptions={reorderOptions}
                    flightStatuses={flightStatuses}
                    onCopyPlan={(opt) => setClipboardPlan(JSON.parse(JSON.stringify(opt)))}
                    onPastePlan={(rowId) => executePaste(rowId)}
                    hasClipboard={!!clipboardPlan}
                  />
                </div>
              );
            })}
          </div>
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

      {!!clipboardPlan && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-100 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <button
            onClick={() => setClipboardPlan(null)}
            className="flex items-center gap-2 px-6 py-3 rounded-full shadow-xl transition-all transform hover:-translate-y-0.5 font-bold text-xs uppercase tracking-wide
        bg-red-50 border border-red-200 text-red-400
        hover:bg-red-100 hover:border-red-300 hover:text-red-700 hover:shadow-red-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
            Cancel Paste
          </button>
        </div>
      )}

      {/* Modals */}
      <EditOptionModal
        isOpen={modals.edit}
        onClose={() => setModalOpen("edit", false)}
        onSave={handleSaveOption}
        initialOption={editContext ? editContext.option : null}
        dateContext={editContext ? editContext.dateContext : ""}
        config={config}
        isGuest={AuthService.isGuest()}
        activeBlockBase={activeBlock?.homeBase}
        currentAirport={airport}
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
        onDelete={handleBlockDelete}
        onRestore={async (id) => restoreBlock.mutate(id)}
        config={config}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        type={confirmModal.type}
        onConfirm={() => {
          switch (confirmModal.type) {
            case "commit":
              handleCommit();
              break;
            case "logout":
              AuthService.logout();
              useBoundStore.getState().setUser(null);
              break;
            // case "paste":
            //   executePaste();
            //   break;
            case "discard":
            default:
              executeDiscard();
          }
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
