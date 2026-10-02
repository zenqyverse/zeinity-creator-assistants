import { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, FileText, CheckCircle, Loader2 } from 'lucide-react';
import type { UploadedFile } from '@/types';
import { isChannelIdentityFile } from '@/hooks/useFiles';
import { useAlert } from '@/components/AlertModal';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void> | void;
  existingFiles: UploadedFile[];
  isProcessing?: boolean;
}

export default function ImportModal({
  open,
  onClose,
  onImport,
  existingFiles,
  isProcessing = false,
}: ImportModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(open);
  const { showError, showWarning } = useAlert();
  const [dragover, setDragover] = useState(false);
  const [currentFile, setCurrentFile] = useState<{ name: string; ext: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        if (document.querySelector('.alert-modal-layer')) return;
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [open, isProcessing, onClose]);

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['docx', 'txt', 'md', 'csv'];

    if (!ext || !validExtensions.includes(ext)) {
      showWarning(
        'Format File Tidak Didukung',
        `Format .${ext || 'unknown'} tidak didukung. Harap pilih file .docx, .txt, .md, atau .csv.`,
        {
          solution: 'Konversikan berkas ke format .md, .docx, atau .txt sebelum mengunggah.',
        }
      );
      return;
    }

    setCurrentFile({ name: file.name, ext });
    try {
      await onImport(file);
    } catch (err: unknown) {
      showError(
        'Gagal Mengekstrak Dokumen',
        err instanceof Error ? err.message : 'Gagal mengekstrak isi dokumen.'
      );
    } finally {
      setCurrentFile(null);
    }
  };

  return (
    <div
      ref={modalRef}
      className={`modal-layer ${open ? 'open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div className="modal glass">
        <div className="modal-top">
          <h2 id="import-modal-title">Import File Referensi</h2>
          <button
            className="icon-btn"
            type="button"
            aria-label="Tutup modal"
            onClick={onClose}
            disabled={isProcessing}
          >
            <X size={18} />
          </button>
        </div>

        <div
          className={`drop-zone ${dragover ? 'dragover' : ''} ${isProcessing ? 'processing' : ''}`}
          style={{ pointerEvents: isProcessing ? 'none' : 'auto', opacity: isProcessing ? 0.7 : 1 }}
          onDragEnter={(e) => {
            e.preventDefault();
            if (!isProcessing) setDragover(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!isProcessing) setDragover(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragover(false);
          }}
          onDrop={async (e) => {
            e.preventDefault();
            setDragover(false);
            if (!isProcessing && e.dataTransfer.files.length) {
              await handleFile(e.dataTransfer.files[0]);
            }
          }}
        >
          {isProcessing ? (
            <div style={{ padding: '12px 0' }}>
              <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto', color: 'var(--cyan)' }} />
              {currentFile?.ext === 'docx' ? (
                <>
                  <p style={{ fontWeight: 600, color: 'var(--text)', marginTop: 12 }}>
                    Mengekstrak teks dokumen Word ({currentFile.name})…
                  </p>
                  <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: 4 }}>
                    Parsing XML & format Word client-side via Mammoth.js
                  </p>
                </>
              ) : currentFile?.ext === 'csv' ? (
                <>
                  <p style={{ fontWeight: 600, color: 'var(--text)', marginTop: 12 }}>
                    Mengekstrak data tabular CSV ({currentFile.name})…
                  </p>
                  <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: 4 }}>
                    Parsing baris kolom dan data referensi client-side secara lokal
                  </p>
                </>
              ) : (
                <>
                  <p style={{ fontWeight: 600, color: 'var(--text)', marginTop: 12 }}>
                    Mengekstrak berkas teks ({currentFile?.name || 'dokumen'})…
                  </p>
                  <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: 4 }}>
                    Membaca struktur teks dokumen client-side secara instan
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <UploadCloud size={36} style={{ margin: '0 auto', color: 'var(--cyan)', opacity: 0.8 }} />
              <p style={{ fontWeight: 600, color: 'var(--text)', marginTop: 10 }}>
                Tarik file ke sini atau pilih dari perangkat
              </p>
              <p style={{ fontSize: '.82rem', color: '#8fa5c2', marginTop: 6 }}>
                Format didukung: <strong>.DOCX</strong> (ekstraksi via Mammoth), <strong>.TXT</strong>, <strong>.MD</strong>, <strong>.CSV</strong>
              </p>
              <label className="btn btn-secondary" style={{ marginTop: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Pilih File
                <input
                  ref={inputRef}
                  type="file"
                  accept=".docx,.csv,.txt,.md"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    if (e.target.files?.length) {
                      const file = e.target.files[0];
                      e.target.value = ''; // Reset input to allow selecting same file again
                      await handleFile(file);
                    }
                  }}
                />
              </label>
            </>
          )}
        </div>

        {/* Existing files list */}
        {existingFiles.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <h3 style={{ fontSize: '.82rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
              Dokumen Referensi Tersimpan ({existingFiles.length})
            </h3>
            <div style={{ display: 'grid', gap: 8, maxHeight: 160, overflowY: 'auto', paddingRight: 4 }}>
              {existingFiles.map((f) => {
                const isIdentity = isChannelIdentityFile(f.filename);
                const charCount = f.extracted_text ? f.extracted_text.length : 0;
                return (
                  <div
                    key={f.id}
                    className="file-reference"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      margin: 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <FileText size={18} style={{ color: isIdentity ? 'var(--cyan)' : 'var(--muted)', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <strong
                          style={{ fontSize: '.78rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }}
                          title={f.filename}
                        >
                          {f.filename}
                        </strong>
                        <span style={{ fontSize: '.68rem', color: 'var(--muted)', display: 'block', marginTop: 2 }}>
                          {f.file_type?.toUpperCase()} · {charCount.toLocaleString('id-ID')} karakter
                        </span>
                      </div>
                    </div>
                    {isIdentity ? (
                      <span className="status-badge" style={{ fontSize: '.65rem', padding: '3px 7px', color: 'var(--cyan)', background: 'rgba(79, 232, 255, .15)' }}>
                        Konteks AI
                      </span>
                    ) : (
                      <CheckCircle size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 18 }}>
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={isProcessing}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

