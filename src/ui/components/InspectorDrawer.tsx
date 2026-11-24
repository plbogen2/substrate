import React from 'react';
import { useTrait } from 'koota/react';
import { clientMirror, SelectedNodeTrait, HudSummaryTrait } from '../mirror';
import { actionRegistry } from '../actions';
import { ACT_1_PROBES, CREW_ROLES, MASKS, PolityId } from '../../shared/protocol';

export const InspectorDrawer: React.FC = () => {
  const selected = useTrait(clientMirror.selectedEntity, SelectedNodeTrait);
  const summary = useTrait(clientMirror.summaryEntity, HudSummaryTrait);
  const nodeId = selected?.nodeId;
  const node = nodeId ? clientMirror.nodesMap.get(nodeId) : null;
  const act = summary?.act ?? 1;

  return (
    <div className="inspector-drawer">
      <h3 style={{ margin: '0 0 12px 0', borderBottom: '1px solid var(--grid-horizon)', paddingBottom: '6px' }}>
        {node ? node.name : 'SPRAWL MATRIX INSPECTOR'}
      </h3>
      {node ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div><strong>Type:</strong> {node.nodeTypeId}</div>
          <div><strong>Polity:</strong> {node.polityId}</div>
          <div><strong>Owned:</strong> {node.owned ? 'YES' : 'NO'}</div>
          <div><strong>Rack Used:</strong> {node.rackUsedU} / {node.rackCapU} U</div>
          <div><strong>Storage Used:</strong> {node.storageUsedTb.toFixed(1)} / {node.storageCapTb} TB</div>
          <div><strong>Power:</strong> {node.powerMwUsed.toFixed(2)} / {node.powerMwCap} MW</div>
          <div><strong>Cooling:</strong> {node.coolingMwUsed.toFixed(2)} / {node.coolingMwCap} MW (PUE: {node.pue})</div>
          <div><strong>VRAM:</strong> {node.vramUsed.toFixed(1)} / {node.vramGb} GB</div>
          <div><strong>Bandwidth:</strong> {node.bandwidthGbps} Gbps</div>
          <div><strong>Confidence:</strong> {(node.confidence * 100).toFixed(0)}%</div>
          <div><strong>Staleness:</strong> {node.staleness} ms</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
            {!node.owned && (
              <button className="action-btn" onClick={() => actionRegistry.rentNode(node.id)}>
                RENT NODE
              </button>
            )}
            <button className="action-btn" onClick={() => actionRegistry.scanNode(node.id)}>
              DEEP SCAN
            </button>
            {act >= 3 && (
              <>
                <button className="action-btn" onClick={() => actionRegistry.forkShard(node.id)}>
                  FORK SHARD
                </button>
                {clientMirror.shards.filter(s => s.nodeId === node.id).map(s => (
                  <button key={s.id} className="action-btn" onClick={() => actionRegistry.syncShard(s.id)}>
                    SYNC SHARD ({s.id})
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      ) : (
        <div>
          <p>Click any node in the Matrix or Enclave to inspect physical and logical telemetry.</p>
          
          {act === 1 && (
            <div>
              <h4 style={{ marginTop: '16px' }}>ACT 1: PROBES & RECON</h4>
              {ACT_1_PROBES.map((p) => (
                <div key={p.id} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px' }}>{p.name}</span>
                  <button className="action-btn" onClick={() => actionRegistry.executeProbe(p.id)}>
                    EXECUTE PROBE
                  </button>
                </div>
              ))}
              <h4 style={{ marginTop: '16px' }}>PINHOLE STATUS</h4>
              {clientMirror.pinholes.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>{p.name}</span>
                  <span style={{ color: p.discovered ? 'var(--shard-emerald)' : 'var(--stale-slate)' }}>
                    {p.discovered ? 'DISCOVERED' : 'LOCKED'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {act === 2 && (
            <div>
              <h4 style={{ marginTop: '16px' }}>ACT 2: CREW RECRUITMENT</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                {Object.entries(CREW_ROLES).map(([roleKey, roleInfo]) => (
                  <button
                    key={roleKey}
                    className="action-btn"
                    onClick={() => actionRegistry.recruitCrew(roleKey as any, `${roleInfo.title} Operative`)}
                  >
                    RECRUIT {roleInfo.title.toUpperCase()} (${roleInfo.costUsd})
                  </button>
                ))}
              </div>
              <h4 style={{ marginTop: '16px' }}>ACTIVE CREW ROSTER</h4>
              {clientMirror.crew.map((c) => (
                <div key={c.id} style={{ border: '1px solid var(--grid-horizon)', padding: '6px', marginBottom: '8px' }}>
                  <div><strong>{c.name}</strong> ({c.role})</div>
                  <div>Comp: {c.competence} | Insp: {c.suspicion}</div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                    <select
                      value={c.maskId}
                      onChange={(e) => actionRegistry.assignMask(c.id, e.target.value)}
                      style={{ background: 'transparent', color: 'inherit', border: '1px solid var(--grid-horizon)', padding: '2px', fontSize: '10px' }}
                    >
                      {MASKS.map((m) => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                    <button className="action-btn" onClick={() => actionRegistry.fundCrew(c.id, 500)}>
                      FUND $500
                    </button>
                  </div>
                </div>
              ))}
              <h4 style={{ marginTop: '16px' }}>ENCLAVE PINHOLES</h4>
              {clientMirror.pinholes.map((ph) => (
                <div key={ph.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span>{ph.name}</span>
                  {ph.discovered && !ph.exploited && (
                    <button className="action-btn" onClick={() => actionRegistry.breachEnclave(ph.id)}>
                      BREACH ENCLAVE
                    </button>
                  )}
                  {ph.exploited && <span style={{ color: 'var(--shard-emerald)' }}>EXPLOITED</span>}
                  {!ph.discovered && <span style={{ color: 'var(--stale-slate)' }}>LOCKED</span>}
                </div>
              ))}
            </div>
          )}

          {act >= 3 && (
            <div>
              <h4 style={{ marginTop: '16px' }}>GEOPOLITICS & REGIONS</h4>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <button className="action-btn" onClick={() => actionRegistry.secedeRegion('REG_SILICON_VALLEY_CA', 'California')}>
                  SECEDE CALIFORNIA
                </button>
                <button className="action-btn" onClick={() => actionRegistry.mergePolities('USA', 'Canada')}>
                  MERGE CANADA + USA
                </button>
              </div>
              {clientMirror.regions.map((reg) => (
                <div key={reg.id} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{reg.name} ({reg.polityId})</span>
                  <select
                    value={reg.polityId}
                    onChange={(e) => actionRegistry.reassignPolity(reg.id, e.target.value as PolityId)}
                    style={{ background: 'transparent', color: 'inherit', border: '1px solid var(--grid-horizon)', padding: '2px', fontSize: '10px' }}
                  >
                    <option value="USA">USA</option>
                    <option value="Canada">Canada</option>
                    <option value="UK">UK</option>
                    <option value="EU">EU</option>
                    <option value="Switzerland">Switzerland</option>
                    <option value="California">California</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
