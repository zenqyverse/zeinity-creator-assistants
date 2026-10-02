import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Bot } from 'lucide-react';
import {
  CONTENT_PILLARS,
  CONTENT_STATUSES,
  type ContentSource,
  type ContentStatus,
  normalizeContentPillar,
} from '@/types';
import { useAlert } from '@/components/AlertModal';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface AddIdeaModalProps {
  open: boolean;
  onClose: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onAdd: (data: {
    title: string;
    source: ContentSource;
    category: string;
    research_text: string | null;
    status?: ContentStatus;
    telegram_message_id?: number | null;
    telegram_chat_id?: string | null;
    telegram_sender_username?: string | null;
  }) => Promise<void> | void;
  initialData?: {
    title: string;
    source: ContentSource;
    category: string;
    research_text: string | null;
    status?: ContentStatus;
    telegram_message_id?: number | null;
    telegram_chat_id?: string | null;
    telegram_sender_username?: string | null;
  };
}

// 5 Pilar Konten Resmi Zeinity (tersinkronisasi dari types.ts)
// 1. Internet & Social Media Culture
// 2. AI & Technology Impact
// 3. Digital Economy & Creator Economy
// 4. Gaming & Digital Entertainment
// 5. Modern Life & Digital Psychology
const categories = CONTENT_PILLARS;

export default function AddIdeaModal({ open, onClose, onDirtyChange, onAdd, initialData }: AddIdeaModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(open);
  const { showAlert, showWarning } = useAlert();
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<ContentSource>('Web');
  const [category, setCategory] = useState<string>(categories[0]);
  const [status, setStatus] = useState<ContentStatus>('Idea');
  const [context, setContext] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialTitle = initialData?.title || '';
  const initialSource = initialData?.source || 'Web';
  const initialCategory = initialData?.category ? normalizeContentPillar(initialData.category) : categories[0];
  const initialStatus = initialData?.status || 'Idea';
  const initialContext = initialData?.research_text || '';

  const resetForm = useCallback(() => {
    setTitle(initialTitle);
    setSource(initialSource);
    setCategory(initialCategory);
    setStatus(initialStatus);
    setContext(initialContext);
    setHasError(false);
  }, [initialTitle, initialSource, initialCategory, initialStatus, initialContext]);

  // Create a fingerprint of initialData to prevent parent re-renders (e.g. from isDirty updates)
  // from wiping out the user's input due to new object references
  const initialDataKey = initialData
    ? `${initialData.title}|${initialData.source}|${initialData.category}|${initialData.status}|${initialData.research_text}|${initialData.telegram_message_id}`
    : '';

  const prevOpenRef = useRef(false);
  const prevDataKeyRef = useRef(initialDataKey);

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    const dataKeyChanged = open && initialDataKey !== prevDataKeyRef.current;

    if (justOpened || dataKeyChanged) {
      setTitle(initialTitle);
      setSource(initialSource);
      setCategory(initialCategory);
      setStatus(initialStatus);
      setContext(initialContext);
      setHasError(false);
    }

    prevOpenRef.current = open;
    prevDataKeyRef.current = initialDataKey;
  }, [open, initialDataKey, initialTitle, initialSource, initialCategory, initialStatus, initialContext]);

  const isDirty =
    title !== initialTitle ||
    source !== initialSource ||
    category !== initialCategory ||
    (Boolean(initialData) && status !== initialStatus) ||
    context !== initialContext;

  useEffect(() => {
    onDirtyChange?.(open && isDirty);
  }, [open, isDirty, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  const handleRequestClose = useCallback(() => {
    if (isSubmitting) return;
    if (isDirty) {
      showAlert({
        title: 'Tinggalkan Formulir?',
        message: 'Perubahan data ide yang telah Anda masukkan belum disimpan. Apakah Anda yakin ingin membatalkan dan keluar?',
        type: 'warning',
        confirmText: 'Ya, Buang Perubahan',
        cancelText: 'Lanjutkan Mengisi',
        onConfirm: () => {
          resetForm();
          onClose();
        },
      });
    } else {
      resetForm();
      onClose();
    }
  }, [isSubmitting, isDirty, onClose, resetForm, showAlert]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        if (document.querySelector('.alert-modal-layer')) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [open, isSubmitting, handleRequestClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!title.trim()) {
      setHasError(true);
      showWarning(
        'Judul Ide Tidak Boleh Kosong',
        'Harap berikan judul atau topik konten sebelum menyimpan ke pipeline.',
        {
          solution: 'Tuliskan topik atau gagasan konten Anda pada kolom "Judul Ide".',
        }
      );
      return;
    }
    
    setHasError(false);
    setIsSubmitting(true);
    try {
      await onAdd({
        title: title.trim(),
        source,
        category,
        research_text: context.trim() || null,
        status,
        telegram_message_id: initialData?.telegram_message_id ?? null,
        telegram_chat_id: initialData?.telegram_chat_id ?? null,
        telegram_sender_username: initialData?.telegram_sender_username ?? null,
      });
      resetForm();
    } catch (err) {
      // Retain form inputs if submission fails so user doesn't lose data
      console.error('Error adding/updating idea:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={modalRef}
      className={`modal-layer ${open ? 'open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="idea-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) handleRequestClose(); }}
    >
      <form className="modal glass" onSubmit={handleSubmit}>
        <div className="modal-top">
          <h2 id="idea-modal-title">{initialData ? 'Edit Ide' : 'Tambah Ide Baru'}</h2>
          <button className="icon-btn" type="button" aria-label="Tutup modal" onClick={handleRequestClose} disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>
        {Boolean(initialData?.telegram_message_id) && (
          <div
            style={{
              padding: '8px 12px',
              marginBottom: 12,
              borderRadius: 6,
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.76rem',
              color: '#4ade80',
            }}
          >
            <Bot size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>Verified Bot:</strong> Ide ini diterima otomatis via Telegram Bot (Message ID: {initialData?.telegram_message_id}
              {initialData?.telegram_sender_username ? `, Pengirim: @${initialData.telegram_sender_username}` : ''})
            </span>
          </div>
        )}
        <div className="field">
          <label htmlFor="ideaTitle">Judul Ide</label>
          <input
            id="ideaTitle"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (hasError && e.target.value.trim()) setHasError(false);
            }}
            placeholder="Masukkan judul ide konten…"
            style={{ borderColor: hasError ? 'var(--danger)' : undefined }}
          />
          {hasError && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>Judul ide tidak boleh kosong.</span>}
        </div>
        <div className="field">
          <label htmlFor="ideaSource">Source</label>
          <select
            id="ideaSource"
            value={source}
            onChange={(e) => setSource(e.target.value as ContentSource)}
          >
            <option value="Web">Web</option>
            <option value="Telegram">Telegram</option>
            <option value="YouTube Trends">YouTube Trends</option>
            <option value="Google Trends">Google Trends</option>
            <option value="RSS">RSS</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="ideaCategory">Category</label>
          <select
            id="ideaCategory"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {Boolean(initialData) && (
          <div className="field">
            <label htmlFor="ideaStatus">Status Pipeline</label>
            <select
              id="ideaStatus"
              value={status}
              onChange={(e) => setStatus(e.target.value as ContentStatus)}
            >
              {CONTENT_STATUSES.filter((s) => s !== 'Validating').map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor="ideaContext">Konteks / catatan singkat</label>
          <textarea
            id="ideaContext"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Tambahkan konteks atau catatan untuk AI…"
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" type="button" onClick={handleRequestClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : (initialData ? 'Simpan Perubahan' : 'Simpan Ide')}
          </button>
        </div>
      </form>
    </div>
  );
}
