import React, { useState, useEffect } from "react";
import { Search, PenTool, ArrowRight, Calendar, Car, Loader2 } from "lucide-react";
import { FlightService } from "../../services/FlightService";
import { AuthService } from "../../services/AuthService";

import { FlightSegment, Config, SearchResult } from "../../types";

interface FlightFormProps {
  initialSegment?: FlightSegment | null;
  onSave: (segment: FlightSegment) => void;
  onCancel: () => void;
  type: "inbound" | "outbound" | "direct";
  baseDate: string;
  hubAirport?: string;
  config: Config;
}

const FlightForm: React.FC<FlightFormProps> = ({
  initialSegment,
  onSave,
  // onCancel, // Prop exists but is unused

  type,
  baseDate,
  hubAirport,
  config,
}) => {
  const [mode, setMode] = useState<"search" | "manual">("manual");

  // Search State
  const [searchParams, setSearchParams] = useState({
    from: "",
    to: "",
    date: baseDate,
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ results: SearchResult[]; retrievedAt: number } | null>(null);

  // Manual Form State
  // We keep internal state for the form fields
  // Times are stored as ISO strings (YYYY-MM-DDTHH:mm) for datetime-local usage
  const [formData, setFormData] = useState({
    flight: "",
    org: "",
    dst: "",
    depGate: "",
    arrGate: "",
    dep: "", // ISO string
    arr: "", // ISO string
  });

  // Ground Transport State
  const [ground, setGround] = useState<{
    required: boolean;
    mode: string;
    durationH: string;
    durationM: string;
  }>({
    required: false,
    mode: "Car",
    durationH: "",
    durationM: "",
  });

  // Initialize Data
  useEffect(() => {
    // Determine default airports based on type
    let defOrg = "";
    let defDst = "";

    if (type === "inbound") {
      defDst = hubAirport || "";
      defOrg = config.homeBase;
    } else if (type === "outbound") {
      defOrg = hubAirport || "";
      defDst = config.reserveBase;
    } else {
      defOrg = config.homeBase;
      defDst = config.reserveBase;
    }

    if (initialSegment) {
      // Edit Mode
      setMode("manual");

      // Convert HH:mm to ISO date for inputs (heuristic: use baseDate)
      // Note: This is an approximation. If flight crosses midnight, we might need logic.
      // For now, we assume baseDate for departure.
      const now = new Date();
      const todayStr = now.toISOString().substring(0, 10);
      const d = baseDate || todayStr;

      // Logic to handle Day +1 would require more complex Segment data which we might not have fully
      // So we do best effort: combine date + time
      const depIso = initialSegment.dep ? `${d}T${initialSegment.dep}` : "";

      // Calculate Arrival Date (handle crossing midnight if arr < dep)
      let arrDate = d;
      if (initialSegment.arr && initialSegment.dep && initialSegment.arr < initialSegment.dep) {
        // Next day
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);
        arrDate = nextDay.toISOString().substring(0, 10);
      }
      const arrIso = initialSegment.arr ? `${arrDate}T${initialSegment.arr}` : "";

      setFormData({
        flight: initialSegment.flight || "",
        org: initialSegment.depAirport || defOrg,
        dst: initialSegment.arrAirport || defDst,
        depGate: "", // Segment doesn't currently store gates? Types says 'status' but maybe not gate? 'status' might hold it or we lack the field.
        // Checked types: FlightSegment doesn't have gate. SearchResult does.
        // We will just leave it as UI state. If types don't support it, it won't save.
        arrGate: "",
        dep: depIso,
        arr: arrIso,
      });

      if (initialSegment.ground) {
        // Duration is string like "1.5" or "2.0"? Need to parse to H/M
        const dur = parseFloat(initialSegment.ground.duration || "0");
        const h = Math.floor(dur);
        const m = Math.round((dur - h) * 60);

        setGround({
          required: true,
          mode: initialSegment.ground.mode || "Car",
          durationH: h.toString(),
          durationM: m.toString(),
        });
      }

      setSearchParams({
        from: initialSegment.depAirport || defOrg,
        to: initialSegment.arrAirport || defDst,
        date: baseDate,
      });
    } else {
      // Add Mode
      setMode(AuthService.isGuest() ? "manual" : "search");
      setSearchParams({ from: defOrg, to: defDst, date: baseDate });
      // Also init formData
      setFormData((prev) => ({ ...prev, org: defOrg, dst: defDst }));
    }
  }, [initialSegment, type, hubAirport, config, baseDate]);

  // Search Logic
  const handleSearch = async (forceRefresh = false) => {
    setIsSearching(true);
    try {
      const res = await FlightService.searchFlights(
        searchParams.from,
        searchParams.to,
        searchParams.date,
        forceRefresh,
      );
      setSearchResults({ results: res.flights || [], retrievedAt: res.retrievedAt }); // Correct structure
    } catch (e) {
      console.error(e);
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (res: SearchResult) => {
    const leg = res.legs[0];
    if (!leg) return;

    const depDate = leg.departure.scheduledDate; // "YYYY-MM-DDTHH:mm:00"
    const arrDate = leg.arrival.scheduledDate; // "YYYY-MM-DDTHH:mm:00"

    const newForm = {
      flight: `${leg.carrierCodeIATA}${leg.aircraftIdentification.flightNumber}`,
      org: leg.departureAirportCode,
      dst: leg.arrivalAirportCode,
      depGate: leg.departure.gate || "",
      arrGate: leg.arrival.gate || "",
      dep: depDate.substring(0, 16),
      arr: arrDate.substring(0, 16),
    };

    setFormData(newForm);
    setMode("manual");

    // Auto-detect ground
    if (type === "inbound" && leg.arrivalAirportCode !== hubAirport) {
      checkGroundLogic(leg.arrivalAirportCode);
    }
  };

  const checkGroundLogic = (dst: string) => {
    // Rule: If destination is NOT the target (Hub or ReserveBase), assume ground needed?
    // Or just if dst is not the implicit 'arrival' point.
    // For inbound, we expect to arrive at 'hubAirport'.
    // For outbound, we expect to arrive at 'reserveBase'.

    // But let's simplify based on prototype: "If validation checks if this is not the hub".
    // Let's just leave it to user or manual toggle, or simple heuristic.
    // If type is inbound and dst != hubAirport -> Ground
    if (type === "inbound" && hubAirport && dst !== hubAirport) {
      setGround((prev) => ({ ...prev, required: true }));
    }
  };

  // Helper for Pretty Date Display
  const toPrettyDate = (isoStr: string) => {
    if (!isoStr) return "Select Date";
    const d = new Date(isoStr);
    return (
      d.toLocaleDateString("en-US", { day: "numeric", month: "short" }) +
      ", " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
    );
  };

  // Helper for relative time
  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins === 1) return "1 min ago";
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    if (hours === 1) return "1 hr ago";
    return `${hours} hrs ago`;
  };

  const handleSave = () => {
    // Validate
    if (!formData.flight || !formData.dep || !formData.arr) return;

    // Convert ISO dates back to HH:mm for legacy Segment type
    // And check for date crossing logic to maybe set 'status' or metadata?
    // Legacy type only has 'dep' (string HH:mm) and 'arr' (string HH:mm).
    // We lose the date part in the legacy type.

    const depTime = formData.dep.substring(11, 16);
    const arrTime = formData.arr.substring(11, 16);

    const segment: FlightSegment = {
      flight: formData.flight,
      dep: depTime,
      arr: arrTime,
      depAirport: formData.org,
      arrAirport: formData.dst,
      status: "", // Gate could go here? e.g. "G:A12"
    };

    if (ground.required) {
      const hours = parseInt(ground.durationH || "0") + parseInt(ground.durationM || "0") / 60;
      segment.ground = {
        mode: ground.mode,
        duration: hours.toFixed(1),
        hub: formData.dst, // The airport we landed at before ground transport
      };
    } else {
      segment.ground = null; // Clear if not required
    }

    onSave(segment);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden">
      {/* Tab Switcher */}
      <div className="px-6 py-4 border-b border-slate-100 bg-white z-10">
        <div className="flex p-1 bg-slate-100 rounded-lg">
          <div className="flex-1 relative group">
            <button
              onClick={() => {
                if (AuthService.isGuest()) return;
                setMode("search");
              }}
              disabled={AuthService.isGuest()}
              className={`w-full py-1.5 text-sm font-bold rounded-md transition-all flex justify-center items-center gap-2
                                ${mode === "search" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}
                                ${AuthService.isGuest() ? "opacity-50 cursor-not-allowed" : ""}
                            `}
            >
              <Search className="w-3 h-3" /> Search
            </button>
            {AuthService.isGuest() && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Login required to search flights
              </div>
            )}
          </div>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all flex justify-center items-center gap-2 ${mode === "manual" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <PenTool className="w-3 h-3" /> Details
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {mode === "search" ? (
          <div className="space-y-4">
            {/* Search Form */}
            <div className={`${searchResults ? "hidden" : "block"} space-y-4`}>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    From
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    className="w-full font-bold text-xl border-b-2 border-slate-200 focus:border-indigo-600 outline-none py-1 uppercase bg-transparent placeholder-slate-300 transition-colors"
                    placeholder="ORG"
                    value={searchParams.from}
                    onChange={(e) => setSearchParams({ ...searchParams, from: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="pb-3 text-slate-300">
                  <ArrowRight className="w-5 h-5" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">To</label>
                  <input
                    type="text"
                    maxLength={3}
                    className="w-full font-bold text-xl border-b-2 border-slate-200 focus:border-indigo-600 outline-none py-1 uppercase bg-transparent placeholder-slate-300 transition-colors"
                    placeholder="DST"
                    value={searchParams.to}
                    onChange={(e) => setSearchParams({ ...searchParams, to: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date</label>
                <input
                  type="date"
                  className="w-full border rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-600 outline-none border-slate-200 text-slate-700"
                  value={searchParams.date}
                  onChange={(e) => setSearchParams({ ...searchParams, date: e.target.value })}
                />
              </div>
              <div className="pt-2">
                <button
                  onClick={() => handleSearch(false)}
                  disabled={isSearching}
                  className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all flex justify-center gap-2 items-center"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search Flights"}
                </button>
              </div>
            </div>

            {/* Results */}
            {searchResults && (
              <div className="mt-0">
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-slate-800">
                      {searchParams.from} <span className="text-slate-400">→</span> {searchParams.to}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">
                      {new Date(searchParams.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <button
                    onClick={() => setSearchResults(null)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Edit
                  </button>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase text-left">
                    Results found ({searchResults?.results.length || 0})
                  </h4>
                  <div className="flex items-center gap-2">
                    {searchResults && (
                      <span className="text-[10px] font-medium text-slate-400">
                        Updated {getRelativeTime(searchResults.retrievedAt)}
                      </span>
                    )}
                    <button
                      onClick={() => handleSearch(true)}
                      disabled={isSearching}
                      className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded-full hover:bg-slate-100"
                      title="Refresh results"
                    >
                      <Loader2 className={`w-3.5 h-3.5 ${isSearching ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {searchResults.results.map((res, i) => {
                    const leg = res.legs[0];
                    if (!leg) return null;
                    const dep = new Date(leg.departure.scheduledDate);
                    const arr = new Date(leg.arrival.scheduledDate);
                    const isNextDay = arr.getDate() !== dep.getDate();

                    return (
                      <button
                        key={i}
                        onClick={() => selectSearchResult(res)}
                        className="w-full bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between hover:border-indigo-300 hover:shadow-md transition-all group text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-50 text-indigo-600 text-[10px] font-bold w-8 h-8 rounded flex items-center justify-center">
                            {leg.carrierCodeIATA}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-sm relative">
                              {dep.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })} -{" "}
                              {arr.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                              {isNextDay && (
                                <span className="text-[0.6em] text-indigo-500 font-bold ml-0.5 -mt-1.5 absolute">
                                  +1
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1.5">
                              <span>
                                {leg.carrierCodeIATA} {leg.aircraftIdentification.flightNumber}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                              <span>{leg.departure.gate || "--"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-slate-50 text-slate-400 px-2 py-1 rounded text-xs font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          Select
                        </div>
                      </button>
                    );
                  })}
                  {searchResults.results.length === 0 && (
                    <div className="text-center text-slate-400 text-sm py-8">No flights found.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* DETAILS FORM */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Flight Number
              </label>
              <input
                type="text"
                className="w-full border rounded-lg p-2 text-sm font-bold uppercase font-mono focus:ring-2 focus:ring-indigo-600 outline-none border-slate-200"
                placeholder="DL123"
                maxLength={6}
                value={formData.flight}
                onChange={(e) => setFormData({ ...formData, flight: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Origin
                </label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2 text-sm font-bold uppercase focus:ring-2 focus:ring-indigo-600 outline-none border-slate-200"
                  placeholder="ATL"
                  maxLength={3}
                  value={formData.org}
                  onChange={(e) => setFormData({ ...formData, org: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Dest</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2 text-sm font-bold uppercase focus:ring-2 focus:ring-indigo-600 outline-none border-slate-200"
                  placeholder="LAX"
                  maxLength={3}
                  value={formData.dst}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setFormData({ ...formData, dst: val });
                    if (val.length === 3) checkGroundLogic(val);
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Dep Gate
                </label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2 text-sm font-bold uppercase focus:ring-2 focus:ring-indigo-600 outline-none border-slate-200"
                  placeholder="--"
                  maxLength={4}
                  value={formData.depGate}
                  onChange={(e) => setFormData({ ...formData, depGate: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Arr Gate
                </label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2 text-sm font-bold uppercase focus:ring-2 focus:ring-indigo-600 outline-none border-slate-200"
                  placeholder="--"
                  maxLength={4}
                  value={formData.arrGate}
                  onChange={(e) => setFormData({ ...formData, arrGate: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Departure
                  </label>
                  <div className="relative group text-left">
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                      <Calendar className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-600 outline-none border-slate-200 text-slate-700 font-medium bg-white"
                      readOnly
                      value={toPrettyDate(formData.dep)}
                    />
                    <input
                      type="datetime-local"
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                      value={formData.dep}
                      onChange={(e) => setFormData({ ...formData, dep: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Arrival
                  </label>
                  <div className="relative group text-left">
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                      <Calendar className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-600 outline-none border-slate-200 text-slate-700 font-medium bg-white"
                      readOnly
                      value={toPrettyDate(formData.arr)}
                    />
                    <input
                      type="datetime-local"
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                      value={formData.arr}
                      onChange={(e) => setFormData({ ...formData, arr: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ground Transport */}
            <div className="border-t border-slate-100 pt-4 mt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-2">
                  <Car className="w-4 h-4 text-slate-400" /> Ground Transportation
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={ground.required}
                    onChange={(e) => setGround({ ...ground, required: e.target.checked })}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {ground.required && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-200 pt-1">
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Mode
                        </label>
                        <select
                          className="w-full border rounded-lg p-2 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-600 outline-none border-indigo-200 text-slate-700"
                          value={ground.mode}
                          onChange={(e) => setGround({ ...ground, mode: e.target.value })}
                        >
                          <option value="Car">Uber/Lyft</option>
                          <option value="Car">Rental Car</option>
                          <option value="Train">Train</option>
                          <option value="Shuttle">Shuttle</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-full">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Hrs
                          </label>
                          <input
                            type="number"
                            className="w-full border rounded-lg p-2 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-600 outline-none border-indigo-200 text-slate-700"
                            value={ground.durationH}
                            onChange={(e) => setGround({ ...ground, durationH: e.target.value })}
                          />
                        </div>
                        <div className="w-full">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Min
                          </label>
                          <input
                            type="number"
                            className="w-full border rounded-lg p-2 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-600 outline-none border-indigo-200 text-slate-700"
                            value={ground.durationM}
                            onChange={(e) => setGround({ ...ground, durationM: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}

      {mode === "manual" && (
        <div className="p-4 border-t border-slate-100 bg-white flex gap-3">
          {initialSegment && (
            <button className="hidden w-1/3 bg-white border border-red-200 text-red-600 font-bold py-3 rounded-xl shadow-sm hover:bg-red-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-slate-700 active:scale-[0.98] transition-all"
          >
            Save Flight
          </button>
        </div>
      )}
    </div>
  );
};

export default FlightForm;
