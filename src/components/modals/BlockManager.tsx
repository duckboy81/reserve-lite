import React, { useState, useMemo, useEffect } from "react";
import { Plus, CheckCircle, Pencil, Trash2, RotateCcw } from "lucide-react";
import { ReserveBlock } from "../../types";
import { DEFAULT_CONFIG, TIMEZONES } from "../../config/constants";
import { Config } from "../../types";
import { Copy, Clock } from "lucide-react";
import { DateRangePicker } from "../inputs/DateRangePicker";

interface BlockManagerProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: ReserveBlock[];
  onAdd: (block: Omit<ReserveBlock, "id">) => void;
  onEdit: (id: string, block: Partial<ReserveBlock>) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onSelect: (id: string) => void;
  activeId: string | null;
  config: Config;
}

const BlockManager: React.FC<BlockManagerProps> = ({
  isOpen,
  onClose,
  blocks,
  onAdd,
  onEdit,
  onDelete,
  onRestore,
  onSelect,
  activeId,
  config,
}) => {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [homeBase, setHomeBase] = useState(DEFAULT_CONFIG.homeBase);
  const [timezone, setTimezone] = useState(DEFAULT_CONFIG.homeTz);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "archive" | "trash">("active");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "active") {
      setShowForm(false);
    }
  }, [tab]);

  const filteredBlocks = useMemo(() => {
    return blocks
      .filter((b) => {
        if (tab === "active") return !b.isDeleted && !b.isArchived;
        if (tab === "archive") return !b.isDeleted && b.isArchived;
        if (tab === "trash") return b.isDeleted;
        return false;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [blocks, tab]);

  const handleSave = () => {
    if (!start || !end) return;

    // Validate Duration (max 62 days)
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 62) {
      setError("Reserve blocks cannot exceed 62 days (approx 2 months).");
      return;
    }

    const fullStart = `${start}T10:00:00`;
    const fullEnd = `${end}T06:00:00`;
    if (isEditing && editId) {
      onEdit(editId, { start: fullStart, end: fullEnd, homeBase, timezone });
    } else {
      onAdd({ start: fullStart, end: fullEnd, homeBase, timezone });
    }
    setShowForm(false);
    setIsEditing(false);
    setStart("");
    setEnd("");
    setError(null);
    setHomeBase(config.homeBase);
    setTimezone(config.homeTz);
  };

  const handleClone = (block: ReserveBlock) => {
    setStart(block.start.split("T")[0] || "");
    setEnd(block.end.split("T")[0] || "");
    setHomeBase(block.homeBase || config.homeBase);
    setTimezone(block.timezone || config.homeTz);
    setIsEditing(false);
    setError(null);
    setShowForm(true);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="font-bold text-lg mb-4">Manage Reserve Blocks</h3>
        {showForm ? (
          <div className="bg-gray-50 p-3 rounded mb-4 border border-gray-200">
            {error && (
              <div className="mb-2 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100 font-bold">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-500 block mb-1">Dates</label>
                <DateRangePicker
                  startDate={start}
                  endDate={end}
                  onChange={(newStart, newEnd) => {
                    setStart(newStart);
                    setEnd(newEnd);
                  }}
                />
              </div>
              <div className="col-span-1">
                <label className="text-xs font-bold text-gray-500">Origin Base</label>
                <input
                  className="w-full border p-1 rounded uppercase"
                  maxLength={3}
                  value={homeBase}
                  onChange={(e) => setHomeBase(e.target.value.toUpperCase())}
                />
              </div>
              <div className="col-span-1">
                <label className="text-xs font-bold text-gray-500">Timezone</label>
                <div className="relative">
                  <Clock className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full pl-6 border p-1 rounded appearance-none bg-white text-xs h-[30px]"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex-1 bg-green-600 text-white py-1 rounded font-bold text-sm">
                {isEditing ? "Update" : "Create"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-3 bg-gray-200 text-gray-600 py-1 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex border-b border-gray-200 mb-4">
            <button
              className={`flex-1 pb-2 text-xs font-bold ${tab === "active" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-400"}`}
              onClick={() => setTab("active")}
            >
              Active
            </button>
            <button
              className={`flex-1 pb-2 text-xs font-bold ${tab === "archive" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-400"}`}
              onClick={() => setTab("archive")}
            >
              Archive
            </button>
            <button
              className={`flex-1 pb-2 text-xs font-bold ${tab === "trash" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-400"}`}
              onClick={() => setTab("trash")}
            >
              Trash
            </button>
          </div>
        )}

        {tab === "active" && !showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setIsEditing(false);
              setStart("");
              setEnd("");
              setHomeBase(config.homeBase);
              setTimezone(config.homeTz);
              setError(null);
            }}
            className="w-full bg-indigo-50 text-indigo-600 py-2 rounded mb-4 font-bold text-sm border border-indigo-100 hover:bg-indigo-100 flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add New Block
          </button>
        )}

        <div className="max-h-60 overflow-y-auto space-y-2">
          {filteredBlocks.length === 0 && (
            <div className="text-center text-gray-400 text-xs py-4">No {tab} blocks found.</div>
          )}
          {filteredBlocks.map((b) => (
            <div
              key={b.id}
              className={`p-3 rounded border flex justify-between items-center cursor-pointer ${activeId === b.id ? "border-indigo-500 bg-indigo-50" : "border-gray-200"
                }`}
              onClick={() => onSelect(b.id)}
            >
              <div className="flex-1 group">
                <div className="text-xs text-gray-500 flex gap-2">
                  <span>
                    {new Date(b.start).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    -{" "}
                    {new Date(b.end).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="font-mono font-bold bg-gray-200 px-1 rounded text-[10px] items-center flex text-gray-600">
                    {Math.round((new Date(b.end).getTime() - new Date(b.start).getTime()) / (1000 * 60 * 60 * 24)) + 1}d
                  </span>
                  <span className="font-mono font-bold bg-gray-200 px-1 rounded text-[10px] items-center flex">
                    {b.homeBase || config.homeBase}
                  </span>
                  {activeId === b.id && <CheckCircle size={14} className="text-indigo-600" />}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {tab === "active" && (
                  <>
                    <button
                      onClick={() => handleClone(b)}
                      className="text-gray-400 hover:text-blue-500 p-1"
                      title="Clone Block"
                    >
                      <Copy size={14} />
                    </button>
                    <div className="w-px h-3 bg-gray-300 mx-1"></div>
                    <button
                      onClick={() => {
                        setStart(b.start.split("T")[0] || "");
                        setEnd(b.end.split("T")[0] || "");
                        setHomeBase(b.homeBase || config.homeBase);
                        setTimezone(b.timezone || config.homeTz);
                        setEditId(b.id);
                        setIsEditing(true);
                        setError(null);
                        setShowForm(true);
                      }}
                      className="text-gray-400 hover:text-indigo-600 p-1"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (deleteConfirm === b.id) {
                          onDelete(b.id);
                          setDeleteConfirm(null);
                        } else {
                          setDeleteConfirm(b.id);
                          setTimeout(() => setDeleteConfirm(null), 3000);
                        }
                      }}
                      className={`p-1 rounded transition-colors ${deleteConfirm === b.id ? "bg-red-500 text-white px-2 text-xs font-bold" : "text-red-300 hover:text-red-500"}`}
                    >
                      {deleteConfirm === b.id ? "Sure?" : <Trash2 size={14} />}
                    </button>
                  </>
                )}
                {tab === "trash" && (
                  <button
                    onClick={() => onRestore(b.id)}
                    className="text-green-500 hover:text-green-700 p-1 flex items-center gap-1 text-xs font-bold"
                    title="Restore Block"
                  >
                    <RotateCcw size={14} /> Restore
                  </button>
                )}
                {tab === "archive" && <span className="text-xs text-gray-400 italic">Archived</span>}
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full border py-2 rounded text-gray-500 hover:bg-gray-50 font-bold">
          Done
        </button>
      </div>
    </div>
  );
};

export default BlockManager;
