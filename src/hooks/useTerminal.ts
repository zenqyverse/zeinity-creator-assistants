import { createContext, useContext, Dispatch, SetStateAction } from 'react';
import type { LogEntry } from '@/types';

export type TerminalStatus = 'LIVE' | 'DONE' | 'ERROR' | 'IDLE';

export interface TerminalContextType {
  isOpen: boolean;
  title: string;
  status: TerminalStatus;
  logs: LogEntry[];
  progress: number;
  openTerminal: (title?: string) => void;
  closeTerminal: () => void;
  clearLogs: () => void;
  startActivity: (title: string, initialMessage?: string) => void;
  addLog: (message: string, progress?: number) => void;
  finishActivity: (completionMessage?: string) => void;
  errorActivity: (errorMessage: string) => void;
  setProgress: Dispatch<SetStateAction<number>>;
}

export const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export function useTerminal(): TerminalContextType {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminal must be used within a TerminalProvider');
  }
  return context;
}
