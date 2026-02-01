import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { AuthService } from "./services/AuthService";
import { DataService } from "./services/DataService";
import { generateTimeline } from "./utils/dateUtil";
import { DEFAULT_CONFIG } from "./config/constants";

import { Config, User, Option, TimelineRowData, EditContext, RowData } from "./types";

import { useNetworkStatus } from "./hooks/useNetworkStatus";
import { useScheduleManager } from "./hooks/useScheduleManager";
import { useReserveData } from "./hooks/useReserveData";

import { OfflineIndicator } from "./components/OfflineIndicator";
import LoginScreen from "./screens/LoginScreen";
import TimelineRow from "./components/timeline/TimelineRow";
import EditOptionModal from "./components/modals/EditOptionModal";
import ConfigModal from "./components/modals/ConfigModal";
import BlockManager from "./components/modals/BlockManager";
import ConfirmModal from "./components/modals/ConfirmModal";
import Header from "./components/layout/Header";
import { ConfigScreen } from "./screens/ConfigScreen";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [airport, setAirport] = useState<string>("ONT");
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [hasConfigured, setHasConfigured] = useState(false);

  // Network State
  const isOnline = useNetworkStatus();

  const {
    setScheduleData,
    isEditMode,
    // stagingData, // only needed if we want to check it explicitly, but activeData covers it
    history,
    future,
    enterEditMode,
    executeCommit,
    executeDiscard,
    handleUndo,
    handleRedo,
    modifyOptions,
    saveOptionToStaging,
    activeData,
  } = useScheduleManager();

  const {
    reserveBlocks,
    setReserveBlocks,
    activeBlockId,
    setActiveBlockId,
    flightStatuses,
    loading,
    setLoading,
    handleBlockAdd,
    handleBlockEdit,
    handleBlockDelete,
    handleBlockRestore,
    refreshFlights,
  } = useReserveData();

  // UI State
  const [modals, setModals] = useState({ edit: false, config: false, blocks: false });
  const [editContext, setEditContext] = useState<EditContext | null>(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "commit" | "discard" | "logout" | "paste" | null;
  }>({ isOpen: false, type: null });
  const [pasteContext, setPasteContext] = useState<{ rowId: string } | null>(null);

  // Clipboard
  const [clipboardPlan, setClipboardPlan] = useState<Option[] | null>(null);

  // --- INIT ---
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      // Initialize DB and migrate if needed
      await DataService.initialize();
      await DataService.processLifecycle();

      const token = AuthService.getToken();
      if (token) {
        const authStr = localStorage.getItem("alpa_auth");
        if (authStr) setUser(JSON.parse(authStr).userInfo);
      }

      const savedConfig = localStorage.getItem("reserve_lite_config");
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
        setHasConfigured(true);
      } else {
        setHasConfigured(false);
      }

      // Load Data from DB
      const blocks = await DataService.getBlocks();
      const schedule = await DataService.getSchedule();

      setReserveBlocks(blocks);
      setScheduleData(schedule);

      // Default to the first active block, or just the first block if none active
      const activeBlock = blocks.find((b) => !b.isDeleted && !b.isArchived) || blocks[0];
      if (activeBlock) {
        setActiveBlockId(activeBlock.id);
      }

      setLoading(false);
    };
    initApp();
  }, []);

  // --- ACTIONS ---

  const executeLogout = () => {
    AuthService.logout();
    setUser(null);
    setConfirmModal({ isOpen: false, type: null });
  };

  const executeGuestLogin = () => {
    AuthService.clearGuestMode();
    setUser(null);
  };

  const executePaste = () => {
    if (!pasteContext || !clipboardPlan) return;
    const { rowId } = pasteContext;

    modifyOptions(airport, rowId, (options) => {
      options.length = 0;
      options.push(...JSON.parse(JSON.stringify(clipboardPlan)));
    });

    setPasteContext(null);
    setConfirmModal({ isOpen: false, type: null });
  };

  const handleAddOption = (rowId: string, dateContext: string) => {
    setEditContext({ rowId, index: null, option: null, dateContext });
    setModals({ ...modals, edit: true });
  };

  const handleEditOption = (rowId: string, index: number, option: Option, dateContext: string) => {
    setEditContext({ rowId, index, option, dateContext });
    setModals({ ...modals, edit: true });
  };

  const handleSaveOption = (option: Option) => {
    if (!editContext) return;
    saveOptionToStaging(airport, editContext.rowId, editContext.index, option, editContext.dateContext);
    setModals({ ...modals, edit: false });
  };

  const deleteOption = (rowId: string, index: number) => {
    modifyOptions(airport, rowId, (options) => {
      options.splice(index, 1);
    });
  };

  const reorderOptions = (rowId: string, from: number, to: number) => {
    modifyOptions(airport, rowId, (options) => {
      const moved = options.splice(from, 1)[0];
      if (moved) options.splice(to, 0, moved);
    });
  };

  const handleCopyPlan = (options: Option[]) => {
    setClipboardPlan(JSON.parse(JSON.stringify(options)));
  };

  const handlePastePlan = (rowId: string, targetOptions: Option[]) => {
    if (!clipboardPlan) return;

    if (targetOptions.length > 0) {
      setPasteContext({ rowId });
      setConfirmModal({ isOpen: true, type: "paste" });
    } else {
      modifyOptions(airport, rowId, (options) => {
        options.length = 0;
        options.push(...JSON.parse(JSON.stringify(clipboardPlan)));
      });
    }
  };

  // --- RENDERING ---

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

  return (
    <div className={`min-h-screen font-sans text-gray-900 pb-20 ${isEditMode ? "bg-gray-100" : "bg-white"}`}>
      <Header
        isEditMode={isEditMode}
        airport={airport}
        setAirport={setAirport}
        activeBlock={activeBlock}
        config={config}
        setModals={setModals}
        enterEditMode={enterEditMode}
        handleGlobalRefresh={() => refreshFlights(activeData)}
        loading={loading}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        history={history}
        future={future}
        setConfirmModal={setConfirmModal}
        user={user}
        executeGuestLogin={executeGuestLogin}
        onSave={executeCommit}
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
              onCopyPlan={handleCopyPlan}
              onPastePlan={(rowId) => handlePastePlan(rowId, row.options)}
              hasClipboard={!!clipboardPlan}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Calendar size={48} className="mb-4 text-gray-200" />
            <p>No active reserve block selected.</p>
            <button
              onClick={() => setModals({ ...modals, blocks: true })}
              className="mt-4 text-indigo-600 font-bold hover:underline"
            >
              Add a Reserve Block
            </button>
          </div>
        )}
      </main>

      <EditOptionModal
        isOpen={modals.edit}
        onClose={() => setModals({ ...modals, edit: false })}
        onSave={handleSaveOption}
        initialOption={editContext ? editContext.option : null}
        dateContext={editContext ? editContext.dateContext : ""}
        config={config}
        isGuest={AuthService.isGuest()}
      />

      <ConfigModal
        isOpen={modals.config}
        onClose={() => setModals({ ...modals, config: false })}
        config={config}
        onSave={(c: Config) => {
          setConfig(c);
          localStorage.setItem("reserve_lite_config", JSON.stringify(c));
          setModals({ ...modals, config: false });
        }}
      />

      <BlockManager
        isOpen={modals.blocks}
        onClose={() => setModals({ ...modals, blocks: false })}
        blocks={reserveBlocks}
        activeId={activeBlockId}
        onSelect={setActiveBlockId}
        onAdd={handleBlockAdd}
        onEdit={handleBlockEdit}
        onDelete={handleBlockDelete}
        onRestore={handleBlockRestore}
        config={config}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        type={confirmModal.type}
        onConfirm={() => {
          if (confirmModal.type === "commit") executeCommit();
          else if (confirmModal.type === "logout") executeLogout();
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
          <LoginScreen onLogin={setUser} />
        </div>
      )}

      {/* Onboarding Overlay */}
      {user && !hasConfigured && (
        <div className="fixed inset-0 z-100 bg-white flex items-center justify-center">
          <ConfigScreen
            initialConfig={config}
            onSave={(c: Config) => {
              setConfig(c);
              localStorage.setItem("reserve_lite_config", JSON.stringify(c));
              setHasConfigured(true);
            }}
          />
        </div>
      )}
    </div>
  );
}
