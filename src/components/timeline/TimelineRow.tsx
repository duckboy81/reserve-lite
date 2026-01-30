import React from 'react';
import { Plus } from 'lucide-react';
import FlightOptionCard from '../flights/FlightOptionCard';

const TimelineRow = ({ row, onAddOption, onDeleteOption, onEditOption, onReorderOptions, isEdit, flightStatuses }) => {
  const handleDragStart = (e, idx) => {
    e.dataTransfer.setData('index', idx);
    e.dataTransfer.setData('rowId', row.id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    const draggedIdx = parseInt(e.dataTransfer.getData('index'));
    const sourceRowId = e.dataTransfer.getData('rowId');
    if (sourceRowId === row.id && draggedIdx !== targetIdx) {
      onReorderOptions(row.id, draggedIdx, targetIdx);
    }
  };

  const hasOptions = row.options && row.options.length > 0;

  return (
    <div className={`flex gap-0 py-3 border-b border-gray-200 px-2 min-h-[80px] transition-colors ${row.is14HrCallout ? 'bg-amber-50/40' : 'bg-white'}`}>
      <div className="w-8 flex flex-col items-center justify-center border-r border-gray-100 mr-2">
        <div className="-rotate-90 whitespace-nowrap text-xs font-bold text-gray-400 tracking-wider uppercase">{row.dateDisplay}</div>
      </div>
      <div className="w-24 flex-shrink-0 flex flex-col items-end justify-start border-r border-gray-200 pr-4 mr-4 pt-2">
        <span className="font-black text-xl text-gray-900 leading-none">{row.callET}</span>
        <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wide mt-1">{row.showPT} PT</span>
        {row.is14HrCallout && <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded mt-1 font-bold">14HR CALLOUT</span>}
        {isEdit && <button onClick={() => onAddOption(row.id, row.rawDate)} className="mt-2 bg-blue-50 text-blue-600 p-1 rounded hover:bg-blue-100 flex items-center gap-1 text-[10px] font-bold"><Plus size={12}/> Add</button>}
      </div>
      <div className={`flex-1 flex flex-wrap items-start gap-4 content-start ${!hasOptions ? 'items-center' : ''}`}>
        {hasOptions ? row.options.map((opt, i) => (
          <div key={i} className="flex-grow max-w-full sm:max-w-[500px]">
            <FlightOptionCard option={opt} index={i} isEdit={isEdit} onDelete={(idx) => onDeleteOption(row.id, idx)} onEdit={(opt) => onEditOption(row.id, i, opt)} flightStatuses={flightStatuses} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} />
          </div>
        )) : (
          <div className={`w-full h-full min-h-[40px] flex items-center justify-center border-2 border-dashed rounded-lg text-gray-300 text-xs ${isEdit ? 'border-blue-200 bg-blue-50/10' : 'border-gray-100'}`}>
            {isEdit ? 'Click + Add to plan' : 'No Plans'}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineRow;
