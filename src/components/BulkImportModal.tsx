import { useState, useRef } from 'react';
import { X, UploadCloud, FileText, Check, Trash2, Sparkles } from 'lucide-react';
import {
  CONTENT_PILLARS,
  type ContentSource,
  normalizeContentPillar,
} from '@/types';
import { useAlert } from '@/components/AlertModal';

import {
  type ParsedIdeaItem,
  parseBulkIdeasText,
} from '@/lib/bulkImport';

export type { ParsedIdeaItem };

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (ideas: Array<{
    title: string;
    source: ContentSource;
    category: string;
    research_text: string | null;
  }>) => Promise<void> | void;
}

export default function BulkImportModal({ open, onClose, onImport }: BulkImportModalProps) {
  const { showError, showWarning } = useAlert();
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [dragover, setDragover] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedIdeaItem[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessText = (text: string, ext = 'txt', name = 'Input Teks') => {
    const items = parseBulkIdeasText(text, ext);
    if (items.length === 0) {
      showWarning(
        'Tidak Ada Ide yang Ditemukan',
        'Sistem tidak menemukan baris ide yang valid dari berkas/teks yang dimasukkan.',
        {
          solution: 'Pastikan berkas berisi daftar ide per baris, list markdown (- judul), atau berkas CSV dengan kolom Judul.',
        }
      );
      return;
    }
    setParsedItems(items);
    setFileName(name);
  };

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['csv', 'md', 'markdown', 'txt'].includes(ext)) {
      showWarning(
        'Format File Tidak Didukung',
        `Format .${ext || 'unknown'} tidak didukung. Harap pilih berkas .csv, .md, atau .txt.`,
        {
          solution: 'Gunakan berkas teks murni seperti CSV, Markdown (.md), atau .txt.',
        }
      );
      return;
    }

    try {
      const text = await file.text();
      handleProcessText(text, ext, file.name);
    } catch (err) {
      showError(
        'Gagal Membaca Berkas',
        err instanceof Error ? err.message : 'Terjadi kesalahan saat membaca isi berkas.'
      );
    }
  };

  const handleToggleSelectAll = () => {
    const allSelected = parsedItems.every((i) => i.selected);
    setParsedItems((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
  };

  const handleToggleItem = (id: string) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleCategoryChange = (id: string, newCat: string) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, category: newCat } : item))
    );
  };

  const handleTitleChange = (id: string, newTitle: string) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title: newTitle } : item))
    );
  };

  const handleDeleteItem = (id: string) => {
    setParsedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleConfirmImport = async () => {
    const selected = parsedItems.filter((i) => i.selected && i.title.trim());
    if (selected.length === 0) {
      showWarning(
        'Pilih Minimal Satu Ide',
        'Centang minimal satu ide konten untuk dimasukkan ke pipeline.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const toImport = selected.map((item) => ({
        title: item.title.trim(),
        source: 'Web' as ContentSource,
        category: normalizeContentPillar(item.category),
        research_text: item.research_text.trim() || null,
      }));
      await onImport(toImport);
      handleReset();
      onClose();
    } catch (err) {
      showError(
        'Gagal Mengimpor Ide Masal',
        err instanceof Error ? err.message : 'Terjadi kesalahan saat menambahkan ide ke database.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setParsedItems([]);
    setFileName(null);
    setPasteText('');
  };

  if (!open) return null;

  const selectedCount = parsedItems.filter((i) => i.selected).length;

  return (
    <div
      className={`modal-layer ${open ? 'open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-import-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="modal glass" style={{ maxWidth: 780, width: '92%' }}>
        <div className="modal-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={20} style={{ color: 'var(--cyan)' }} />
            <h2 id="bulk-import-title" style={{ margin: 0, fontSize: '1.2rem' }}>
              Import Ide Masal (Bulk Import)
            </h2>
          </div>
          <button
            className="icon-btn"
            type="button"
            aria-label="Tutup modal"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.84rem', color: '#9bb0cc', marginTop: 4, marginBottom: 14 }}>
          Unggah berkas daftar ide (CSV, Markdown, atau TXT) atau tempel teks langsung untuk diimpor sekaligus ke pipeline.
        </p>

        {parsedItems.length === 0 ? (
          <>
            {/* Mode Switcher */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                className={`tab ${activeTab === 'file' ? 'active' : ''}`}
                onClick={() => setActiveTab('file')}
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm, 6px)', fontSize: '0.85rem' }}
              >
                Upload Berkas (CSV / MD / TXT)
              </button>
              <button
                type="button"
                className={`tab ${activeTab === 'paste' ? 'active' : ''}`}
                onClick={() => setActiveTab('paste')}
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm, 6px)', fontSize: '0.85rem' }}
              >
                Tempel Teks Langsung
              </button>
            </div>

            {activeTab === 'file' ? (
              <div
                className={`drop-zone ${dragover ? 'dragover' : ''}`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragover(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragover(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragover(false);
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragover(false);
                  if (e.dataTransfer.files.length) {
                    await handleFile(e.dataTransfer.files[0]);
                  }
                }}
                style={{ padding: '32px 20px', textAlign: 'center' }}
              >
                <UploadCloud size={40} style={{ margin: '0 auto', color: 'var(--cyan)', opacity: 0.85 }} />
                <p style={{ fontWeight: 600, color: 'var(--text)', marginTop: 12 }}>
                  Tarik berkas .CSV, .MD, atau .TXT ke sini
                </p>
                <p style={{ fontSize: '.8rem', color: '#8fa5c2', marginTop: 6, lineHeight: 1.4 }}>
                  Mendukung format baris per baris, list Markdown (<code>- Judul Ide</code>), atau tabel CSV (<code>Judul, Kategori, Catatan</code>)
                </p>
                <label
                  className="btn btn-secondary"
                  style={{
                    marginTop: 16,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  Pilih Berkas dari Perangkat
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.md,.markdown,.txt"
                    style={{ display: 'none' }}
                    aria-label="Pilih berkas dokumen masal (.csv, .md, .txt)"
                    onChange={async (e) => {
                      if (e.target.files?.length) {
                        const file = e.target.files[0];
                        e.target.value = '';
                        await handleFile(file);
                      }
                    }}
                  />
                </label>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  aria-label="Kotak teks untuk menempel daftar ide masal"
                  placeholder="Tempel baris-baris ide di sini, contoh:
- Mengapa Algoritma YouTube Berubah di 2026: Pembahasan sistem retensi baru
- Krisis Kreator AI: Dampak monetisasi untuk channel edukasi
- 5 Kebiasaan Digital yang Merusak Fokus: Studi kasus neurosains"
                  style={{
                    width: '100%',
                    minHeight: 180,
                    background: 'rgba(10, 16, 30, 0.7)',
                    border: '1px solid rgba(79, 232, 255, 0.2)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    color: '#e2edff',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleProcessText(pasteText, 'txt', 'Teks Input')}
                  disabled={!pasteText.trim()}
                  style={{ alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Sparkles size={16} /> Parsing Ide Konten
                </button>
              </div>
            )}
          </>
        ) : (
          /* Preview Parsed Items Table */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: 'rgba(79, 232, 255, 0.08)',
                borderRadius: 8,
                border: '1px solid rgba(79, 232, 255, 0.15)',
                fontSize: '0.84rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} style={{ color: 'var(--cyan)' }} />
                <span>
                  Sumber: <strong>{fileName}</strong>
                </span>
                <span style={{ color: 'var(--muted)' }}>•</span>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                  {selectedCount} dari {parsedItems.length} ide terpilih
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleToggleSelectAll}
                  style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                >
                  {parsedItems.every((i) => i.selected) ? 'Batalkan Semua' : 'Pilih Semua'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleReset}
                  style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                >
                  Ganti Berkas
                </button>
              </div>
            </div>

            <div
              style={{
                maxHeight: 340,
                overflow: 'auto',
                WebkitOverflowScrolling: 'touch',
                border: '1px solid rgba(135, 172, 222, 0.15)',
                borderRadius: 'var(--radius-sm, 6px)',
                background: 'rgba(8, 14, 26, 0.6)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid rgba(135, 172, 222, 0.2)' }}>
                    <th style={{ width: 40, padding: '10px 8px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={parsedItems.length > 0 && parsedItems.every((i) => i.selected)}
                        onChange={handleToggleSelectAll}
                        style={{ cursor: 'pointer' }}
                        aria-label="Pilih semua baris ide impor"
                      />
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Judul Ide</th>
                    <th style={{ width: 220, padding: '10px 12px', textAlign: 'left' }}>Pilar Konten</th>
                    <th style={{ width: 50, padding: '10px 8px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {parsedItems.map((item) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid rgba(135, 172, 222, 0.08)',
                        background: item.selected ? 'transparent' : 'rgba(0, 0, 0, 0.25)',
                        opacity: item.selected ? 1 : 0.6,
                      }}
                    >
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => handleToggleItem(item.id)}
                          style={{ cursor: 'pointer' }}
                          aria-label={`Pilih ide: ${item.title || 'Tanpa judul'}`}
                        />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleTitleChange(item.id, e.target.value)}
                          aria-label={`Judul ide: ${item.title || 'baru'}`}
                          style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '1px solid transparent',
                            color: '#e2edff',
                            fontSize: '0.84rem',
                            padding: '4px 0',
                          }}
                          onFocus={(e) => (e.target.style.borderBottom = '1px solid var(--cyan)')}
                          onBlur={(e) => (e.target.style.borderBottom = '1px solid transparent')}
                        />
                        {item.research_text && (
                          <div style={{ fontSize: '0.74rem', color: '#7e96b3', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Catatan: {item.research_text}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <select
                          value={item.category}
                          onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                          aria-label={`Pilar konten untuk ide: ${item.title || 'ini'}`}
                          style={{
                            width: '100%',
                            background: 'rgba(12, 19, 35, 0.9)',
                            border: '1px solid rgba(135, 172, 222, 0.2)',
                            borderRadius: 6,
                            padding: '4px 8px',
                            color: '#e2edff',
                            fontSize: '0.75rem',
                          }}
                        >
                          {CONTENT_PILLARS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => handleDeleteItem(item.id)}
                          title="Hapus baris ini"
                          aria-label={`Hapus baris ide: ${item.title || 'ini'}`}
                          style={{ color: '#ef4444', padding: 4 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Batal
          </button>
          {parsedItems.length > 0 && (
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleConfirmImport}
              disabled={isSubmitting || selectedCount === 0}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Check size={16} />
              {isSubmitting ? 'Mengimpor...' : `Import ${selectedCount} Ide ke Pipeline`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
