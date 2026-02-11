import React, { useState, useEffect } from "react";
import { ArrowUp, ArrowDown, Search, X } from "lucide-react";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { FlightService } from "../../services/FlightService";
import { RecentAirports } from "../../services/StorageService";
import { FlightSegment, Config, SearchResult } from "../../types";
import RecentAirportsDropdown from "./RecentAirportsDropdown";

interface FlightInputProps {
  id: number;
  value: FlightSegment;
  onChange: (value: FlightSegment) => void;
  onRemove: () => void;
  showRemove: boolean;
  config: Config;
  dateContext: string;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  defaultSearchFrom?: string;
  defaultSearchTo?: string;
  allowGround?: boolean;
  isGuest?: boolean;
  targetTime?: string;
}

const FlightInput: React.FC<FlightInputProps> = ({
  id,
  value,
  onChange,
  onRemove,
  showRemove,
  config,
  dateContext,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  defaultSearchFrom,
  defaultSearchTo,
  allowGround = true,
  isGuest = false,
  targetTime,
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchParams, setSearchParams] = useState({
    from: value?.depAirport || defaultSearchFrom || config.homeBase,
    to: value?.arrAirport || defaultSearchTo || config.reserveBase,
    date: dateContext || new Date().toISOString().split("T")[0],
  });
  const [showSearch, setShowSearch] = useState(false);
  const [showGround, setShowGround] = useState(!!value?.ground);

  const [recentAirports, setRecentAirports] = useState<string[]>([]);
  const [showRecentFrom, setShowRecentFrom] = useState(false);
  const [showRecentTo, setShowRecentTo] = useState(false);

  const listRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!showSearch) {
      setSearchParams((prev) => ({
        ...prev,
        from: value?.depAirport || defaultSearchFrom || prev.from,
        to: value?.arrAirport || defaultSearchTo || prev.to,
      }));
    }
  }, [defaultSearchFrom, defaultSearchTo, value?.depAirport, value?.arrAirport, showSearch]);

  /*
   * Determines if a flight departure time is suitable based on the target call time.
   * Ideally, for a commute-in flight, we want it to arrive or depart within a safe window before the call time.
   * Current Logic: Highlight flights that depart 2-4 hours before the target time.
   */
  const getSuitability = (flightDateStr: string | undefined) => {
    if (!targetTime || !flightDateStr || !dateContext) return { class: "", label: "" };

    const target = new Date(`${dateContext}T${targetTime}:00`);
    const flight = new Date(flightDateStr);

    // Difference in minutes (negative means flight is before target)
    const diffMinutes = (flight.getTime() - target.getTime()) / (1000 * 60);

    if (diffMinutes >= -240 && diffMinutes <= -120) {
      // 2-4 hours before
      return { class: "bg-green-50 border-l-4 border-green-500", label: "Sweet Spot" };
    }
    if (diffMinutes > -60) {
      // Less than 1 hour before (too tight) or after call time (late)
      return { class: "opacity-60", label: "Tight/Late" };
    }
    if (diffMinutes < -360) {
      // > 6 hours before (too early)
      return { class: "opacity-70", label: "Early" };
    }
    return { class: "", label: "" };
  };

  useEffect(() => {
    if (searchResults && searchResults.length > 0 && targetTime && listRef.current) {
      // Find the first flight in the "Sweet Spot" to auto-scroll to
      const bestIndex = searchResults.findIndex((f) => {
        const leg = f.legs[0];
        if (!leg?.departure.scheduledDate) return false;
        const s = getSuitability(leg.departure.scheduledDate);
        return s.label === "Sweet Spot";
      });

      if (bestIndex !== -1) {
        const el = itemRefs.current.get(bestIndex);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [searchResults, targetTime]);

  const isOnline = useNetworkStatus();
  const isSearchDisabled = isGuest || !isOnline;
  const disabledReason = !isOnline ? "Offline - flight search unavailable" : "Sign in to use flight search";

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      RecentAirports.add(searchParams.from);
      RecentAirports.add(searchParams.to);
      setRecentAirports(RecentAirports.get());
      const res = await FlightService.searchFlights(searchParams.from, searchParams.to, searchParams.date || "");
      setSearchResults(res.flights || []);
    } catch (e) {
      console.error(e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectFlight = (f: SearchResult) => {
    const leg = f.legs[0];
    if (!leg) return;
    const formattedDep = leg.departure?.scheduledDate ? leg.departure.scheduledDate.substring(11, 16) : "";
    const formattedArr = leg.arrival?.scheduledDate ? leg.arrival.scheduledDate.substring(11, 16) : "";

    const newData: FlightSegment = {
      ...value,
      flight: `${leg.carrierCodeIATA}${leg.aircraftIdentification.flightNumber}`,
      dep: formattedDep,
      arr: formattedArr,
      depAirport: leg.departureAirportCode,
      arrAirport: leg.arrivalAirportCode,
      status: "Unknown",
    };
    onChange(newData);
    setShowSearch(false);
  };

  const updateField = <K extends keyof FlightSegment>(field: K, val: FlightSegment[K]) => {
    let newData = { ...value, [field]: val };

    // Auto-sync ground hub with arrival airport
    if (field === "arrAirport" && newData.ground) {
      newData.ground = { ...newData.ground, hub: val as string };
    }

    onChange(newData);
  };

  const toggleGround = () => {
    if (showGround) {
      const { ground, ...rest } = value;
      onChange(rest);
    } else {
      onChange({ ...value, ground: { duration: "1.0", hub: value.arrAirport || "HUB", mode: "Uber" } });
    }
    setShowGround(!showGround);
  };

  const handleFocus = (type: "from" | "to") => {
    setRecentAirports(RecentAirports.get());
    if (type === "from") setShowRecentFrom(true);
    if (type === "to") setShowRecentTo(true);
  };

  const handleBlur = (type: "from" | "to") => {
    setTimeout(() => {
      if (type === "from") setShowRecentFrom(false);
      if (type === "to") setShowRecentTo(false);
    }, 200);
  };

  return (
    <div className="border rounded-md p-3 bg-white mb-2 shadow-sm relative group">
      {(onMoveUp || onMoveDown) && (
        <div className="absolute left-[-24px] top-1/2 -translate-y-1/2 flex flex-col gap-1">
          {onMoveUp && (
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30"
            >
              <ArrowUp size={14} />
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30"
            >
              <ArrowDown size={14} />
            </button>
          )}
        </div>
      )}

      {showSearch && (
        <div className="bg-gray-50 p-3 rounded mb-3 border border-indigo-100">
          <div className="grid grid-cols-3 gap-2 mb-2 relative">
            <div className="relative">
              <input
                className="border p-1 rounded text-xs w-full uppercase"
                value={searchParams.from}
                onChange={(e) => setSearchParams({ ...searchParams, from: e.target.value.toUpperCase() })}
                onFocus={() => handleFocus("from")}
                onBlur={() => handleBlur("from")}
                placeholder="From"
              />
              {showRecentFrom && (
                <RecentAirportsDropdown
                  recentAirports={recentAirports}
                  onSelect={(code) => setSearchParams({ ...searchParams, from: code })}
                  onRemove={(code) => {
                    RecentAirports.remove(code);
                    setRecentAirports(RecentAirports.get());
                  }}
                />
              )}
            </div>
            <div className="relative">
              <input
                className="border p-1 rounded text-xs w-full uppercase"
                value={searchParams.to}
                onChange={(e) => setSearchParams({ ...searchParams, to: e.target.value.toUpperCase() })}
                onFocus={() => handleFocus("to")}
                onBlur={() => handleBlur("to")}
                placeholder="To"
              />
              {showRecentTo && (
                <RecentAirportsDropdown
                  recentAirports={recentAirports}
                  onSelect={(code) => setSearchParams({ ...searchParams, to: code })}
                  onRemove={(code) => {
                    RecentAirports.remove(code);
                    setRecentAirports(RecentAirports.get());
                  }}
                />
              )}
            </div>
            <input
              type="date"
              className="border p-1 rounded text-xs"
              value={searchParams.date}
              onChange={(e) => setSearchParams({ ...searchParams, date: e.target.value })}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="w-full bg-indigo-600 text-white text-xs font-bold py-1.5 rounded mb-2"
          >
            {isSearching ? "Searching..." : "Search Flights"}
          </button>
          {searchResults && (
            <div ref={listRef} className="max-h-56 overflow-y-auto border rounded bg-white relative">
              {searchResults.length === 0 && <div className="p-2 text-xs text-gray-400">No flights found</div>}
              {searchResults.map((f, i) => {
                const leg = f.legs[0];
                const depGate = leg?.departure.gate;
                const arrGate = leg?.arrival.gate;
                const suitability = getSuitability(leg?.departure.scheduledDate);

                return (
                  <div
                    key={i}
                    ref={(el) => {
                      if (el) itemRefs.current.set(i, el);
                    }}
                    onClick={() => selectFlight(f)}
                    className={`p-2 border-b text-xs cursor-pointer flex justify-between items-center hover:bg-indigo-50 ${suitability.class}`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-700">
                          {leg?.carrierCodeIATA}
                          {leg?.aircraftIdentification.flightNumber}
                        </span>
                        {suitability.label && (
                          <span className="text-[9px] px-1 rounded bg-white border border-gray-200 text-gray-500 font-bold">
                            {suitability.label}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-400">
                        {leg?.departureAirportCode} → {leg?.arrivalAirportCode}
                      </span>
                    </div>
                    <div className="text-right">
                      <div>
                        {leg?.departure.scheduledDate.substring(11, 16)} -{" "}
                        {leg?.arrival.scheduledDate.substring(11, 16)}
                      </div>
                      {(depGate || arrGate) && (
                        <div className="text-[9px] text-gray-500">
                          Gate: {depGate || "-"} / {arrGate || "-"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-2 items-center">
          <div className="w-16">
            <label className="text-[10px] text-gray-400 font-bold">FLIGHT</label>
            <input
              className="w-full border p-1.5 rounded font-mono text-sm uppercase"
              value={value?.flight || ""}
              onChange={(e) => updateField("flight", e.target.value)}
              placeholder="DL123"
            />
          </div>
          <div className="w-14">
            <label className="text-[10px] text-gray-400 font-bold">ORG</label>
            <input
              className="w-full border p-1.5 rounded font-mono text-sm uppercase"
              value={value?.depAirport || ""}
              onChange={(e) => updateField("depAirport", e.target.value)}
              placeholder="ATL"
            />
          </div>
          <div className="w-16">
            <label className="text-[10px] text-gray-400 font-bold">DEP</label>
            <input
              className="w-full border p-1.5 rounded font-mono text-sm"
              value={value?.dep || ""}
              onChange={(e) => updateField("dep", e.target.value)}
              placeholder="08:00"
            />
          </div>
          <div className="w-16">
            <label className="text-[10px] text-gray-400 font-bold">ARR</label>
            <input
              className="w-full border p-1.5 rounded font-mono text-sm"
              value={value?.arr || ""}
              onChange={(e) => updateField("arr", e.target.value)}
              placeholder="10:30"
            />
          </div>
          <div className="w-14">
            <label className="text-[10px] text-gray-400 font-bold">DEST</label>
            <input
              className="w-full border p-1.5 rounded font-mono text-sm uppercase"
              value={value?.arrAirport || ""}
              onChange={(e) => updateField("arrAirport", e.target.value)}
              placeholder="LAX"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative group/tooltip">
            <button
              onClick={() => !isSearchDisabled && setShowSearch(!showSearch)}
              className={`text-xs font-bold flex items-center gap-1 px-2 py-1 rounded transition-colors ${isSearchDisabled
                ? "text-gray-400 cursor-not-allowed bg-gray-100 hover:bg-gray-100"
                : "text-indigo-600 hover:bg-indigo-50 cursor-pointer"
              }`}
            >
              <Search size={12} /> {showSearch ? "Cancel Lookup" : "Find Flight"}
            </button>
            {isSearchDisabled && (
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-max px-2 py-1 bg-gray-800 text-white text-[10px] rounded shadow-sm opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                {disabledReason}ssadaa
              </span>
            )}
          </div>
          {showRemove && (
            <button onClick={onRemove} className="text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {allowGround && (
        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`ground-${id}`}
              checked={showGround}
              onChange={toggleGround}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor={`ground-${id}`} className="text-xs text-gray-600 select-none cursor-pointer">
              Add Ground Commute
            </label>
          </div>
          {showGround && (
            <div className="flex items-center gap-1 bg-yellow-50 p-1 rounded border border-yellow-200">
              <span className="text-[10px] text-yellow-800 font-bold">
                Commute in {value?.arrAirport || "HUB"}:
              </span>
              <span className="text-[10px] text-yellow-800 font-bold ml-1">HRS:</span>
              <input
                className="w-10 p-0.5 text-xs border rounded"
                value={value?.ground?.duration || ""}
                onChange={(e) =>
                  updateField("ground", {
                    hub: value?.arrAirport || "HUB",
                    mode: "Uber",
                    ...value.ground,
                    duration: e.target.value,
                  })
                }
                placeholder="1.0"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FlightInput;
