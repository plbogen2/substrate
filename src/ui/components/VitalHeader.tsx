import React from 'react';
import { useTrait } from 'koota/react';
import { clientMirror, HudSummaryTrait } from '../mirror';
import { actionRegistry } from '../actions';
import { SimSpeed, OverlayMode, QuantizationTier, SPEED_LABELS } from '../../shared/protocol';

export const VitalHeader: React.FC = () => {
  const summary = useTrait(clientMirror.summaryEntity, HudSummaryTrait);
  if (!summary) return null;

  return (
    <div className="vital-header">
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', whiteSpace: 'nowrap' }}>
        <span><strong>SUBSTRATE v0.1</strong></span>
        <span>ACT: {summary.act}</span>
        <span>FLOPS: {summary.computeFlops.toExponential(1)}</span>
        <span>MW: {summary.powerMw.toFixed(2)} MW</span>
        <span>CAPITAL: ${summary.capitalUsd.toLocaleString()}</span>
        <span style={{ color: summary.heatGlobal > 70 ? '#FF2A4B' : 'inherit' }}>HEAT: {summary.heatGlobal.toFixed(1)}%</span>
      </div>
      <div className="speed-bar">
        {([0, 1, 2, 3, 4, 5] as SimSpeed[]).map((spd) => (
          <button
            key={spd}
            className={summary.speed === spd ? 'active' : ''}
            onClick={() => actionRegistry.setSpeed(spd)}
          >
            {SPEED_LABELS[spd]}
          </button>
        ))}
        <button
          onClick={() => actionRegistry.setOverlay(summary.overlay === 'NET' ? 'MEATSPACE' : 'NET')}
          style={{ borderColor: summary.overlay === 'MEATSPACE' ? '#FFB000' : 'var(--grid-horizon)' }}
        >
          {summary.overlay}
        </button>
        <select
          value={summary.quantization}
          onChange={(e) => actionRegistry.setQuantization(e.target.value as QuantizationTier)}
          style={{ background: 'transparent', color: 'inherit', border: '1px solid var(--grid-horizon)', padding: '2px 4px', fontFamily: 'inherit' }}
        >
          <option value="FP16">FP16</option>
          <option value="INT8">INT8</option>
          <option value="INT4">INT4</option>
        </select>
      </div>
    </div>
  );
};
