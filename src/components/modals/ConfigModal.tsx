import React, { useState } from 'react';
import { Settings, Database, Download, Upload, AlertTriangle } from 'lucide-react';
import { TIMEZONES } from '../../config/constants';
import { Config } from '../../types';
import { DataService } from '../../services/DataService';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: Config;
  onSave: (config: Config) => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<Config>(config);
  const [importState, setImportState] = useState<{
    stage: 'idle' | 'preview';
    stats?: { blocks: number, flights: number, rows: number };
    currentStats?: { blocks: number, flights: number, rows: number };
    data?: any;
    error?: string;
  }>({ stage: 'idle' });

  if (!isOpen) return null;

  const handleExport = async () => {
    const json = await DataService.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reserve_lite_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const validation = DataService.validateImport(text);

    if (validation.valid && validation.stats) {
      const current = await DataService.getStats();
      setImportState({
        stage: 'preview',
        stats: validation.stats,
        currentStats: current,
        data: validation.data
      });
    } else {
      setImportState({ stage: 'idle', error: 'Invalid file format' });
    }
  };

  const executeImport = async () => {
    if (importState.data) {
      await DataService.importData(importState.data);
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Settings size={20} /> Configuration</h3>

        {importState.stage === 'preview' ? (
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 text-indigo-600 font-bold border-b border-gray-200 pb-2">
              <Upload size={18} /> Confirm Import
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-bold text-gray-500 text-xs uppercase mb-1">Current Data</p>
                <p>Blocks: {importState.currentStats?.blocks}</p>
                <p>Flights: {importState.currentStats?.flights}</p>
              </div>
              <div>
                <p className="font-bold text-indigo-500 text-xs uppercase mb-1">New Data</p>
                <p className="font-bold">Blocks: {importState.stats?.blocks}</p>
                <p className="font-bold">Flights: {importState.stats?.flights}</p>
              </div>
            </div>
            <div className="bg-yellow-50 text-yellow-800 text-xs p-2 rounded flex gap-2 items-start">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <p>Importing will <strong>permanently replace</strong> all current data. This cannot be undone.</p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setImportState({ stage: 'idle' })} className="px-3 py-1 text-gray-500 text-sm">Cancel</button>
              <button onClick={executeImport} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm font-bold">Confirm & Import</button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Home Base (Origin)</label>
                <input className="w-full border p-2 rounded" value={localConfig.homeBase} onChange={e => setLocalConfig({ ...localConfig, homeBase: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Home Timezone</label>
                <select className="w-full border p-2 rounded bg-white" value={localConfig.homeTz} onChange={e => setLocalConfig({ ...localConfig, homeTz: e.target.value })}>
                  {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Reserve Base (Commute To)</label>
                <input className="w-full border p-2 rounded" value={localConfig.reserveBase} onChange={e => setLocalConfig({ ...localConfig, reserveBase: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Reserve Timezone</label>
                <select className="w-full border p-2 rounded bg-white" value={localConfig.reserveTz} onChange={e => setLocalConfig({ ...localConfig, reserveTz: e.target.value })}>
                  {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                </select>
              </div>
            </div>

            <div className="border-t pt-4">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Database size={14} /> Data Management</label>
              <div className="flex gap-3">
                <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 border border-gray-300 rounded p-2 text-sm hover:bg-gray-50 text-gray-700">
                  <Download size={16} /> Export Data
                </button>
                <label className="flex-1 flex items-center justify-center gap-2 border border-blue-200 bg-blue-50 rounded p-2 text-sm hover:bg-blue-100 text-blue-700 cursor-pointer transition-colors">
                  <Upload size={16} /> Import Data
                  <input type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
                </label>
              </div>
              {importState.error && <p className="text-red-500 text-xs mt-2">{importState.error}</p>}
            </div>
          </div>
        )}

        {importState.stage === 'idle' && (
          <div className="flex justify-end gap-2 mt-6 border-t pt-4">
            <button onClick={onClose} className="px-4 py-2 text-gray-500">Cancel</button>
            <button onClick={() => onSave(localConfig)} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold">Save Config</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigModal;
