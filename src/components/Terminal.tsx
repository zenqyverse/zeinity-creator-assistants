import React, { useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { X, Trash2, Terminal as TerminalIcon, GripHorizontal } from 'lucide-react';
import type { LogEntry } from '@/types';
import {
  TerminalContext,
  useTerminal,
  type TerminalStatus,
  type TerminalContextType,
} from '@/hooks/useTerminal';

// eslint-disable-next-line react-refresh/only-export-components
export { useTerminal, type TerminalStatus, type TerminalContextType };

interface TerminalViewProps {
  open: boolean;
  title?: string;
  status?: TerminalStatus;
  logs: LogEntry[];
  progress: number;
  onClose: () => void;
  onClear?: () => void;
}

export function TerminalView({
  open,
  title = 'AI Activity Log',
  status = 'LIVE',
  logs,
  progress,
  onClose,
  onClear,
}: TerminalViewProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLElement>(null);

  // Position state for Drag & Drop
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragInfoRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    initialLeft: number;
    initialTop: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialLeft: 0,
    initialTop: 0,
  });

  // State for closing animation (fade out slide right)
  const [isClosing, setIsClosing] = useState(false);

  // Auto-dismiss and hover tracking refs
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHoveredRef = useRef(false);
  const isHoveredRef = useRef(false);
  const autoDismissArmedRef = useRef(false);

  // Auto scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Keep terminal inside viewport on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev || !terminalRef.current) return prev;
        const rect = terminalRef.current.getBoundingClientRect();
        const maxX = Math.max(8, window.innerWidth - rect.width - 8);
        const maxY = Math.max(8, window.innerHeight - rect.height - 8);
        return {
          x: Math.max(8, Math.min(maxX, prev.x)),
          y: Math.max(8, Math.min(maxY, prev.y)),
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const clearDismissTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const triggerExitAnimation = useCallback(() => {
    clearDismissTimer();
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      autoDismissArmedRef.current = false;
      hasHoveredRef.current = false;
    }, 400); // Matches CSS slideOutRight animation duration (.4s)
  }, [clearDismissTimer, onClose]);

  const scheduleDismiss = useCallback(
    (delayMs: number) => {
      clearDismissTimer();
      timerRef.current = setTimeout(() => {
        triggerExitAnimation();
      }, delayMs);
    },
    [clearDismissTimer, triggerExitAnimation]
  );

  // Auto-dismiss trigger when activity finishes
  useEffect(() => {
    if (status === 'LIVE') {
      clearDismissTimer();
      setIsClosing(false);
      autoDismissArmedRef.current = true;
      hasHoveredRef.current = false;
    }

    // When activity completes: status DONE & progress 100%
    if (open && status === 'DONE' && progress >= 100 && autoDismissArmedRef.current && !isClosing) {
      if (!isHoveredRef.current) {
        // If hovered previously: 2s (2000ms), otherwise default 5s (5000ms)
        const delay = hasHoveredRef.current ? 2000 : 5000;
        scheduleDismiss(delay);
      }
    }

    // Do NOT auto dismiss if status is ERROR
    if (status === 'ERROR') {
      clearDismissTimer();
      autoDismissArmedRef.current = false;
    }
  }, [status, progress, open, isClosing, clearDismissTimer, scheduleDismiss]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      clearDismissTimer();
    };
  }, [clearDismissTimer]);

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    hasHoveredRef.current = true;
    // Pause / cancel ongoing timer while user reads
    clearDismissTimer();
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    // When cursor leaves after hovering, use 2s (2000ms) delay
    if (open && status === 'DONE' && progress >= 100 && autoDismissArmedRef.current && !isClosing) {
      scheduleDismiss(2000);
    }
  };

  const handleManualClose = () => {
    if (isClosing) return;
    triggerExitAnimation();
  };

  // Drag & drop pointer handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) {
      return;
    }
    if (!terminalRef.current) return;

    const rect = terminalRef.current.getBoundingClientRect();
    dragInfoRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: rect.left,
      initialTop: rect.top,
    };

    if (!position) {
      setPosition({ x: rect.left, y: rect.top });
    }

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Safe fallback
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragInfoRef.current.isDragging || !terminalRef.current) return;

    const deltaX = e.clientX - dragInfoRef.current.startX;
    const deltaY = e.clientY - dragInfoRef.current.startY;

    const targetX = dragInfoRef.current.initialLeft + deltaX;
    const targetY = dragInfoRef.current.initialTop + deltaY;

    const rect = terminalRef.current.getBoundingClientRect();
    const maxX = Math.max(0, window.innerWidth - rect.width - 8);
    const maxY = Math.max(0, window.innerHeight - rect.height - 8);

    const clampedX = Math.max(8, Math.min(maxX, targetX));
    const clampedY = Math.max(8, Math.min(maxY, targetY));

    setPosition({ x: clampedX, y: clampedY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragInfoRef.current.isDragging) {
      dragInfoRef.current.isDragging = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
    }
  };

  return (
    <aside
      ref={terminalRef}
      className={`terminal glass ${open ? 'open' : ''} ${isClosing ? 'closing' : ''}`}
      aria-live="polite"
      aria-label={title}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        zIndex: 55,
        ...(position
          ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
              right: 'auto',
              bottom: 'auto',
            }
          : {}),
      }}
    >
      <div
        className="terminal-bar"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        title="Klik dan seret untuk memindahkan jendela log"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GripHorizontal size={14} style={{ color: 'var(--muted)', opacity: 0.6 }} />
          <TerminalIcon size={14} style={{ color: 'var(--cyan)' }} />
          <span className="terminal-title">{title}</span>
          {status === 'LIVE' && <span className="live">● LIVE</span>}
          {status === 'DONE' && (
            <span className="live" style={{ color: 'var(--green)', letterSpacing: '0.5px' }}>
              ✓ SELESAI
            </span>
          )}
          {status === 'ERROR' && (
            <span className="live" style={{ color: 'var(--danger)', letterSpacing: '0.5px' }}>
              ✖ ERROR
            </span>
          )}
          {status === 'IDLE' && (
            <span className="live" style={{ color: 'var(--muted)', letterSpacing: '0.5px' }}>
              READY
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {onClear && logs.length > 0 && (
            <button
              className="icon-btn"
              type="button"
              aria-label="Bersihkan log"
              onClick={onClear}
              title="Bersihkan riwayat log"
              style={{ width: 26, height: 26, fontSize: '.75rem', opacity: 0.7 }}
            >
              <Trash2 size={13} />
            </button>
          )}
          <button
            className="icon-btn"
            type="button"
            aria-label="Tutup terminal"
            onClick={handleManualClose}
            title="Tutup terminal log"
            style={{ width: 28, height: 28, fontSize: '.75rem' }}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="terminal-log" ref={logRef}>
        {logs.length === 0 ? (
          <div style={{ color: '#567092', fontStyle: 'italic', padding: '6px 0' }}>
            Belum ada aktivitas yang tercatat.
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="log-line">
              <span style={{ color: 'var(--cyan)', marginRight: 6 }}>›</span>
              {log.message}
            </div>
          ))
        )}
      </div>
      <div className="terminal-progress">
        <div
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            background:
              status === 'ERROR'
                ? 'var(--danger)'
                : status === 'DONE'
                ? 'linear-gradient(90deg, var(--green), #22c55e)'
                : 'linear-gradient(90deg, var(--cyan), var(--green))',
            boxShadow:
              status === 'ERROR'
                ? '0 0 12px var(--danger)'
                : '0 0 12px var(--cyan)',
          }}
        />
      </div>
    </aside>
  );
}

