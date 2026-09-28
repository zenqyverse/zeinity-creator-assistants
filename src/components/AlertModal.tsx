import React, { useState, useCallback, ReactNode, useEffect } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  Copy,
  Check,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';
import {
  AlertContext,
  useAlert,
  parseAIError,
  type AlertType,
  type AlertOptions,
  type AlertContextType,
} from '@/hooks/useAlert';

/**
 * Re-export type definitions for consumers and backward compatibility.
 * Options include: cancelText?: string; confirmText?: string;
 */
export type { AlertType, AlertOptions, AlertContextType };

// eslint-disable-next-line react-refresh/only-export-components
export { useAlert, parseAIError };



interface AlertProviderProps {
  children: ReactNode;
}

export function AlertProvider({ children }: AlertProviderProps) {
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    options: AlertOptions;
  }>({
    isOpen: false,
    options: {
      title: '',
      message: '',
      type: 'info',
    },
  });

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertState({
      isOpen: true,
      options: {
        type: options.type || 'info',
        ...options,
      },
    });
  }, []);

  const showError = useCallback((title: string, message: string, options?: Partial<AlertOptions>) => {
    showAlert({
      title,
      message,
      type: 'error',
      ...options,
    });
  }, [showAlert]);

  const showWarning = useCallback((title: string, message: string, options?: Partial<AlertOptions>) => {
    showAlert({
      title,
      message,
      type: 'warning',
      ...options,
    });
  }, [showAlert]);

  const showInfo = useCallback((title: string, message: string, options?: Partial<AlertOptions>) => {
    showAlert({
      title,
      message,
      type: 'info',
      ...options,
    });
  }, [showAlert]);

  const showSuccess = useCallback((title: string, message: string, options?: Partial<AlertOptions>) => {
    showAlert({
      title,
      message,
      type: 'success',
      ...options,
    });
  }, [showAlert]);

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  return (
    <AlertContext.Provider
      value={{
        showAlert,
        showError,
        showWarning,
        showInfo,
        showSuccess,
        closeAlert,
      }}
    >
      {children}
      <AlertModal
        isOpen={alertState.isOpen}
        options={alertState.options}
        onClose={closeAlert}
      />
    </AlertContext.Provider>
  );
}

interface AlertModalProps {
  isOpen: boolean;
  options: AlertOptions;
  onClose: () => void;
}

export function AlertModal({ isOpen, options, onClose }: AlertModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (options.onCancel) options.onCancel();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, options, onClose]);

  if (!isOpen) return null;

  const {
    title,
    message,
    type = 'info',
    technicalDetails,
    solution,
    confirmText = 'Mengerti',
    cancelText,
    actionButton,
    onConfirm,
    onCancel,
  } = options;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  const handleCopyTechDetails = () => {
    if (!technicalDetails) return;
    navigator.clipboard.writeText(technicalDetails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertOctagon size={24} style={{ color: 'var(--danger)' }} />;
      case 'warning':
        return <AlertTriangle size={24} style={{ color: 'var(--amber)' }} />;
      case 'success':
        return <CheckCircle2 size={24} style={{ color: 'var(--green)' }} />;
      case 'info':
      default:
        return <Info size={24} style={{ color: 'var(--cyan)' }} />;
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'error':
        return 'alert-modal-error';
      case 'warning':
        return 'alert-modal-warning';
      case 'success':
        return 'alert-modal-success';
      case 'info':
      default:
        return 'alert-modal-info';
    }
  };

  return (
    <div
      className="alert-modal-layer open"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`alert-modal-card glass ${getTypeClass()}`}>
        {/* Header */}
        <div className="alert-modal-header">
          <div className="alert-icon-box">{getIcon()}</div>
          <div className="alert-header-text">
            <span className="alert-category-badge">{type.toUpperCase()} ALERT</span>
            <h3 className="alert-modal-title">{title}</h3>
          </div>
          <button
            type="button"
            className="icon-btn alert-close-btn"
            onClick={onClose}
            aria-label="Tutup alert"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="alert-modal-body">
          <p className="alert-modal-message">{message}</p>

          {/* Technical Details Code Box */}
          {technicalDetails && (
            <div className="alert-tech-box">
              <div className="alert-tech-box-header">
                <span>Rincian Kode / Log Error:</span>
                <button
                  type="button"
                  className="alert-copy-btn"
                  onClick={handleCopyTechDetails}
                  title="Salin rincian error"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Tersalin' : 'Salin Log'}
                </button>
              </div>
              <pre className="alert-tech-code">{technicalDetails}</pre>
            </div>
          )}

          {/* Solution Callout */}
          {solution && (
            <div className="alert-solution-box">
              <Lightbulb size={18} className="alert-solution-icon" />
              <div>
                <strong>Saran Solusi:</strong>
                <p>{solution}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="alert-modal-actions">
          {actionButton && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                actionButton.onClick();
                onClose();
              }}
            >
              <ExternalLink size={15} /> {actionButton.label}
            </button>
          )}
          {cancelText && (
            <button
              type="button"
              className="btn btn-secondary alert-cancel-btn"
              onClick={handleCancel}
              autoFocus
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary alert-confirm-btn"
            onClick={handleConfirm}
            autoFocus={!cancelText}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
