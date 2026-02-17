import React from "react";
import { ArrowRight, Split, GripVertical, Trash2 } from "lucide-react";
import FlightPill from "./FlightPill";
import { Option, FlightStatus } from "../../types";

interface FlightOptionCardProps {
  option: Option;
  index: number;
  isEdit: boolean;
  onDelete: (index: number) => void;
  onEdit: (option: Option) => void;
  flightStatuses: Record<string, FlightStatus>;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

const addDuration = (timeStr: string | undefined, durationHours: string | number | undefined) => {
  if (!timeStr) return "N/A";
  if (!durationHours) return timeStr;

  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;

  const h = Number(parts[0]);
  const m = Number(parts[1]);

  if (isNaN(h) || isNaN(m)) return timeStr;

  const date = new Date();
  date.setHours(h);
  date.setMinutes(m);
  date.setSeconds(0);
  date.setMilliseconds(0);

  const durationNum = Number(durationHours);
  if (isNaN(durationNum)) return timeStr;

  const addedTime = date.getTime() + durationNum * 60 * 60 * 1000;
  const newDate = new Date(addedTime);

  const newHours = String(newDate.getHours()).padStart(2, "0");
  const newMinutes = String(newDate.getMinutes()).padStart(2, "0");
  return `${newHours}:${newMinutes}`;
};

const FlightOptionCard: React.FC<FlightOptionCardProps> = ({
  option,
  index,
  isEdit,
  onDelete,
  onEdit,
  flightStatuses = {},
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const getPrimaryArr = (opt: Option) => {
    if (opt.type === "hub-strategy" && opt.outbound) {
      const p = opt.outbound.find((o) => o.isPrimary);
      if (p) {
        return p.ground ? addDuration(p.arr, p.ground.duration) : p.arr;
      }
      return "N/A";
    }
    if (opt.segments && opt.segments.length > 0) {
      const s = opt.segments[opt.segments.length - 1];
      if (s) {
        // Direct flights usually don't have ground transport at the end, but check just in case
        return s.ground ? addDuration(s.arr, s.ground.duration) : s.arr;
      }
      return "N/A";
    }
    return "N/A";
  };

  const getSecondaryArr = (opt: Option) => {
    if (opt.type === "hub-strategy" && opt.outbound) {
      const s = opt.outbound.find((o) => o.isSecondary);
      if (s) {
        return s.ground ? addDuration(s.arr, s.ground.duration) : s.arr;
      }
    }
    return null;
  };

  const primaryArr = getPrimaryArr(option);
  const secondaryArr = getSecondaryArr(option);

  const inbounds =
    option.type === "hub-strategy"
      ? Array.isArray(option.inbound)
        ? option.inbound
        : option.inbound
          ? [option.inbound]
          : []
      : [];

  return (
    <div
      className={`relative pl-3 mt-2 min-w-[340px] mb-2 group ${isEdit ? "cursor-grab active:cursor-grabbing" : ""}`}
      draggable={isEdit}
      onDragStart={(e) => isEdit && onDragStart(e, index)}
      onDragOver={(e) => isEdit && onDragOver(e)}
      onDrop={(e) => isEdit && onDrop(e, index)}
    >
      <div className="absolute left-0 top-3 bg-gray-50 text-gray-400 text-[10px] font-bold px-1.5 py-1 rounded border border-gray-100 z-10 flex flex-col items-center">
        <span>#{index + 1}</span>
        {isEdit && <GripVertical size={10} className="mt-1 text-gray-300" />}
      </div>
      <div
        className={`bg-white border border-gray-200 rounded-lg shadow-sm p-3 pl-6 transition-all relative ${isEdit ? "hover:border-blue-400 border-blue-100 bg-blue-50/10" : "hover:border-indigo-300"}`}
        onClick={() => isEdit && onEdit(option)}
      >
        {isEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(index);
            }}
            className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full shadow-sm hover:bg-red-200 z-50"
          >
            <Trash2 size={14} />
          </button>
        )}

        {option.type === "hub-strategy" ? (
          <div className="flex flex-col w-full">
            <div className="flex flex-col gap-1 pb-2">
              {inbounds.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  {inbounds.length > 1 && <span className="text-[9px] text-gray-400 font-bold w-3">#{i + 1}</span>}
                  <FlightPill f={f} statusData={flightStatuses[f.flight]} />
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-gray-200 w-full my-1"></div>
            <div className="flex flex-wrap gap-2 pt-1 mb-2">
              {option.outbound?.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <FlightPill f={f} statusData={flightStatuses[f.flight]} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            {option.segments?.map((seg, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ArrowRight size={10} className="text-gray-300" />}
                <FlightPill f={seg} statusData={flightStatuses[seg.flight]} />
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Footer Info Row */}
        {option.type === "hub-strategy" && (
          <div className="absolute -bottom-3 left-3 bg-purple-100 border border-purple-200 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm z-20">
            <Split size={10} /> Via {option.hub}
          </div>
        )}
        <div className="absolute -bottom-3 right-4 bg-white border border-gray-200 shadow-sm rounded-full px-3 py-1 flex items-center gap-3 z-20">
          <span className="font-mono font-bold text-xs text-gray-900">
            {primaryArr}
            {secondaryArr ? `- ${secondaryArr}` : ``}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FlightOptionCard;