// Backward-compatible default export
export default function Terminal(props: {
  open: boolean;
  logs: LogEntry[];
  progress: number;
  onClose: () => void;
  title?: string;
  status?: TerminalStatus;
  onClear?: () => void;
}) {
  return <TerminalView {...props} />;
}

export function TerminalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('AI Activity Log');
  const [status, setStatus] = useState<TerminalStatus>('IDLE');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);

  const openTerminal = useCallback((newTitle?: string) => {
    if (newTitle) setTitle(newTitle);
    setIsOpen(true);
  }, []);

  const closeTerminal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setProgress(0);
    setStatus('IDLE');
  }, []);

  const startActivity = useCallback((activityTitle: string, initialMessage?: string) => {
    setTitle(activityTitle);
    setStatus('LIVE');
    setProgress(initialMessage ? 20 : 10);
    const newLogs: LogEntry[] = initialMessage
      ? [{ message: initialMessage, timestamp: Date.now() }]
      : [];
    setLogs(newLogs);
    setIsOpen(true);
  }, []);

  const addLog = useCallback((message: string, nextProgress?: number) => {
    setLogs((prev) => [...prev, { message, timestamp: Date.now() }]);
    if (typeof nextProgress === 'number') {
      setProgress(nextProgress);
    }
  }, []);

  const finishActivity = useCallback((completionMessage?: string) => {
    if (completionMessage) {
      setLogs((prev) => [...prev, { message: completionMessage, timestamp: Date.now() }]);
    }
    setProgress(100);
    setStatus('DONE');
  }, []);

  const errorActivity = useCallback((errorMessage: string) => {
    setLogs((prev) => [...prev, { message: `ERROR: ${errorMessage}`, timestamp: Date.now() }]);
    setProgress(100);
    setStatus('ERROR');
  }, []);

  return (
    <TerminalContext.Provider
      value={{
        isOpen,
        title,
        status,
        logs,
        progress,
        openTerminal,
        closeTerminal,
        clearLogs,
        startActivity,
        addLog,
        finishActivity,
        errorActivity,
        setProgress,
      }}
    >
      {children}
      <TerminalView
        open={isOpen}
        title={title}
        status={status}
        logs={logs}
        progress={progress}
        onClose={closeTerminal}
        onClear={clearLogs}
      />
    </TerminalContext.Provider>
  );
}
