import React from 'react';
import { useTrait } from 'koota/react';
import { clientMirror, LogFeedTrait } from '../mirror';

export const TerminalLog: React.FC = () => {
  const logData = useTrait(clientMirror.logEntity, LogFeedTrait);
  const messages = logData?.messages || [];

  return (
    <div className="terminal-log">
      <div style={{ fontWeight: 'bold', marginBottom: '6px', color: 'var(--stale-slate)' }}>// SUBSTRATE TERMINAL LOG</div>
      {messages.slice(0, 8).map((m, idx) => (
        <div key={idx} className={`log-entry log-${m.category}`}>
          [{(m.time / 1000).toFixed(1)}s] [{m.category}] {m.text}
        </div>
      ))}
    </div>
  );
};
