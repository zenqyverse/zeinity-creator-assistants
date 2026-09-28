import { useState, useEffect } from 'react';
import { FileText, Trash2, UploadCloud, File as FileIcon, Eye, Copy, Check, X } from 'lucide-react';
import type { UploadedFile } from '@/types';
import { isChannelIdentityFile } from '@/hooks/useFiles';
import { useAlert } from '@/components/AlertModal';
import { formatDate } from '@/lib/date';

interface FileManagerProps {
  files: UploadedFile[];
  loading: boolean;
  onImportFile: () => void;
  onDelete: (id: string) => void;
}

function getFileIcon(type: string | null) {
  if (type === 'docx' || type === 'doc') {
    return <FileText size={22} />;
  }
  return <FileIcon size={22} />;
}

function formatSize(text: string | null): string {
  if (!text) return '0 karakter';
  const words = text.split(/\s+/).filter(Boolean).length;
  return `${text.length.toLocaleString('id-ID')} karakter (~${words} kata)`;
}

export default function FileManager({ files, loading, onImportFile, onDelete }: FileManagerProps) {
  const { showAlert } = useAlert();
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!previewFile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewFile(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [previewFile]);

  const handleDeleteClick = (file: UploadedFile) => {
    const isIdentity = isChannelIdentityFile(file.filename);
    showAlert({
      title: 'Hapus Berkas Referensi?',
      message: isIdentity
        ? `PERINGATAN: "${file.filename}" merupakan Master AI Context identitas saluran Anda. Menghapus berkas ini dapat mempengaruhi konsistensi tone & gaya naskah AI. Yakin ingin melanjutkan?`
        : `Apakah Anda yakin ingin menghapus berkas "${file.filename}"? Berkas ini tidak akan dapat diakses kembali untuk konteks riset AI.`,
      type: 'warning',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      onConfirm: () => {
        onDelete(file.id);
      },
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="main-content">
      <section className="hero">
        <div>
          <p className="eyebrow">Dokumen & Referensi</p>
          <h1>File Manager</h1>
          <p className="subtitle">
            Kelola dokumen referensi yang diekstrak secara lokal untuk konteks AI (Gemini, OpenRouter, & Ollama).
          </p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" type="button" onClick={onImportFile}>
            <UploadCloud size={18} /> Upload Dokumen (.docx, .md, .txt, .csv)
          </button>
        </div>
      </section>

      <section className="pipeline-panel glass">
        <div className="table-head">
          <h2>Berkas Terunggah</h2>
          <span className="record-count">{files.length} berkas</span>
        </div>
        <div className="table-scroll">
          {loading ? (
            <div className="empty-row">Memuat data…</div>
          ) : files.length === 0 ? (
            <div className="empty-row">
              Belum ada berkas. Klik "Upload Dokumen" untuk menambahkan dokumen referensi.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10, padding: 18 }}>
              {files.map((file) => {
                const isIdentity = isChannelIdentityFile(file.filename);
                return (
                  <div
                    key={file.id}
                    className="file-card glass"
                    style={{ borderLeft: isIdentity ? '3px solid var(--cyan)' : undefined }}
                  >
                    <div className="file-icon" style={{ color: isIdentity ? 'var(--cyan)' : undefined }}>
                      {getFileIcon(file.file_type)}
                    </div>
                    <div className="file-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong title={file.filename}>{file.filename}</strong>
                        {isIdentity && (
                          <span
                            className="status-badge"
                            style={{
                              color: 'var(--cyan)',
                              background: 'rgba(79, 232, 255, .15)',
                              padding: '2px 7px',
                              fontSize: '.66rem',
                            }}
                          >
                            ⭐ Master AI Context
                          </span>
                        )}
                      </div>
                      <span>
                        {file.file_type?.toUpperCase() || 'FILE'} · {formatSize(file.extracted_text)} · {formatDate(file.created_at, true)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        className="row-action"
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        title="Pratinjau isi berkas"
                        aria-label={`Pratinjau isi berkas: ${file.filename}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Eye size={13} /> Pratinjau
                      </button>
                      <button
                        className="row-action danger"
                        type="button"
                        onClick={() => handleDeleteClick(file)}
                        title="Hapus berkas"
                        aria-label={`Hapus berkas: ${file.filename}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Extracted Text Preview Modal */}
      {previewFile && (
        <div
          className="modal-layer open"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewFile(null);
          }}
        >
          <div className="modal glass" style={{ maxWidth: 680 }}>
            <div className="modal-top">
              <div style={{ minWidth: 0 }}>
                <h2
                  style={{
                    fontSize: '1.05rem',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                  title={previewFile.filename}
                >
                  {previewFile.filename}
                </h2>
                <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                  {formatSize(previewFile.extracted_text)} · Ekstraksi Dokumen
                </span>
              </div>
              <button className="icon-btn" type="button" onClick={() => setPreviewFile(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginTop: 12, marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: '.8rem', color: 'var(--cyan)', fontWeight: 600 }}>
                  Hasil Ekstraksi Teks (Konteks AI)
                </span>
                <button
                  className="row-action"
                  type="button"
                  onClick={() => handleCopy(previewFile.extracted_text || '')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Tersalin' : 'Salin Teks'}
                </button>
              </div>
              <div className="detail-content" style={{ maxHeight: 380, overflowY: 'auto' }}>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily: '"Space Mono", monospace',
                    fontSize: '.78rem',
                    lineHeight: 1.6,
                    color: '#d8e5f7',
                  }}
                >
                  {previewFile.extracted_text || '(Tidak ada teks terdeteksi dalam dokumen)'}
                </pre>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" type="button" onClick={() => setPreviewFile(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

