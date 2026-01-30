import React, { useState } from 'react';
import { Plus, CheckCircle, Pencil, Trash2 } from 'lucide-react';

const BlockManager = ({ isOpen, onClose, blocks, onAdd, onEdit, onDelete, onSelect, activeId }) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const handleSave = () => {
    if (!start || !end) return;
    const fullStart = `${start}T10:00:00`;
    const fullEnd = `${end}T06:00:00`;
    if (isEditing) onEdit(editId, { start: fullStart, end: fullEnd });
    else onAdd({ start: fullStart, end: fullEnd });
    setShowForm(false); setIsEditing(false); setStart(''); setEnd('');
  };

  if(!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="font-bold text-lg mb-4">Manage Reserve Blocks</h3>
        {showForm ? (
          <div className="bg-gray-50 p-3 rounded mb-4 border border-gray-200">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div><label className="text-xs font-bold text-gray-500">First Day</label><input type="date" className="w-full border p-1 rounded" value={start} onChange={e => setStart(e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-500">Last Day</label><input type="date" className="w-full border p-1 rounded" value={end} onChange={e => setEnd(e.target.value)} /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex-1 bg-green-600 text-white py-1 rounded font-bold text-sm">{isEditing ? 'Update' : 'Create'}</button>
              <button onClick={() => setShowForm(false)} className="px-3 bg-gray-200 text-gray-600 py-1 rounded text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setShowForm(true); setIsEditing(false); setStart(''); setEnd(''); }} className="w-full bg-indigo-50 text-indigo-600 py-2 rounded mb-4 font-bold text-sm border border-indigo-100 hover:bg-indigo-100 flex items-center justify-center gap-2"><Plus size={16}/> Add New Block</button>
        )}
        <div className="max-h-60 overflow-y-auto space-y-2">
          {blocks.map(b => (
            <div key={b.id} className={`p-3 rounded border flex justify-between items-center ${activeId === b.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
              <div onClick={() => onSelect(b.id)} className="cursor-pointer flex-1">
                <div className="font-bold text-sm flex items-center gap-2">Reserve Block {activeId === b.id && <CheckCircle size={14} className="text-indigo-600"/>}</div>
                <div className="text-xs text-gray-500">{new Date(b.start).toLocaleDateString()} - {new Date(b.end).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setStart(b.start.split('T')[0]); setEnd(b.end.split('T')[0]); setEditId(b.id); setIsEditing(true); setShowForm(true); }} className="text-gray-400 hover:text-indigo-600 p-1"><Pencil size={14}/></button>
                <button onClick={() => onDelete(b.id)} className="text-red-300 hover:text-red-500 p-1"><Trash2 size={14}/></button>
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
