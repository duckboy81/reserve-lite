import React, { useState, useEffect } from "react";
import { Edit3, X, History, ChevronDown, Check, Plane } from "lucide-react";
import FlightInput from "../inputs/FlightInput";
import HubStrategyInputs from "./HubStrategyInputs";
import { RecentAirports } from "../../services/StorageService";
import { moveItem } from "../../utils/dateUtil";
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
  const [isHubConfirmed, setIsHubConfirmed] = useState(false);
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);

  const [strategy, setStrategy] = useState<"direct" | "hub">("direct");
  const [hub, setHub] = useState("");
  // Direct Segments
  const [segments, setSegments] = useState<FlightSegment[]>([]);
  // Hub Strategy Parts
  const [inbounds, setInbounds] = useState<FlightSegment[]>([]);
  const [outbounds, setOutbounds] = useState<FlightSegment[]>([]);
  const [recentHubs, setRecentHubs] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      let recents = RecentAirports.get().filter((h) => h !== activeBlockBase && h !== currentAirport);
      setRecentHubs(recents);
    }
  }, [isOpen, activeBlockBase, currentAirport]);

  useEffect(() => {
    const blankOptions = {
      flight: "",
      dep: "",
      arr: "",
      status: "",
    }

    // Helper to create a default inbound segment
    const defaultInbound = (hubCode: string = ""): FlightSegment => ({
      ...blankOptions,
      depAirport: config.homeBase,
      arrAirport: hubCode
    });

    // Helper to create a default outbound segment
    const defaultOutbound = (hubCode: string = ""): FlightSegment => ({
      ...blankOptions,
      depAirport: hubCode,
      arrAirport: config.reserveBase,
      isPrimary: true // TODO: Remove isPrimary usage
    });

    if (isOpen && initialOption) {
      if (initialOption.type === "hub-strategy") {
        setStrategy("hub");
        const currentHub = initialOption.hub || "";
        setHub(currentHub);
        setIsHubConfirmed(true);

        // Normalize inbound data
        let loadedInbounds = Array.isArray(initialOption.inbound)
          ? initialOption.inbound
          : initialOption.inbound
            ? [initialOption.inbound]
            : [];

        // Ensure at least one inbound exists
        if (loadedInbounds.length === 0) {
          loadedInbounds = [defaultInbound(currentHub)];
        }
        setInbounds(loadedInbounds);

        // Normalize outbound data
        let loadedOutbounds = initialOption.outbound || [];

        // Ensure at least one outbound exists
        if (loadedOutbounds.length === 0) {
          loadedOutbounds = [defaultOutbound(currentHub)];
        }
        setOutbounds(loadedOutbounds);

      } else {
        // Editing a Direct strategy, but pre-fill Hub data so it's ready if they switch
        setStrategy("direct");
        setSegments(initialOption.segments || []);

        // Reset/Init Hub fields so inputs appear if user toggles to "Hub"
        setHub("");
        setIsHubConfirmed(false);
        setInbounds([defaultInbound()]);
        setOutbounds([defaultOutbound()]);
      }
    } else if (isOpen) {
      // New Entry
      setStrategy("direct");
      setHub("");
      setIsHubConfirmed(false);
      setSegments([
        { flight: "", dep: "", arr: "", status: "", depAirport: config.homeBase, arrAirport: config.reserveBase },
      ]);
      // Always initialize with one empty slot for hub strategy
      setInbounds([defaultInbound()]);
      setOutbounds([defaultOutbound()]);
    }
  }, [isOpen, initialOption, config]);

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

  const handleSave = () => {
    let finalOpt: Option;
    if (strategy === "direct") {
      const cleanSegs = segments.filter((s) => s.flight);
      if (cleanSegs.length === 0) return;
      const last = cleanSegs[cleanSegs.length - 1];
      if (!last) return;
      finalOpt = {
        type: "direct",
        segments: cleanSegs,
        finalArr: last.arr,
      };
    } else {
      const cleanInbounds = inbounds.filter((i) => i.flight);
      const cleanOutbounds = outbounds.filter((o) => o.flight);

      if (cleanInbounds.length === 0 && cleanOutbounds.length === 0) return;

      const flaggedOut = cleanOutbounds.map((o, i) => ({ ...o, isPrimary: i === 0, isSecondary: i > 0 }));
      const hubLabel = hub || cleanInbounds[0]?.arrAirport || "HUB";

      finalOpt = {
        type: "hub-strategy",
        hub: hubLabel,
        inbound: cleanInbounds,
        outbound: flaggedOut,
      };
    }
    onSave(finalOpt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Edit3 size={18} /> {initialOption ? "Edit Strategy" : "Add New Strategy"}
          </h3>
          <button onClick={onClose}>
            <X size={20} className="text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 bg-gray-50/50 min-h-[400px]">
          {/* Main Control Bar */}
          <div className="flex flex-col mb-6">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Strategy Type</label>
            <div className="flex items-center justify-start">
              <div className="inline-flex items-center gap-3 w-full">
                {/* Main Input Group: Full width when Hub, otherwise inline */}
                <div className={`flex rounded-lg shadow-sm border border-slate-300 bg-white overflow-visible focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all relative z-10 ${strategy === "hub" ? "w-full" : "inline-flex"}`}>
                  <div className="flex divide-x divide-slate-200 shrink-0 rounded-l-lg">
                    <button
                      onClick={() => {
                        if (isHubConfirmed && strategy === "hub") return;
                        setStrategy("direct");
                        setIsHubConfirmed(false);
                      }}
                      disabled={isHubConfirmed && strategy === "hub"}
                      className={`px-4 py-2.5 text-sm font-medium transition-colors ${strategy === "direct"
                        ? "bg-indigo-50 text-indigo-700"
                        : isHubConfirmed
                          ? "text-slate-400 cursor-not-allowed bg-slate-50"
                          : "text-slate-600 hover:bg-slate-100 bg-slate-50"
                        } rounded-l-lg`}
                    >
                      Direct
                    </button>
                    <button
                      onClick={() => {
                        if (isHubConfirmed && strategy === "hub") return;
                        setStrategy("hub");
                        setIsHubConfirmed(false);
                      }}
                      disabled={isHubConfirmed && strategy === "hub"}
                      className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${strategy === "hub"
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-100 bg-slate-50"
                        } ${strategy === "direct" ? "rounded-r-lg" : ""}`}
                    >
                      Hub
                      {strategy === "hub" && !isHubConfirmed && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>}
                    </button>
                  </div>

                  <div
                    className={`flex items-center relative bg-white rounded-r-lg transition-all duration-300 ease-in-out ${strategy === "hub" ? "w-full opacity-100 overflow-visible" : "w-0 opacity-0 overflow-hidden"}`}
                  >
                    {strategy === "hub" && (
                      <div className="flex items-center py-1 pr-2 pl-3 w-full" style={{ minWidth: "230px" }}>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-slate-400 text-sm">via</span>
                          <input
                            type="text"
                            placeholder="CODE"
                            className={`w-12 bg-transparent border-none p-0 text-slate-800 placeholder-slate-300 focus:ring-0 font-semibold uppercase outline-none ${isHubConfirmed ? "cursor-default" : ""}`}
                            value={hub}
                            readOnly={isHubConfirmed}
                            onChange={(e) => handleHubChange(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && hub.length >= 3 && !isHubConfirmed && confirmHub()}
                          />
                        </div>

                        <div className="flex-1"></div>

                        {/* Recent Pills - Inline */}
                        {!isHubConfirmed && recentHubs.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mr-3 overflow-hidden h-7">
                            {recentHubs.slice(0, 3).map((h) => (
                              <div
                                key={h}
                                onClick={() => {
                                  confirmHub(h);
                                }}
                                className="group flex items-center bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-full px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-colors border border-transparent hover:border-indigo-100">
                                <span>{h}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    RecentAirports.remove(h);
                                    setRecentHubs(prev => prev.filter(x => x !== h));
                                  }}
                                  className="ml-1 text-slate-400 hover:text-red-500 rounded-full p-0.5 transition-all"
                                >
                                  <X size={8} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Dropdown Trigger */}
                        {!isHubConfirmed && (
                          <div className="relative ml-auto">
                            <button
                              onClick={() => setShowRecentDropdown(!showRecentDropdown)}
                              className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-2 py-1 rounded transition-colors whitespace-nowrap"
                            >
                              <History size={12} />
                              <ChevronDown size={12} className="ml-0.5" />
                            </button>

                            {/* The Dropdown */}
                            {showRecentDropdown && (
                              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-100 z-50 p-2 text-left">
                                <div className="text-[10px] text-slate-400 uppercase font-bold px-2 py-1 mb-1">Recent Hubs</div>
                                {recentHubs.length > 0 ? (
                                  <div className="grid grid-cols-4 gap-1">
                                    {recentHubs.slice(0, 12).map(h => (
                                      <button
                                        key={h}
                                        onClick={() => {
                                          setHub(h);
                                          setShowRecentDropdown(false);
                                        }}
                                        className="px-2 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded text-xs font-medium transition-colors"
                                      >
                                        {h}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-400 px-2 italic">No recent hubs</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* External Action Button (Check or Pencil) - Only for Hub */}
                {strategy === "hub" && (
                  <button
                    onClick={() => {
                      if (isHubConfirmed) {
                        setIsHubConfirmed(false); // Unlock
                      } else {
                        confirmHub();
                      }
                    }}
                    className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-colors shadow-sm ${isHubConfirmed
                      ? "bg-white text-slate-400 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200"
                      : (!hub || hub.length < 3)
                        ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                        : "bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700"
                      }`}
                    disabled={!isHubConfirmed && (!hub || hub.length < 3)}
                    title={isHubConfirmed ? "Edit Hub" : "Confirm Hub"}
                  >
                    {isHubConfirmed ? <Edit3 size={16} /> : <Check size={20} />}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            {strategy === "direct" ? (
              <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
                {segments.map((seg, i) => (
                  <FlightInput
                    key={i}
                    id={i}
                    value={seg}
                    onChange={(val) => {
                      const n = [...segments];
                      n[i] = val;
                      setSegments(n);
                    }}
                    showRemove={segments.length > 1}
                    onRemove={() => {
                      const n = segments.filter((_, idx) => idx !== i);
                      setSegments(n);
                    }}
                    onMoveUp={() => setSegments(moveItem(segments, i, i - 1))}
                    onMoveDown={() => setSegments(moveItem(segments, i, i + 1))}
                    isFirst={i === 0}
                    isLast={i === segments.length - 1}
                    config={config}
                    dateContext={dateContext}
                    isGuest={isGuest}
                  />
                ))}
                <button
                  onClick={() => setSegments([...segments, { flight: "", dep: "", arr: "", status: "" }])}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 font-bold hover:border-indigo-400 hover:text-indigo-500 transition-colors"
                >
                  + Add Connecting Leg
                </button>
              </div>
            ) : (
              <>
                {!isHubConfirmed && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center  rounded-xl bg-slate-50/50">
                    <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                      <Plane className="text-indigo-500 rotate-45" size={24} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 mb-1">Set Connection Hub</h3>
                    <p className="text-xs text-slate-500 max-w-[200px]">
                      Enter a 3-letter airport code above to configure your inbound and outbound flights.
                    </p>
                  </div>
                )}
                {isHubConfirmed && (
                  <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
                    <HubStrategyInputs
                      inbounds={inbounds}
                      setInbounds={setInbounds}
                      outbounds={outbounds}
                      setOutbounds={setOutbounds}
                      hub={hub}
                      config={config}
                      dateContext={dateContext}
                      isGuest={isGuest}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-white rounded-b-xl flex justify-end gap-2">
          <button onClick={onClose} className="px-5 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 shadow-lg transition-transform active:scale-95"
          >
            Save Strategy
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditOptionModal;
