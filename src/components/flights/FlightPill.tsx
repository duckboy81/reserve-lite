import React, { useState } from 'react';
import { ArrowRight, Car } from 'lucide-react';
import StatusDot from '../common/StatusDot';

const FlightPill = ({ f, statusData }) => {
  const [expanded, setExpanded] = useState(false);
  const formatApiTime = (isoString) => {
    if (!isoString) return null;
    return new Date(isoString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };
  const depGate = statusData?.departure?.gate;
  const arrGate = statusData?.arrival?.gate;
  const hasGateInfo = depGate || arrGate;
  const displayDep = statusData ? formatApiTime(statusData.departure.estimatedDate || statusData.departure.scheduledDate) : f.dep;
  const displayArr = statusData ? formatApiTime(statusData.arrival.estimatedDate || statusData.arrival.scheduledDate) : f.arr;
  const timeDisplay = expanded && hasGateInfo
    ? `${displayDep} (${depGate || '-'}) - ${displayArr} (${arrGate || '-'})`
    : (displayDep && displayArr ? `${displayDep}-${displayArr}` : 'N/A');

  return (
    <div className="flex items-center select-none" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
      <div className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded border shadow-sm transition-colors cursor-pointer ${expanded ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-200 hover:border-indigo-200'}`}>
        <StatusDot status={statusData ? statusData.lastStatus : f.status} details={statusData ? statusData.departure : null} />
        <span className={`text-[11px] font-bold text-gray-800`}>{f.flight || 'UNK'}</span>
        <span className={`text-[10px] font-mono border-l pl-1.5 text-gray-400 border-gray-100 ${expanded ? 'text-indigo-600 font-bold' : ''}`}>
                    {timeDisplay}
                </span>
      </div>
      {f.ground && (
        <div className="flex items-center ml-1">
          <ArrowRight size={10} className="text-gray-300 mr-1"/>
          <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded text-[9px] text-yellow-800 font-medium" title={`Commute in ${f.ground.hub}`}>
            <Car size={10}/> {f.ground.duration}h
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightPill;
