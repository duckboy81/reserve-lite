import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { TIMEZONES } from '../../config/constants';

const ConfigModal = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState(config);
  if(!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Settings size={20}/> Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Home Base (Origin)</label>
            <input className="w-full border p-2 rounded" value={localConfig.homeBase} onChange={e => setLocalConfig({...localConfig, homeBase: e.target.value.toUpperCase()})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Home Timezone</label>
            <select className="w-full border p-2 rounded bg-white" value={localConfig.homeTz} onChange={e => setLocalConfig({...localConfig, homeTz: e.target.value})}>
              {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Reserve Base (Commute To)</label>
            <input className="w-full border p-2 rounded" value={localConfig.reserveBase} onChange={e => setLocalConfig({...localConfig, reserveBase: e.target.value.toUpperCase()})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Reserve Timezone</label>
            <select className="w-full border p-2 rounded bg-white" value={localConfig.reserveTz} onChange={e => setLocalConfig({...localConfig, reserveTz: e.target.value})}>
              {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-500">Cancel</button>
          <button onClick={() => onSave(localConfig)} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold">Save Config</button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;
