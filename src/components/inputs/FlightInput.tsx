import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Search, X } from 'lucide-react';
import { FlightService } from '../../services/FlightService';
import { RecentAirports } from '../../services/StorageService';

const FlightInput = ({ label, value, onChange, onRemove, showRemove, config, dateContext, onMoveUp, onMoveDown, isFirst, isLast, defaultSearchFrom, defaultSearchTo, allowGround = true }) => {
  // value = { flight: 'DL123', dep: 'HH:mm', arr: 'HH:mm', depAirport: 'ATL', arrAirport: 'LAX', ground: { duration: '1.5', hub: 'DTW' } }
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchParams, setSearchParams] = useState({
    from: value?.depAirport || defaultSearchFrom || config.homeBase,
    to: value?.arrAirport || defaultSearchTo || config.reserveBase,
    date: dateContext || new Date().toISOString().split('T')[0]
  });
  const [showSearch, setShowSearch] = useState(false);
  const [showGround, setShowGround] = useState(!!value?.ground);

  const [recentAirports, setRecentAirports] = useState([]);
  const [showRecentFrom, setShowRecentFrom] = useState(false);
  const [showRecentTo, setShowRecentTo] = useState(false);

  useEffect(() => {
    if (!showSearch) {
      setSearchParams(prev => ({
        ...prev,
        from: value?.depAirport || defaultSearchFrom || prev.from,
        to: value?.arrAirport || defaultSearchTo || prev.to
      }));
    }
  }, [defaultSearchFrom, defaultSearchTo, value?.depAirport, value?.arrAirport, showSearch]);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      RecentAirports.add(searchParams.from);
      RecentAirports.add(searchParams.to);
      setRecentAirports(RecentAirports.get());
      const res = await FlightService.searchFlights(searchParams.from, searchParams.to, searchParams.date);
      setSearchResults(res.flights || []);
    } catch (e) {
      console.error(e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectFlight = (f) => {
    const leg = f.legs[0];
    const formattedDep = leg.departure?.scheduledDate ? leg.departure.scheduledDate.substring(11, 16) : '';
    const formattedArr = leg.arrival?.scheduledDate ? leg.arrival.scheduledDate.substring(11, 16) : '';

    const newData = {
      ...value,
      flight: `${leg.carrierCodeIATA}${leg.aircraftIdentification.flightNumber}`,
      dep: formattedDep,
      arr: formattedArr,
      depAirport: leg.departureAirportCode,
      arrAirport: leg.arrivalAirportCode
    };
    onChange(newData);
    setShowSearch(false);
  };

  const updateField = (field, val) => {
    onChange({ ...value, [field]: val });
  };

  const toggleGround = () => {
    if (showGround) {
      const { ground, ...rest } = value;
      onChange(rest);
    } else {
      onChange({ ...value, ground: { duration: '1.0', hub: value.arrAirport || 'UNK' } });
    }
    setShowGround(!showGround);
  };

  const handleFocus = (type) => {
    setRecentAirports(RecentAirports.get());
    if (type === 'from') setShowRecentFrom(true);
    if (type === 'to') setShowRecentTo(true);
  };

  const handleBlur = (type) => {
    setTimeout(() => {
      if (type === 'from') setShowRecentFrom(false);
      if (type === 'to') setShowRecentTo(false);
    }, 200);
  };

  return (
    <div className="border rounded-md p-3 bg-white mb-2 shadow-sm relative group">
      {(onMoveUp || onMoveDown) && (
        <div className="absolute left-[-24px] top-1/2 -translate-y-1/2 flex flex-col gap-1">
          {onMoveUp && <button onClick={onMoveUp} disabled={isFirst} className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30"><ArrowUp size={14} /></button>}
          {onMoveDown && <button onClick={onMoveDown} disabled={isLast} className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30"><ArrowDown size={14} /></button>}
        </div>
      )}

      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-gray-500 uppercase">{label}</span>
        <div className="flex gap-2">
          <button onClick={() => setShowSearch(!showSearch)} className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded">
            <Search size={12} /> {showSearch ? 'Cancel Lookup' : 'Find Flight'}
          </button>
          {showRemove && <button onClick={onRemove} className="text-red-400 hover:text-red-600"><X size={14} /></button>}
        </div>
      </div>

      {showSearch && (
        <div className="bg-gray-50 p-3 rounded mb-3 border border-indigo-100">
          <div className="grid grid-cols-3 gap-2 mb-2 relative">
            <div className="relative">
              <input
                className="border p-1 rounded text-xs w-full uppercase"
                value={searchParams.from}
                onChange={e => setSearchParams({ ...searchParams, from: e.target.value.toUpperCase() })}
                onFocus={() => handleFocus('from')}
                onBlur={() => handleBlur('from')}
                placeholder="From"
              />
              {showRecentFrom && recentAirports.length > 0 && (
                /* DUPLICATE CODE: This dropdown logic is identical to the 'To' dropdown below. Consider extracting to a <RecentlyUsedDropdown> component. */
                <div className="absolute top-full left-0 w-full bg-white border shadow-lg z-50 max-h-32 overflow-y-auto rounded-b">
                  <div className="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-1">RECENT</div>
                  {recentAirports.map(code => (
                    <div key={code} className="flex justify-between items-center px-2 py-1 hover:bg-indigo-50 cursor-pointer">
                      <span onClick={() => setSearchParams({ ...searchParams, from: code })} className="flex-1 text-xs font-bold">{code}</span>
                      <button onClick={(e) => { e.stopPropagation(); RecentAirports.remove(code); setRecentAirports(RecentAirports.get()); }} className="text-gray-300 hover:text-red-500"><X size={10} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <input
                className="border p-1 rounded text-xs w-full uppercase"
                value={searchParams.to}
                onChange={e => setSearchParams({ ...searchParams, to: e.target.value.toUpperCase() })}
                onFocus={() => handleFocus('to')}
                onBlur={() => handleBlur('to')}
                placeholder="To"
              />
              {showRecentTo && recentAirports.length > 0 && (
                /* DUPLICATE CODE: This dropdown logic is identical to the 'From' dropdown above. Consider extracting to a <RecentlyUsedDropdown> component. */
                <div className="absolute top-full left-0 w-full bg-white border shadow-lg z-50 max-h-32 overflow-y-auto rounded-b">
                  <div className="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-1">RECENT</div>
                  {recentAirports.map(code => (
                    <div key={code} className="flex justify-between items-center px-2 py-1 hover:bg-indigo-50 cursor-pointer">
                      <span onClick={() => setSearchParams({ ...searchParams, to: code })} className="flex-1 text-xs font-bold">{code}</span>
                      <button onClick={(e) => { e.stopPropagation(); RecentAirports.remove(code); setRecentAirports(RecentAirports.get()); }} className="text-gray-300 hover:text-red-500"><X size={10} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input type="date" className="border p-1 rounded text-xs" value={searchParams.date} onChange={e => setSearchParams({ ...searchParams, date: e.target.value })} />
          </div>
          <button onClick={handleSearch} disabled={isSearching} className="w-full bg-indigo-600 text-white text-xs font-bold py-1.5 rounded mb-2">
            {isSearching ? 'Searching...' : 'Search Flights'}
          </button>
          {searchResults && (
            <div className="max-h-32 overflow-y-auto border rounded bg-white">
              {searchResults.length === 0 && <div className="p-2 text-xs text-gray-400">No flights found</div>}
              {searchResults.map((f, i) => {
                const leg = f.legs[0];
                const depGate = leg.departure.gate;
                const arrGate = leg.arrival.gate;
                return (
                  <div key={i} onClick={() => selectFlight(f)} className="p-2 border-b text-xs hover:bg-indigo-50 cursor-pointer flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="font-bold text-indigo-700">{leg.carrierCodeIATA}{leg.aircraftIdentification.flightNumber}</span>
                      <span className="text-[9px] text-gray-400">{leg.departureAirportCode} → {leg.arrivalAirportCode}</span>
                    </div>
                    <div className="text-right">
                      <div>{leg.departure.scheduledDate.substring(11, 16)} - {leg.arrival.scheduledDate.substring(11, 16)}</div>
                      {(depGate || arrGate) && <div className="text-[9px] text-gray-500">Gate: {depGate || '-'} / {arrGate || '-'}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 items-center">
        <div className="w-16">
          <label className="text-[10px] text-gray-400 font-bold">FLIGHT</label>
          <input className="w-full border p-1.5 rounded font-mono text-sm uppercase" value={value?.flight || ''} onChange={e => updateField('flight', e.target.value)} placeholder="DL123" />
        </div>
        <div className="w-14">
          <label className="text-[10px] text-gray-400 font-bold">ORG</label>
          <input className="w-full border p-1.5 rounded font-mono text-sm uppercase" value={value?.depAirport || ''} onChange={e => updateField('depAirport', e.target.value)} placeholder="ATL" />
        </div>
        <div className="w-16">
          <label className="text-[10px] text-gray-400 font-bold">DEP</label>
          <input className="w-full border p-1.5 rounded font-mono text-sm" value={value?.dep || ''} onChange={e => updateField('dep', e.target.value)} placeholder="08:00" />
        </div>
        <div className="w-16">
          <label className="text-[10px] text-gray-400 font-bold">ARR</label>
          <input className="w-full border p-1.5 rounded font-mono text-sm" value={value?.arr || ''} onChange={e => updateField('arr', e.target.value)} placeholder="10:30" />
        </div>
        <div className="w-14">
          <label className="text-[10px] text-gray-400 font-bold">DEST</label>
          <input className="w-full border p-1.5 rounded font-mono text-sm uppercase" value={value?.arrAirport || ''} onChange={e => updateField('arrAirport', e.target.value)} placeholder="LAX" />
        </div>
      </div>

      {allowGround && (
        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <div className="flex items-center gap-2">
            <input type="checkbox" id={`ground-${label}`} checked={showGround} onChange={toggleGround} className="rounded text-indigo-600 focus:ring-indigo-500" />
            <label htmlFor={`ground-${label}`} className="text-xs text-gray-600 select-none cursor-pointer">Add Ground Commute</label>
          </div>
          {showGround && (
            <div className="flex items-center gap-1 bg-yellow-50 p-1 rounded border border-yellow-200">
              <span className="text-[10px] text-yellow-800 font-bold">HUB:</span>
              <input className="w-10 p-0.5 text-xs border rounded uppercase" value={value?.ground?.hub || ''} onChange={e => updateField('ground', { ...value.ground, hub: e.target.value })} placeholder="DTW" />
              <span className="text-[10px] text-yellow-800 font-bold ml-1">HRS:</span>
              <input className="w-10 p-0.5 text-xs border rounded" value={value?.ground?.duration || ''} onChange={e => updateField('ground', { ...value.ground, duration: e.target.value })} placeholder="1.0" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FlightInput;
