import React, { useState, useEffect } from "react";
import { Edit3, X, History, ChevronDown, Check, Plane, ArrowRight, PlaneTakeoff, PlaneLanding, Plus, Trash2, Car } from "lucide-react";
import FlightForm from "./FlightForm";
import { RecentAirports } from "../../services/StorageService";
import { Option, Config, FlightSegment } from "../../types";

interface EditOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (option: Option) => void;
  initialOption: Option | null;
  dateContext: string;
  config: Config;
  isGuest?: boolean;
  activeBlockBase?: string | undefined;
  currentAirport?: string | undefined;
}

// Helper to calculate duration between "HH:mm" strings
// Helper to calculate duration between "HH:mm" strings
const calculateDuration = (startStr: string, endStr: string) => {
  if (!startStr || !endStr) return "--";
  const startParts = startStr.split(':').map(Number);
  const endParts = endStr.split(':').map(Number);

  if (startParts.length !== 2 || endParts.length !== 2) return "--";

  const [sh, sm] = startParts;
  const [eh, em] = endParts;

  if (sh === undefined || sm === undefined || eh === undefined || em === undefined) return "--";

  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;

  if (endMins < startMins) endMins += 24 * 60; // Handle Next day arrival

  const diff = endMins - startMins;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
};

const EditOptionModal: React.FC<EditOptionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialOption,
  dateContext,
  config,
  isGuest = false,
  activeBlockBase,
  currentAirport,
}) => {
  // Main State
  const [strategy, setStrategy] = useState<"direct" | "hub">("direct");
  const [isHubConfirmed, setIsHubConfirmed] = useState(false);
  const [hub, setHub] = useState("");
  const [recentHubs, setRecentHubs] = useState<string[]>([]);
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);

  // Flight Data State
  const [segments, setSegments] = useState<FlightSegment[]>([]); // For Direct
  const [inbounds, setInbounds] = useState<FlightSegment[]>([]); // For Hub
  const [outbounds, setOutbounds] = useState<FlightSegment[]>([]); // For Hub

  // Editing State (for switching to FlightForm)
  // type: 'inbound' | 'outbound' | 'direct'
  // index: number (if editing existing) or -1 (if adding new)
  const [editingState, setEditingState] = useState<{ type: 'inbound' | 'outbound' | 'direct', index: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      let recents = RecentAirports.get().filter((h) => h !== activeBlockBase && h !== currentAirport);
      setRecentHubs(recents);
    }
  }, [isOpen, activeBlockBase, currentAirport]);

  useEffect(() => {
    if (isOpen && initialOption) {
      if (initialOption.type === "hub-strategy") {
        setStrategy("hub");
        const currentHub = initialOption.hub || "";
        setHub(currentHub);
        setIsHubConfirmed(!!currentHub);
        setInbounds(initialOption.inbound || []);
        setOutbounds(initialOption.outbound || []);
        setSegments([]);
      } else {
        setStrategy("direct");
        setSegments(initialOption.segments || []);
        setHub("");
        setIsHubConfirmed(false);
        setInbounds([]);
        setOutbounds([]);
      }
    } else if (isOpen) {
      // New Entry
      setStrategy("direct");
      setHub("");
      setIsHubConfirmed(false);
      setSegments([]);
      setInbounds([]);
      setOutbounds([]);
    }
  }, [isOpen, initialOption]);

  const handleHubChange = (val: string) => {
    setHub(val);
  };

  const confirmHub = (val?: string) => {
    const hubToSet = val || hub;
    if (!hubToSet || hubToSet.length < 3) return;

    setHub(hubToSet);
    RecentAirports.add(hubToSet.toUpperCase());
    setIsHubConfirmed(true);
  };

  const saveFlight = (segment: FlightSegment) => {
    if (!editingState) return;
    const { type, index } = editingState;

    if (type === 'direct') {
      const newSegs = [...segments];
      if (index === -1) newSegs.push(segment);
      else newSegs[index] = segment;
      setSegments(newSegs);
    } else if (type === 'inbound') {
      const newSegs = [...inbounds];
      if (index === -1) newSegs.push(segment);
      else newSegs[index] = segment;
      setInbounds(newSegs);
    } else if (type === 'outbound') {
      const newSegs = [...outbounds];
      if (index === -1) newSegs.push(segment);
      else newSegs[index] = segment;
      setOutbounds(newSegs);
    }
    setEditingState(null); // Close Form
  };

  const deleteFlight = (type: 'inbound' | 'outbound' | 'direct', index: number) => {
    if (type === 'direct') {
      setSegments(segments.filter((_, i) => i !== index));
    } else if (type === 'inbound') {
      setInbounds(inbounds.filter((_, i) => i !== index));
    } else if (type === 'outbound') {
      setOutbounds(outbounds.filter((_, i) => i !== index));
    }
  };

  const handleFinalSave = () => {
    let finalOpt: Option;

    if (strategy === "direct") {
      if (segments.length === 0) return; // TODO: Show error?
      const last = segments[segments.length - 1];
      finalOpt = {
        type: "direct",
        segments: segments,
        finalArr: last.arr
      };
    } else {
      if (inbounds.length === 0 && outbounds.length === 0) return;

      const flaggedOut = outbounds.map((o, i) => ({ ...o, isPrimary: i === 0, isSecondary: i > 0 }));
      const hubLabel = hub || (inbounds.length > 0 ? inbounds[0].arrAirport : "HUB");

      finalOpt = {
        type: "hub-strategy",
        hub: hubLabel,
        inbound: inbounds,
        outbound: flaggedOut
      };
    }
    onSave(finalOpt);
  };

  // Render Functions
  const renderFlightCard = (fl: FlightSegment, index: number, type: 'inbound' | 'outbound' | 'direct') => {
    const isStandard = false; // Logic to hide route if standard? 
    // Superscript logic: simplistic for now (if arr time < dep time, assume +1)
    const isNextDay = fl.arr < fl.dep;

    // Ground Logic for specific Outbound visualization (Pills/Lines)
    // Note: redesign.md puts ground transport as a separate visual block in the same card
    let groundHTML = null;
    if (fl.ground) {
      groundHTML = (
        <div className="border-l border-slate-100 pl-3 ml-1 flex flex-col justify-center">
          <div className="flex flex-col items-center">
            <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
              <span className="text-indigo-500 bg-indigo-50 px-1 rounded flex items-center gap-1"><Car size={8} /> {fl.ground.mode}</span>
              <span>{fl.ground.duration}h</span>
            </div>
          </div>
        </div>
      );
    }

    // Inbound/Outbound specific styles
    const barColor = type === 'inbound' ? 'bg-blue-500' : (type === 'outbound' ? 'bg-indigo-500' : 'bg-emerald-500');
    const hoverBorder = type === 'inbound' ? 'hover:border-blue-300' : (type === 'outbound' ? 'hover:border-indigo-300' : 'hover:border-emerald-300');

    // Layover Pills (Only for Outbound in Hub mode, relating to Inbound arrival)
    // Logic: Calculate time from LAST Inbound Arrival to THIS Outbound Departure
    let layoverPill = null;
    if (type === 'outbound' && inbounds.length > 0) {
      const lastInbound = inbounds[inbounds.length - 1];
      if (lastInbound) {
        const layover = calculateDuration(lastInbound.arr, fl.dep);
        layoverPill = (
          <div className="absolute -bottom-2.5 left-4 flex gap-1 z-20">
            <div className="bg-white border border-slate-200 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> {layover}
            </div>
          </div>
        );
      }
    }

    return (
      <div key={index} className="relative mb-4">
        <div
          className={`group relative bg-white border border-slate-200 rounded-lg shadow-sm ${hoverBorder} transition-all cursor-pointer pl-3 overflow-visible`}
          onClick={() => setEditingState({ type, index })}
        >
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${barColor} rounded-l-lg`}></div>
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="font-mono text-sm font-bold text-slate-800 w-12 flex flex-col">
                  <span className="text-xs text-slate-800 font-bold">{fl.flight}</span>
                </div>

                <div className="flex items-center">
                  {/* Dep */}
                  <div className="flex flex-col items-center w-14">
                    <div className="text-sm font-bold text-slate-700 relative">
                      {fl.dep}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400">{fl.depAirport || "ORG"}</div>
                  </div>

                  {/* Arrow */}
                  <div className="flex flex-col items-center w-12 text-slate-300">
                    <ArrowRight size={12} />
                  </div>

                  {/* Arr */}
                  <div className="flex flex-col items-center w-14">
                    <div className="text-sm font-bold text-slate-700 relative">
                      {fl.arr}
                      {isNextDay && <span className="absolute text-[0.6em] text-indigo-500 font-bold ml-0.5 -mt-1.5">+1</span>}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400">{fl.arrAirport || "DST"}</div>
                  </div>

                  {groundHTML}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); deleteFlight(type, index); }}
                  className="text-slate-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
                <button className="text-slate-300 hover:text-indigo-600 p-2"><Edit3 size={14} /></button>
              </div>
            </div>
          </div>
          {layoverPill}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-xl z-20">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Edit3 size={18} /> {initialOption ? "Edit Strategy" : "New Strategy"}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Editing Overlay (FlightForm) */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 min-h-0">
          {/* Strategy Selector */}
          {/* ... content ... */}

          <div className="flex flex-col mb-6">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Strategy Type</label>
            <div className="flex items-center justify-start">
              <div className="inline-flex items-center gap-3 w-full">
                <div className={`flex rounded-lg shadow-sm border border-slate-300 bg-white overflow-visible transition-all relative z-10 ${strategy === "hub" ? "w-full" : "inline-flex"}`}>
                  <div className="flex divide-x divide-slate-200 shrink-0 rounded-l-lg">
                    <button
                      onClick={() => {
                        setStrategy("direct");
                        setIsHubConfirmed(false);
                      }}
                      className={`px-4 py-2.5 text-sm font-bold transition-colors ${strategy === "direct" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 bg-white"} rounded-l-lg`}
                    >
                      Direct
                    </button>
                    <button
                      onClick={() => {
                        setStrategy("hub");
                      }}
                      className={`px-4 py-2.5 text-sm font-bold transition-colors relative ${strategy === "hub" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 bg-white"} ${strategy === "direct" ? "rounded-r-lg" : ""}`}
                    >
                      Hub
                    </button>
                  </div>

                  {strategy === "hub" && (
                    <div className="flex items-center py-1 pr-2 pl-3 w-full animate-in fade-in duration-300" style={{ minWidth: "230px" }}>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 text-sm font-mono">via</span>
                        <input
                          type="text"
                          placeholder="HUB"
                          className="w-12 bg-transparent border-none p-0 text-slate-800 placeholder-slate-300 focus:ring-0 font-bold font-mono text-lg uppercase outline-none"
                          value={hub}
                          onChange={(e) => handleHubChange(e.target.value.toUpperCase())}
                          onBlur={() => confirmHub()}
                          onKeyDown={(e) => e.key === 'Enter' && confirmHub()}
                        />
                      </div>
                      <div className="flex-1"></div>

                      {/* Recent Hubs Dropdown Trigger */}
                      <div className="relative">
                        <button onClick={() => setShowRecentDropdown(!showRecentDropdown)} className="text-slate-400 hover:text-indigo-600 p-1"><History size={14} /></button>
                        {showRecentDropdown && (
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded shadow-xl border border-slate-100 p-2 z-50">
                            <div className="text-[10px] text-slate-400 font-bold mb-1">RECENT</div>
                            {recentHubs.map(h => (
                              <button key={h} onClick={() => { setHub(h); confirmHub(h); setShowRecentDropdown(false); }} className="block w-full text-left px-2 py-1 text-sm text-slate-600 hover:bg-slate-50 rounded font-bold">{h}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* FLIGHT LISTS */}
          <div className="space-y-6">
            {strategy === 'direct' ? (
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Plane size={12} className="text-emerald-500" /> Direct Segments
                  </label>
                  <button onClick={() => setEditingState({ type: 'direct', index: -1 })} className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1.5 rounded hover:bg-emerald-100 transition-colors flex items-center gap-1">
                    <Plus size={12} /> Add Leg
                  </button>
                </div>
                <div className="space-y-3">
                  {segments.map((seg, i) => renderFlightCard(seg, i, 'direct'))}
                  {segments.length === 0 && (
                    <div onClick={() => setEditingState({ type: 'direct', index: -1 })} className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-emerald-300 hover:text-emerald-600 transition-all">
                      <Plus size={24} className="mb-2" />
                      <span className="text-xs font-bold">Add Flight Segment</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {(!hub || hub.length < 3) ? (
                  <div className="text-center py-12 opacity-50">
                    <div className="inline-block p-4 bg-slate-100 rounded-full mb-3"><Plane size={24} className="text-slate-400" /></div>
                    <div className="font-bold text-slate-500">Select a Hub Airport</div>
                    <div className="text-xs text-slate-400">Enter a 3-letter code above to begin</div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Inbound */}
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <PlaneLanding size={12} className="text-blue-500" /> Inbound • To {hub}
                        </label>
                        <button onClick={() => setEditingState({ type: 'inbound', index: -1 })} className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1.5 rounded hover:bg-blue-100 transition-colors flex items-center gap-1">
                          <Plus size={12} /> Add
                        </button>
                      </div>
                      <div className="space-y-3">
                        {inbounds.map((seg, i) => renderFlightCard(seg, i, 'inbound'))}
                        {inbounds.length === 0 && (
                          <div onClick={() => setEditingState({ type: 'inbound', index: -1 })} className="border-2 border-dashed border-slate-200 rounded-lg p-4 flex items-center justify-center text-slate-400 cursor-pointer hover:border-blue-300 hover:text-blue-600 transition-all">
                            <span className="text-xs font-bold flex items-center gap-1"><Plus size={12} /> Add Inbound Flight</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Outbound */}
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <PlaneTakeoff size={12} className="text-indigo-500" /> Outbound • From {hub}
                        </label>
                        <button onClick={() => setEditingState({ type: 'outbound', index: -1 })} className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-1.5 rounded hover:bg-indigo-100 transition-colors flex items-center gap-1">
                          <Plus size={12} /> Add
                        </button>
                      </div>
                      <div className="space-y-3">
                        {outbounds.map((seg, i) => renderFlightCard(seg, i, 'outbound'))}
                        {outbounds.length === 0 && (
                          <div onClick={() => setEditingState({ type: 'outbound', index: -1 })} className="border-2 border-dashed border-slate-200 rounded-lg p-4 flex items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-300 hover:text-indigo-600 transition-all">
                            <span className="text-xs font-bold flex items-center gap-1"><Plus size={12} /> Add Outbound Flight</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        {!editingState && (
          <div className="p-4 border-t bg-white rounded-b-xl flex justify-end gap-2 shrink-0 z-20">
            <button onClick={onClose} className="px-5 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              onClick={handleFinalSave}
              className="px-6 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 shadow-lg transition-transform active:scale-95"
            >
              Save Strategy
            </button>
          </div>
        )}
      </div>


      {/* FlightForm Modal Layer (Stacked) */}
      {
        editingState && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-[1px] animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h4 className="font-bold text-sm text-slate-500 uppercase flex items-center gap-2">
                  {editingState.index === -1 ? <Plus size={16} /> : <Edit3 size={16} />}
                  {editingState.index === -1 ? 'Add' : 'Edit'} {editingState.type} Flight
                </h4>
                <button onClick={() => setEditingState(null)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <FlightForm
                  initialSegment={
                    editingState.index !== -1
                      ? (editingState.type === 'direct' ? segments[editingState.index] : (editingState.type === 'inbound' ? inbounds[editingState.index] : outbounds[editingState.index])) || null
                      : null
                  }
                  onSave={saveFlight}
                  onCancel={() => setEditingState(null)}
                  type={editingState.type}
                  baseDate={dateContext}
                  hubAirport={hub}
                  config={config}
                />
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default EditOptionModal;
