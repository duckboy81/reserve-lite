import React from "react";
import { Plus, Copy, Clipboard } from "lucide-react";
import FlightOptionCard from "../flights/FlightOptionCard";
import { TimelineRowData, Option, FlightStatus } from "../../types";

interface TimelineRowProps {
  row: TimelineRowData;
  onAddOption: (rowId: string, rawDate: string) => void;
  onDeleteOption: (rowId: string, index: number) => void;
  onEditOption: (rowId: string, index: number, option: Option, rawDate: string) => void;
  onReorderOptions: (rowId: string, from: number, to: number) => void;
  isEdit: boolean;
  flightStatuses: Record<string, FlightStatus>;
  onCopyPlan?: (options: Option[]) => void;
  onPastePlan?: (rowId: string) => void;
  hasClipboard?: boolean;
}

const TimelineRow: React.FC<TimelineRowProps> = ({
  row,
  onAddOption,
  onDeleteOption,
  onEditOption,
  onReorderOptions,
  isEdit,
  flightStatuses,
  onCopyPlan,
  onPastePlan,
  hasClipboard,
}) => {
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData("index", idx.toString());
    e.dataTransfer.setData("rowId", row.key);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const draggedIdx = parseInt(e.dataTransfer.getData("index"));
    const sourceRowId = e.dataTransfer.getData("rowId");
    if (sourceRowId === row.key && draggedIdx !== targetIdx) {
      onReorderOptions(row.key, draggedIdx, targetIdx);
    }
  };

  const hasOptions = row.options && row.options.length > 0;

  return (
    <div
      className={`flex gap-0 py-3 border-b border-gray-200 px-2 min-h-20 transition-colors ${row.is14HrCallout ? "bg-amber-50/40" : "bg-white"}`}
    >
      <div className="w-8 flex flex-col items-center justify-center border-r border-gray-100 mr-2">
        <div className="-rotate-90 whitespace-nowrap text-xs font-bold text-gray-400 tracking-wider uppercase">
          {row.dateDisplay}
        </div>
      </div>
      <div className="w-24 shrink-0 flex flex-col items-end justify-start border-r border-gray-200 pr-4 mr-4 pt-2 group/date relative">
        {hasClipboard && (
          <button
            onClick={() => onPastePlan && onPastePlan(row.key)}
            className={`w-full h-full flex items-center justify-center border-2 border-dashed rounded-lg text-gray-400 text-sm font-medium transition-all
              border-blue-200 bg-blue-50/70 cursor-pointer hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 absolute top-0 right-1 max-h-15
            `}
          >
            <span className="flex items-center gap-2">
              <Clipboard size={16} /> Paste
            </span>
          </button>
        )}
        <span className="font-black text-xl text-gray-900 leading-none">{row.callET}</span>
        <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wide mt-1">{row.showPT} PT</span>
        {row.is14HrCallout && (
          <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded mt-1 font-bold">14HR CALLOUT</span>
        )}
        {isEdit && (
          <div className="flex flex-col gap-1 mt-2">
            {hasOptions && !hasClipboard && (
              <button
                onClick={() => onCopyPlan && onCopyPlan(row.options)}
                className="text-gray-400 hover:text-indigo-600 p-1 flex items-center justify-end gap-1 text-[10px]"
              >
                <Copy size={10} /> Copy
              </button>
            )}
          </div>
        )}
      </div>
      <div className={`flex-1 flex flex-wrap gap-1 content-start items-center`}>
        {hasOptions ? (
          <>
            {row.options.map((opt, i) => (
              <div key={i} className="flex-grow sm:max-w-[475px] sm:w-[475px]">
                <FlightOptionCard
                  option={opt}
                  index={i}
                  isEdit={isEdit}
                  onDelete={(idx) => onDeleteOption(row.key, idx)}
                  onEdit={(opt) => onEditOption(row.key, i, opt, row.rawDate)}
                  flightStatuses={flightStatuses}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              </div>
            ))}
            {isEdit && (
              <button
                onClick={() => onAddOption(row.key, row.rawDate)}
                className="grow h-15 flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-gray-400
                transition-all gap-2 group sm:max-w-[475px] sm:w-[475px]
                border-blue-200 bg-blue-50/30 cursor-pointer hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600"
              >
                <span className="flex items-center gap-2">
                  <Plus size={16} /> Add
                </span>
              </button>
            )}
          </>
        ) : (
          <div
            onClick={() => isEdit && onAddOption(row.key, row.rawDate)}
            className={`w-full h-full sm:max-w-[calc(950px+1rem)] min-h-[60px] flex items-center justify-center border-2 border-dashed rounded-lg text-gray-400 text-sm font-medium transition-all ${
              isEdit
                ? "border-blue-200 bg-blue-50/30 cursor-pointer hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600"
                : "border-gray-100 bg-gray-50/50"
            }`}
          >
            {isEdit ? (
              <span className="flex items-center gap-2">
                <Plus size={16} /> Add
              </span>
            ) : (
              "No Plans"
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize the row since it is used in a virtual list
export default React.memo(TimelineRow);
