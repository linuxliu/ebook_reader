import React from 'react';
import { createRoot } from 'react-dom/client';
import DebugApp from './DebugApp';
import { AppProvider } from './store';
// import './styles/index.css'; // 暂时注释掉CSS

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <AppProvider>
    <DebugApp />
  </AppProvider>
);