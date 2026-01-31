import React, { useState } from 'react';
import { Plus, CheckCircle, Pencil, Trash2 } from 'lucide-react';
import { ReserveBlock } from '../../types';

interface BlockManagerProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: ReserveBlock[];
  onAdd: (block: Omit<ReserveBlock, 'id'>) => void;
  onEdit: (id: string, block: Partial<ReserveBlock>) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  activeId: string | null;
}

import { DEFAULT_CONFIG } from '../../config/constants';
import { Copy } from 'lucide-react';

const BlockManager: React.FC<BlockManagerProps> = ({
  isOpen,
  onClose,
  blocks,
  onAdd,
  onEdit,
  onDelete,
  onSelect,
  activeId
}) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [homeBase, setHomeBase] = useState(DEFAULT_CONFIG.homeBase);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const handleSave = () => {
    if (!start || !end) return;
    const fullStart = `${start}T10:00:00`;
    const fullEnd = `${end}T06:00:00`;
    if (isEditing && editId) onEdit(editId, { start: fullStart, end: fullEnd, homeBase });
    else onAdd({ start: fullStart, end: fullEnd, homeBase });
    setShowForm(false); setIsEditing(false); setStart(''); setEnd(''); setHomeBase(DEFAULT_CONFIG.homeBase);
  };

  const handleClone = (block: ReserveBlock) => {
    setStart(block.start.split('T')[0] || '');
    setEnd(block.end.split('T')[0] || '');
    setHomeBase(block.homeBase || DEFAULT_CONFIG.homeBase);
    setIsEditing(false);
    setShowForm(true);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="font-bold text-lg mb-4">Manage Reserve Blocks</h3>
        {showForm ? (
          <div className="bg-gray-50 p-3 rounded mb-4 border border-gray-200">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="col-span-1"><label className="text-xs font-bold text-gray-500">First Day</label><input type="date" className="w-full border p-1 rounded" value={start} onChange={e => setStart(e.target.value)} /></div>
              <div className="col-span-1"><label className="text-xs font-bold text-gray-500">Last Day</label><input type="date" className="w-full border p-1 rounded" value={end} onChange={e => setEnd(e.target.value)} /></div>
              <div className="col-span-1">
                <label className="text-xs font-bold text-gray-500">Base</label>
                <input className="w-full border p-1 rounded uppercase" maxLength={3} value={homeBase} onChange={e => setHomeBase(e.target.value.toUpperCase())} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex-1 bg-green-600 text-white py-1 rounded font-bold text-sm">{isEditing ? 'Update' : 'Create'}</button>
              <button onClick={() => setShowForm(false)} className="px-3 bg-gray-200 text-gray-600 py-1 rounded text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setShowForm(true); setIsEditing(false); setStart(''); setEnd(''); setHomeBase(DEFAULT_CONFIG.homeBase); }} className="w-full bg-indigo-50 text-indigo-600 py-2 rounded mb-4 font-bold text-sm border border-indigo-100 hover:bg-indigo-100 flex items-center justify-center gap-2"><Plus size={16} /> Add New Block</button>
        )}
        <div className="max-h-60 overflow-y-auto space-y-2">
          {blocks.map(b => (
            <div key={b.id} className={`p-3 rounded border flex justify-between items-center ${activeId === b.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
              <div onClick={() => onSelect(b.id)} className="cursor-pointer flex-1 group">
                <div className="font-bold text-sm flex items-center gap-2">
                  Reserve Block
                  {activeId === b.id && <CheckCircle size={14} className="text-indigo-600" />}
                </div>
                <div className="text-xs text-gray-500 flex gap-2">
                  <span>{new Date(b.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(b.end).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  <span className="font-mono font-bold bg-gray-200 px-1 rounded text-[10px] items-center flex">{b.homeBase || DEFAULT_CONFIG.homeBase}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleClone(b)} className="text-gray-400 hover:text-blue-500 p-1" title="Clone Block"><Copy size={14} /></button>
                <div className="w-px h-3 bg-gray-300 mx-1"></div>
                <button onClick={() => { setStart(b.start.split('T')[0] || ''); setEnd(b.end.split('T')[0] || ''); setHomeBase(b.homeBase || DEFAULT_CONFIG.homeBase); setEditId(b.id); setIsEditing(true); setShowForm(true); }} className="text-gray-400 hover:text-indigo-600 p-1"><Pencil size={14} /></button>
                <button onClick={() => onDelete(b.id)} className="text-red-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full border py-2 rounded text-gray-500 hover:bg-gray-50 font-bold">Done</button>
      </div>
    </div>
  );
};

export default BlockManager;
