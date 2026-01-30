import { useState, useEffect } from 'react';
import { Plane, RefreshCw, LogOut, Edit3, Save, Undo, Redo, X, Calendar, Settings } from 'lucide-react';
import { AuthService } from './services/AuthService';
import { FlightService } from './services/FlightService';
import { StringParser } from './utils/StringParser';
import { generateTimeline } from './utils/dateUtil';
import { DEFAULT_CONFIG, SEED_CSV_DATA } from './config/constants';

import { ReserveBlock, ScheduleData, Config, User, Option, RowData, FlightStatus, EditContext, FlightSegment, TimelineRowData } from './types';

import LoginScreen from './screens/LoginScreen';
import TimelineRow from './components/timeline/TimelineRow';
import EditOptionModal from './components/modals/EditOptionModal';
import ConfigModal from './components/modals/ConfigModal';
import BlockManager from './components/modals/BlockManager';
import ConfirmModal from './components/modals/ConfirmModal';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [airport, setAirport] = useState<string>('ONT');
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);

  // Data State
  const [scheduleData, setScheduleData] = useState<ScheduleData>({});
  const [reserveBlocks, setReserveBlocks] = useState<ReserveBlock[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [flightStatuses, setFlightStatuses] = useState<Record<string, FlightStatus>>({});

  // Edit State
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [stagingData, setStagingData] = useState<ScheduleData | null>(null); // The temporary data being edited
  const [history, setHistory] = useState<ScheduleData[]>([]);
  const [future, setFuture] = useState<ScheduleData[]>([]);

  // UI State
  const [modals, setModals] = useState({ edit: false, config: false, blocks: false });
  const [editContext, setEditContext] = useState<EditContext | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'commit' | 'discard' | null }>({ isOpen: false, type: null });

  // --- INIT ---
  useEffect(() => {
    const token = AuthService.getToken();
    if (token) {
        const authStr = localStorage.getItem('alpa_auth');
        if (authStr) setUser(JSON.parse(authStr).userInfo);
    }

    const savedData = localStorage.getItem('reserve_lite_data_v2');
    const savedBlocks = localStorage.getItem('reserve_lite_blocks');
    const savedConfig = localStorage.getItem('reserve_lite_config');

    if (savedConfig) setConfig(JSON.parse(savedConfig));
    if (savedBlocks) {
      const b = JSON.parse(savedBlocks);
      setReserveBlocks(b);
      if(b.length > 0) setActiveBlockId(b[0].id);
    }

    if (savedData) {
      setScheduleData(JSON.parse(savedData));
    } else {
      const parsed = StringParser.seedFromCSV(SEED_CSV_DATA);
      setScheduleData(parsed);
      const defaultBlock: ReserveBlock = { id: 'default-1', start: '2026-01-30T10:00:00', end: '2026-02-01T06:00:00' };
      setReserveBlocks([defaultBlock]);
      setActiveBlockId(defaultBlock.id);
      localStorage.setItem('reserve_lite_data_v2', JSON.stringify(parsed));
    }
  }, []);

  // --- EDIT MODE ACTIONS ---

  const enterEditMode = () => {
    setStagingData(JSON.parse(JSON.stringify(scheduleData)));
    setHistory([]); setFuture([]);
    setIsEditMode(true);
  };

  const executeCommit = () => {
    if (stagingData) {
      setScheduleData(stagingData);
      localStorage.setItem('reserve_lite_data_v2', JSON.stringify(stagingData));
    }
    setStagingData(null);
    setHistory([]); setFuture([]);
    setIsEditMode(false);
    setConfirmModal({ isOpen: false, type: null });
  };

  const executeDiscard = () => {
    setStagingData(null);
    setHistory([]); setFuture([]);
    setIsEditMode(false);
    setConfirmModal({ isOpen: false, type: null });
  };

  const updateStaging = (newData: ScheduleData) => {
    if (stagingData) setHistory([...history, stagingData]);
    setFuture([]);
    setStagingData(newData);
  };

  const handleUndo = () => {
    if(history.length === 0 || !stagingData) return;
    const prev = history[history.length - 1];
    if (prev) {
      setFuture([stagingData, ...future]);
      setHistory(history.slice(0, -1));
      setStagingData(prev);
    }
  };

  const handleRedo = () => {
    if(future.length === 0 || !stagingData) return;
    const next = future[0];
    if (next) {
      setHistory([...history, stagingData]);
      setFuture(future.slice(1));
      setStagingData(next);
    }
  };

  // --- DATA MANIPULATION ---

  const handleAddOption = (rowId: string, dateContext: string) => {
    setEditContext({ rowId, index: null, option: null, dateContext });
    setModals({...modals, edit: true});
  };

  const handleEditOption = (rowId: string, index: number, option: Option, dateContext: string) => {
    setEditContext({ rowId, index, option, dateContext });
    setModals({...modals, edit: true});
  };

  const saveOptionToStaging = (option: Option) => {
    if (!editContext) return;
    const { rowId, index } = editContext;
    let currentData = stagingData;
    if (!isEditMode || !currentData) {
      setIsEditMode(true);
      currentData = JSON.parse(JSON.stringify(scheduleData));
    }

    const newData = JSON.parse(JSON.stringify(currentData));
    if (!newData[airport]) newData[airport] = [];
    let row = newData[airport].find((r: RowData) => r.key === rowId);
    if (!row) {
      row = { key: rowId, date: editContext.dateContext || '', callET: rowId.split('T')[1] || '', options: [] };
      newData[airport].push(row);
    }

    if (index !== null) row.options[index] = option;
    else row.options.push(option);

    updateStaging(newData);
    setModals({...modals, edit: false});
  };

  const modifyOptions = (rowId: string, action: (options: Option[]) => void) => {
    let currentData = stagingData || JSON.parse(JSON.stringify(scheduleData));
    if (!isEditMode) setIsEditMode(true);

    const newData = JSON.parse(JSON.stringify(currentData));
    const row = newData[airport].find((r: RowData) => r.key === rowId);
    if (row) {
      action(row.options);
      updateStaging(newData);
    }
  };

  const deleteOption = (rowId: string, index: number) => {
    modifyOptions(rowId, (options) => { options.splice(index, 1); });
  };

  const reorderOptions = (rowId: string, from: number, to: number) => {
    modifyOptions(rowId, (options) => {
      const moved = options.splice(from, 1)[0];
      if (moved) options.splice(to, 0, moved);
    });
  };

  // --- BLOCK MANIPULATION ---
  const handleBlockAdd = (b: Omit<ReserveBlock, 'id'>) => {
    const newB: ReserveBlock = { ...b, id: Date.now().toString() };
    const next = [...reserveBlocks, newB];
    setReserveBlocks(next);
    localStorage.setItem('reserve_lite_blocks', JSON.stringify(next));
    if(next.length===1) setActiveBlockId(newB.id);
  };

  const handleBlockEdit = (id: string, b: Partial<ReserveBlock>) => {
    const next = reserveBlocks.map(blk => blk.id === id ? { ...blk, ...b } : blk);
    setReserveBlocks(next);
    localStorage.setItem('reserve_lite_blocks', JSON.stringify(next));
  };

  const handleBlockDelete = (id: string) => {
    const next = reserveBlocks.filter(b => b.id !== id);
    setReserveBlocks(next);
    localStorage.setItem('reserve_lite_blocks', JSON.stringify(next));
    if(activeBlockId === id) setActiveBlockId(next[0]?.id || null);
  };

  // --- REFRESH ---
  const handleGlobalRefresh = async () => {
    setLoading(true);
    let allFlights: FlightSegment[] = [];
    const sourceData = isEditMode && stagingData ? stagingData : scheduleData;

    Object.values(sourceData).forEach(airportRows => {
      airportRows.forEach(row => {
        row.options.forEach(opt => {
          if (opt.segments) opt.segments.forEach(s => { if(s.flight) allFlights.push(s); });
          if (opt.inbound) (Array.isArray(opt.inbound) ? opt.inbound : [opt.inbound]).forEach(s => { if(s.flight) allFlights.push(s); });
          if (opt.outbound) opt.outbound.forEach(s => { if(s.flight) allFlights.push(s); });
        });
      });
    });

    const uniqueFlights = [...new Set(allFlights.map(f => f.flight))].map(fNum => {
      return allFlights.find(obj => obj.flight === fNum);
    }).filter((f): f is FlightSegment => !!f);

    const newStatuses = { ...flightStatuses };
    const flightsToFetch: FlightSegment[] = [];

    uniqueFlights.forEach(f => {
      const cached = FlightService.getCachedStatus(f.flight);
      if (cached) newStatuses[f.flight] = cached;
      else flightsToFetch.push(f);
    });

    if (flightsToFetch.length > 0) {
      const chunkSize = 15;
      const today = new Date().toISOString().split('T')[0] || '';
      for (let i = 0; i < flightsToFetch.length; i += chunkSize) {
        const batch = flightsToFetch.slice(i, i + chunkSize);
        const apiResults = await FlightService.fetchStatuses(batch, today);
        if (apiResults) {
          apiResults.forEach((res) => {
            if (res.legs && res.legs.length > 0) {
              const leg = res.legs[0];
              if (leg) {
                const key = `${leg.carrierCodeIATA}${leg.aircraftIdentification.flightNumber}`;
                FlightService.setCachedStatus(key, leg);
                newStatuses[key] = leg;
              }
            }
          });
        }
      }
    }

    setFlightStatuses(newStatuses);
    setLoading(false);
  };

  const handleLogout = () => { AuthService.logout(); setUser(null); };

  const handleResetData = () => {
    if(window.confirm('Are you sure you want to reset the app? All manual changes will be lost and original data will be restored.')) {
      localStorage.removeItem('reserve_lite_data_v2');
      localStorage.removeItem('flight_status_cache');
      window.location.reload();
    }
  };

  // --- RENDERING ---

  const activeData = (isEditMode && stagingData) ? stagingData : scheduleData;

  let timelineRows: TimelineRowData[] = [];
  const activeBlock = reserveBlocks.find(b => b.id === activeBlockId);

  if (activeBlock) {
    const sDate = activeBlock.start.split('T')[0] || '';
    const eDate = activeBlock.end.split('T')[0] || '';
    if (sDate && eDate) {
      timelineRows = generateTimeline(sDate, eDate, config);

      timelineRows.forEach(row => {
        const storedRow = activeData[airport]?.find((r: RowData) => r.key === row.key);
        if (storedRow) row.options = storedRow.options;
      });
    }
  }

  if (!user) return <LoginScreen onLogin={setUser} />;

  return (
    <div className={`min-h-screen font-sans text-gray-900 pb-20 ${isEditMode ? 'bg-gray-100' : 'bg-white'}`}>

      {/* Header */}
      <div className={`sticky top-0 z-30 border-b shadow-sm transition-colors ${isEditMode ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
        {isEditMode && (
          <div className="bg-yellow-400 text-yellow-900 text-xs font-bold text-center py-0.5">
            EDITING MODE — Unsaved Changes
          </div>
        )}
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 text-white p-1 rounded"><Plane size={16}/></div>
              <span className="font-bold text-sm tracking-tight hidden sm:inline">Reserve<span className="text-indigo-600">Lite</span></span>
              <div className="h-4 w-px bg-gray-300 mx-2"></div>
              <div className="flex bg-gray-100 p-0.5 rounded-lg">
                {['LAX', 'ONT', 'SNA', 'BUR'].map((code) => (
                  <button key={code} onClick={() => setAirport(code)}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${airport === code ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {code}
                  </button>
                ))}
              </div>
            </div>

            {activeBlock && (
              <button
                onClick={() => setModals({...modals, blocks: true})}
                className="flex flex-col items-center hover:bg-gray-50 px-2 rounded transition-colors group"
              >
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide group-hover:text-indigo-500">Active Block</span>
                <span className="text-xs font-bold text-indigo-600">
                        {new Date(activeBlock.start).toLocaleDateString(undefined, {month:'short', day:'numeric'})} - {new Date(activeBlock.end).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                    </span>
              </button>
            )}

            <div className="flex items-center gap-2">
              {!isEditMode ? (
                <>
                  <button onClick={enterEditMode} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full font-bold text-xs hover:bg-blue-100 transition-colors">
                    <Edit3 size={14} /> Edit Plan
                  </button>
                  <div className="h-4 w-px bg-gray-300 mx-1"></div>
                  <button onClick={handleGlobalRefresh} className={`p-2 rounded-full hover:bg-gray-100 text-gray-500 ${loading ? 'animate-spin' : ''}`} title="Refresh All Flights">
                    <RefreshCw size={16} />
                  </button>
                  <button onClick={handleResetData} className="p-2 rounded-full hover:bg-gray-100 text-gray-500" title="Reset Data">
                    <X size={16} />
                  </button>
                  <button onClick={() => setModals({...modals, config: true})} className="p-2 text-gray-400 hover:text-gray-600"><Settings size={16}/></button>
                  <button onClick={() => setModals({...modals, blocks: true})} className="p-2 text-gray-400 hover:text-gray-600"><Calendar size={16}/></button>
                </>
              ) : (
                <>
                  <button onClick={handleUndo} disabled={history.length===0} className="p-2 text-gray-500 disabled:opacity-30 hover:bg-gray-200 rounded-full"><Undo size={16}/></button>
                  <button onClick={handleRedo} disabled={future.length===0} className="p-2 text-gray-500 disabled:opacity-30 hover:bg-gray-200 rounded-full"><Redo size={16}/></button>
                  <div className="h-4 w-px bg-gray-300 mx-1"></div>
                  <button onClick={() => setConfirmModal({ isOpen: true, type: 'discard' })} className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-600 rounded-full font-bold text-xs hover:bg-gray-300">
                    Discard
                  </button>
                  <button onClick={() => setConfirmModal({ isOpen: true, type: 'commit' })} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-full font-bold text-xs hover:bg-green-700 shadow-sm">
                    <Save size={14} /> Save
                  </button>
                </>
              )}
              <button onClick={handleLogout} className="p-2 rounded-full hover:bg-red-50 text-red-500 ml-2" title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto min-h-125 border-x border-gray-100 shadow-sm bg-white">
        {timelineRows.length > 0 ? timelineRows.map((row) => (
          <TimelineRow
            key={row.key}
            row={row}
            isEdit={isEditMode}
            onAddOption={handleAddOption}
            onDeleteOption={deleteOption}
            onEditOption={handleEditOption}
            onReorderOptions={reorderOptions}
            flightStatuses={flightStatuses}
          />
        )) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Calendar size={48} className="mb-4 text-gray-200" />
            <p>No active reserve block selected.</p>
            <button onClick={() => setModals({...modals, blocks: true})} className="mt-4 text-indigo-600 font-bold hover:underline">Add a Reserve Block</button>
          </div>
        )}
      </main>

      <EditOptionModal
        isOpen={modals.edit}
        onClose={() => setModals({...modals, edit: false})}
        onSave={saveOptionToStaging}
        initialOption={editContext ? editContext.option : null}
        dateContext={editContext ? editContext.dateContext : ''}
        config={config}
      />

      <ConfigModal
        isOpen={modals.config}
        onClose={() => setModals({...modals, config: false})}
        config={config}
        onSave={(c: Config) => { setConfig(c); localStorage.setItem('reserve_lite_config', JSON.stringify(c)); setModals({...modals, config: false}); }}
      />

      <BlockManager
        isOpen={modals.blocks}
        onClose={() => setModals({...modals, blocks: false})}
        blocks={reserveBlocks}
        activeId={activeBlockId}
        onSelect={setActiveBlockId}
        onAdd={handleBlockAdd}
        onEdit={handleBlockEdit}
        onDelete={handleBlockDelete}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.type === 'commit' ? 'Save Changes?' : 'Discard Changes?'}
        message={confirmModal.type === 'commit' ? 'This will overwrite your existing schedule. Are you sure?' : 'All unsaved changes in this session will be lost. Are you sure?'}
        onConfirm={confirmModal.type === 'commit' ? executeCommit : executeDiscard}
        onCancel={() => setConfirmModal({ isOpen: false, type: null })}
        confirmText={confirmModal.type === 'commit' ? 'Save' : 'Discard'}
        confirmColor={confirmModal.type === 'commit' ? 'bg-green-600' : 'bg-red-600'}
      />

    </div>
  );
}
