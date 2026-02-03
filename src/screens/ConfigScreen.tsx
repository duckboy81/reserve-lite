import React, { useState } from "react";
import { Settings, Save, Clock, MapPin, Briefcase } from "lucide-react";
import { Config } from "../types";
import { TIMEZONES } from "../config/constants";

interface ConfigScreenProps {
  initialConfig: Config;
  onSave: (config: Config) => void;
}

export const ConfigScreen: React.FC<ConfigScreenProps> = ({ initialConfig, onSave }) => {
  const [config, setConfig] = useState<Config>(initialConfig);

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onSave(config);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100">
        <div className="bg-indigo-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 opacity-80" />
            <h1 className="text-2xl font-black tracking-tight">Setup Your Base</h1>
          </div>
          <p className="text-indigo-100 opacity-90">
            Configure your preferences to get started. You can change these later in settings.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {/* Home Base Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                <MapPin size={14} /> Home Base
              </h3>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Airport Code</label>
                <input
                  type="text"
                  value={config.homeBase}
                  onChange={(e) => setConfig({ ...config, homeBase: e.target.value.toUpperCase() })}
                  className="w-full p-3 border border-gray-200 rounded-lg font-mono font-bold text-lg focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                  placeholder="ATL"
                  maxLength={3}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Timezone</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    value={config.homeTz}
                    onChange={(e) => setConfig({ ...config, homeTz: e.target.value })}
                    className="w-full p-3 pl-10 border border-gray-200 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
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

            {/* Reserve Base Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                <Briefcase size={14} /> Reserve Base
              </h3>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Airport Code</label>
                <input
                  type="text"
                  value={config.reserveBase}
                  onChange={(e) => setConfig({ ...config, reserveBase: e.target.value.toUpperCase() })}
                  className="w-full p-3 border border-gray-200 rounded-lg font-mono font-bold text-lg focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                  placeholder="NYC"
                  maxLength={3}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Timezone</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    value={config.reserveTz}
                    onChange={(e) => setConfig({ ...config, reserveTz: e.target.value })}
                    className="w-full p-3 pl-10 border border-gray-200 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
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

            {/* Buffers Section */}
            {/*<div className="md:col-span-2 space-y-4 pt-4">*/}
            {/*  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 border-b pb-2">*/}
            {/*    <Clock size={14} /> Time Buffers (Hours)*/}
            {/*  </h3>*/}
            {/*  <div className="grid grid-cols-2 gap-8">*/}
            {/*    <div>*/}
            {/*      <label className="block text-xs font-bold text-gray-700 mb-1">Commute Buffer</label>*/}
            {/*      <input*/}
            {/*        type="number"*/}
            {/*        value={config.commuteBufferHours}*/}
            {/*        onChange={(e) => setConfig({ ...config, commuteBufferHours: Number(e.target.value) })}*/}
            {/*        className="w-full p-3 border border-gray-200 rounded-lg font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-none"*/}
            {/*        min={0}*/}
            {/*        step={0.5}*/}
            {/*      />*/}
            {/*      <p className="text-[10px] text-gray-400 mt-1">Extra time added before report.</p>*/}
            {/*    </div>*/}
            {/*    <div>*/}
            {/*      <label className="block text-xs font-bold text-gray-700 mb-1">Release Buffer</label>*/}
            {/*      <input*/}
            {/*        type="number"*/}
            {/*        value={config.releaseBufferHours}*/}
            {/*        onChange={(e) => setConfig({ ...config, releaseBufferHours: Number(e.target.value) })}*/}
            {/*        className="w-full p-3 border border-gray-200 rounded-lg font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-none"*/}
            {/*        min={0}*/}
            {/*        step={0.5}*/}
            {/*      />*/}
            {/*      <p className="text-[10px] text-gray-400 mt-1">Extra time added after release.</p>*/}
            {/*    </div>*/}
            {/*  </div>*/}
            {/*</div>*/}
          </div>

          <div className="mt-8 pt-6 border-t flex justify-end">
            <button
              type="submit"
              className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
            >
              <Save size={18} /> Save & Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
