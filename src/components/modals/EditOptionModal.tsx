import React, { useState, useEffect } from 'react';
import { Edit3, X, Plane, Split, Plus } from 'lucide-react';
import FlightInput from '../inputs/FlightInput';
import { COMMON_HUBS } from '../../config/constants';
import { moveItem } from '../../utils/dateUtil';
import { Option, Config, FlightSegment } from '../../types';

interface EditOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (option: Option) => void;
  initialOption: Option | null;
  dateContext: string;
  config: Config;
}

const EditOptionModal: React.FC<EditOptionModalProps> = ({ isOpen, onClose, onSave, initialOption, dateContext, config }) => {
  const [strategy, setStrategy] = useState<'direct' | 'hub'>('direct');
  const [hub, setHub] = useState('');
  // Direct Segments
  const [segments, setSegments] = useState<FlightSegment[]>([]);
  // Hub Strategy Parts
  const [inbounds, setInbounds] = useState<FlightSegment[]>([]);
  const [outbounds, setOutbounds] = useState<FlightSegment[]>([]);

  useEffect(() => {
    if (isOpen && initialOption) {
      if (initialOption.type === 'hub-strategy') {
        setStrategy('hub');
        setHub(initialOption.hub || '');
        setInbounds(Array.isArray(initialOption.inbound) ? initialOption.inbound : (initialOption.inbound ? [initialOption.inbound] : []));
        setOutbounds(initialOption.outbound || []);
      } else {
        setStrategy('direct');
        setSegments(initialOption.segments || []);
      }
    } else if (isOpen) {
      setStrategy('direct');
      setHub('');
      setSegments([{ flight: '', dep: '', arr: '', status: '', depAirport: config.homeBase, arrAirport: config.reserveBase }]);
      setInbounds([{ flight: '', dep: '', arr: '', status: '', depAirport: config.homeBase, arrAirport: '' }]);
      setOutbounds([{ flight: '', dep: '', arr: '', status: '', depAirport: '', arrAirport: config.reserveBase, isPrimary: true }]);
    }
  }, [isOpen, initialOption, config]);

  const handleSave = () => {
    let finalOpt: Option;
    if (strategy === 'direct') {
      const cleanSegs = segments.filter(s => s.flight);
      if (cleanSegs.length === 0) return;
      const last = cleanSegs[cleanSegs.length - 1];
      if (!last) return;
      finalOpt = {
        type: 'direct',
        segments: cleanSegs,
        finalArr: last.arr,
        label: last.ground ? `Via ${last.ground.hub}` : undefined
      };
    } else {
      const cleanInbounds = inbounds.filter(i => i.flight);
      const cleanOutbounds = outbounds.filter(o => o.flight);

      if (cleanInbounds.length === 0 && cleanOutbounds.length === 0) return;

      const flaggedOut = cleanOutbounds.map((o, i) => ({ ...o, isPrimary: i === 0, isSecondary: i > 0 }));
      const hubLabel = hub || cleanInbounds[0]?.arrAirport || 'HUB';

      finalOpt = {
        type: 'hub-strategy',
        hub: hubLabel,
        label: `${hubLabel} Strategy`,
        inbound: cleanInbounds,
        outbound: flaggedOut
      };
    }
    onSave(finalOpt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
          <h3 className="font-bold text-lg flex items-center gap-2"><Edit3 size={18} /> {initialOption ? 'Edit Strategy' : 'Add New Strategy'}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 bg-gray-50/50">
          <div className="flex gap-4 mb-6">
            <button onClick={() => setStrategy('direct')} className={`flex-1 py-3 font-bold rounded-lg border transition-all ${strategy === 'direct' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
              Direct / Simple
            </button>
            <button onClick={() => setStrategy('hub')} className={`flex-1 py-3 font-bold rounded-lg border transition-all ${strategy === 'hub' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
              Hub Strategy
            </button>
          </div>

          {strategy === 'direct' ? (
            <div className="space-y-4">
              {segments.map((seg, i) => (
                <FlightInput
                  key={i}
                  label={`Flight Segment #${i + 1}`}
                  value={seg}
                  onChange={(val) => { const n = [...segments]; n[i] = val; setSegments(n); }}
                  showRemove={segments.length > 1}
                  onRemove={() => { const n = segments.filter((_, idx) => idx !== i); setSegments(n); }}
                  onMoveUp={() => setSegments(moveItem(segments, i, i - 1))}
                  onMoveDown={() => setSegments(moveItem(segments, i, i + 1))}
                  isFirst={i === 0}
                  isLast={i === segments.length - 1}
                  config={config}
                  dateContext={dateContext}
                />
              ))}
              <button onClick={() => setSegments([...segments, { flight: '', dep: '', arr: '', status: '' }])} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 font-bold hover:border-indigo-400 hover:text-indigo-500 transition-colors">
                + Add Connecting Leg
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <label className="block text-xs font-bold text-indigo-800 uppercase mb-2">Connecting Hub</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {COMMON_HUBS.map(h => (
                    <button key={h} onClick={() => setHub(h)} className={`text-xs px-2 py-1 rounded border font-bold ${hub === h ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200 hover:border-indigo-400'}`}>
                      {h}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input className="w-24 border p-2 rounded font-bold uppercase" placeholder="HUB" value={hub} onChange={e => setHub(e.target.value.toUpperCase())} />
                  <p className="text-[10px] text-indigo-400">Specify hub if not listed.</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2"><Plane size={14} /> Inbound Legs (To Hub)</h4>
                <div className="pl-6 border-l-2 border-gray-200 ml-1">
                  {inbounds.map((seg, i) => (
                    <FlightInput
                      key={i}
                      label={`Inbound Option #${i + 1}`}
                      value={seg}
                      onChange={(val) => { const n = [...inbounds]; n[i] = val; setInbounds(n); }}
                      showRemove={inbounds.length > 1}
                      onRemove={() => { const n = inbounds.filter((_, idx) => idx !== i); setInbounds(n); }}
                      onMoveUp={() => setInbounds(moveItem(inbounds, i, i - 1))}
                      onMoveDown={() => setInbounds(moveItem(inbounds, i, i + 1))}
                      isFirst={i === 0}
                      isLast={i === inbounds.length - 1}
                      config={config}
                      dateContext={dateContext}
                      defaultSearchFrom={config.homeBase}
                      defaultSearchTo={hub}
                      allowGround={false}
                    />
                  ))}
                  <button onClick={() => setInbounds([...inbounds, { flight: '', dep: '', arr: '', status: '' }])} className="mt-2 text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline">
                    <Plus size={14} /> Add Inbound Option
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2"><Split size={14} /> Outbound Options (From Hub)</h4>
                <div className="pl-6 border-l-2 border-gray-200 ml-1">
                  {outbounds.map((seg, i) => (
                    <FlightInput
                      key={i}
                      label={i === 0 ? "Primary Outbound" : `Alternative Outbound #${i}`}
                      value={seg}
                      onChange={(val) => { const n = [...outbounds]; n[i] = val; setOutbounds(n); }}
                      showRemove={outbounds.length > 1}
                      onRemove={() => { const n = outbounds.filter((_, idx) => idx !== i); setOutbounds(n); }}
                      onMoveUp={() => setOutbounds(moveItem(outbounds, i, i - 1))}
                      onMoveDown={() => setOutbounds(moveItem(outbounds, i, i + 1))}
                      isFirst={i === 0}
                      isLast={i === outbounds.length - 1}
                      config={config}
                      dateContext={dateContext}
                      defaultSearchFrom={hub}
                      defaultSearchTo={config.reserveBase}
                      allowGround={true}
                    />
                  ))}
                  <button onClick={() => setOutbounds([...outbounds, { flight: '', dep: '', arr: '', status: '', isPrimary: false }])} className="mt-2 text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline">
                    <Plus size={14} /> Add Alternative Option
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-white rounded-b-xl flex justify-end gap-2">
          <button onClick={onClose} className="px-5 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 shadow-lg transition-transform active:scale-95">Save Strategy</button>
        </div>
      </div>
    </div>
  );
};

export default EditOptionModal;
