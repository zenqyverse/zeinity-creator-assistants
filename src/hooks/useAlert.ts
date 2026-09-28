import { createContext, useContext } from 'react';

export type AlertType = 'error' | 'warning' | 'info' | 'success';

export interface AlertOptions {
  title: string;
  message: string;
  type?: AlertType;
  technicalDetails?: string;
  solution?: string;
  confirmText?: string;
  cancelText?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  showError: (title: string, message: string, options?: Partial<AlertOptions>) => void;
  showWarning: (title: string, message: string, options?: Partial<AlertOptions>) => void;
  showInfo: (title: string, message: string, options?: Partial<AlertOptions>) => void;
  showSuccess: (title: string, message: string, options?: Partial<AlertOptions>) => void;
  closeAlert: () => void;
}

export const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function useAlert(): AlertContextType {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

export { parseAIError } from '@/lib/gemini';
