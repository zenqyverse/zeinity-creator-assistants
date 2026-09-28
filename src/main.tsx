import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AlertProvider } from './components/AlertModal.tsx';
import { TerminalProvider } from './components/Terminal.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlertProvider>
      <TerminalProvider>
        <App />
      </TerminalProvider>
    </AlertProvider>
  </StrictMode>
);
