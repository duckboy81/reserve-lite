import React from 'react';
import {Plane, Split, Plus} from 'lucide-react';
import FlightInput from '../inputs/FlightInput';
import {moveItem} from '../../utils/dateUtil';
import {Config, FlightSegment} from '../../types';

interface HubStrategyInputsProps {
  inbounds: FlightSegment[];
  setInbounds: (segments: FlightSegment[]) => void;
  outbounds: FlightSegment[];
  setOutbounds: (segments: FlightSegment[]) => void;
  hub: string;
  config: Config;
  dateContext: string;
  isGuest: boolean;
}

const HubStrategyInputs: React.FC<HubStrategyInputsProps> = ({
                                                               inbounds,
                                                               setInbounds,
                                                               outbounds,
                                                               setOutbounds,
                                                               hub,
                                                               config,
                                                               dateContext,
                                                               isGuest,
                                                             }) => {
  return (
    <>
      <div>
        <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2"><Plane size={14}/> Inbound Legs (To
          Hub)</h4>
        <div className="pl-6 border-l-2 border-gray-200 ml-1">
          {inbounds.map((seg, i) => (
            <FlightInput
              key={i}
              label={`Inbound Option #${i + 1}`}
              value={seg}
              onChange={(val) => {
                const n = [...inbounds];
                n[i] = val;
                setInbounds(n);
              }}
              showRemove={inbounds.length > 1}
              onRemove={() => {
                const n = inbounds.filter((_, idx) => idx !== i);
                setInbounds(n);
              }}
              onMoveUp={() => setInbounds(moveItem(inbounds, i, i - 1))}
              onMoveDown={() => setInbounds(moveItem(inbounds, i, i + 1))}
              isFirst={i === 0}
              isLast={i === inbounds.length - 1}
              config={config}
              dateContext={dateContext}
              defaultSearchFrom={config.homeBase}
              defaultSearchTo={hub}
              allowGround={false}
              isGuest={isGuest}
            />
          ))}
          <button onClick={() => setInbounds([...inbounds, {flight: '', dep: '', arr: '', status: ''}])}
                  className="mt-2 text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline">
            <Plus size={14}/> Add Inbound Option
          </button>
        </div>
      </div>

      <div>
        <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2"><Split size={14}/> Outbound Options
          (From Hub)</h4>
        <div className="pl-6 border-l-2 border-gray-200 ml-1">
          {outbounds.map((seg, i) => (
            <FlightInput
              key={i}
              label={i === 0 ? "Primary Outbound" : `Alternative Outbound #${i}`}
              value={seg}
              onChange={(val) => {
                const n = [...outbounds];
                n[i] = val;
                setOutbounds(n);
              }}
              showRemove={outbounds.length > 1}
              onRemove={() => {
                const n = outbounds.filter((_, idx) => idx !== i);
                setOutbounds(n);
              }}
              onMoveUp={() => setOutbounds(moveItem(outbounds, i, i - 1))}
              onMoveDown={() => setOutbounds(moveItem(outbounds, i, i + 1))}
              isFirst={i === 0}
              isLast={i === outbounds.length - 1}
              config={config}
              dateContext={dateContext}
              defaultSearchFrom={hub}
              defaultSearchTo={config.reserveBase}
              allowGround={true}
              isGuest={isGuest}
            />
          ))}
          <button
            onClick={() => setOutbounds([...outbounds, {flight: '', dep: '', arr: '', status: '', isPrimary: false}])}
            className="mt-2 text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline">
            <Plus size={14}/> Add Alternative Option
          </button>
        </div>
      </div>
    </>
  );
};

export default HubStrategyInputs;
