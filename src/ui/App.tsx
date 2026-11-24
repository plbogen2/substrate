import React from 'react';
import { WorldProvider } from 'koota/react';
import { clientMirror } from './mirror';
import { VitalHeader } from './components/VitalHeader';
import { InspectorDrawer } from './components/InspectorDrawer';
import { TerminalLog } from './components/TerminalLog';

export const App: React.FC = () => {
  return (
    <WorldProvider world={clientMirror.world}>
      <div id="app">
        <VitalHeader />
        <div className="viewport-container" id="viewport-container">
          <canvas id="matrix-canvas" />
        </div>
        <InspectorDrawer />
        <TerminalLog />
      </div>
    </WorldProvider>
  );
};
