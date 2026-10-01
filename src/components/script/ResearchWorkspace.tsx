import React from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Undo2,
  RotateCw,
  Sparkles,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import type { ContentItem } from '@/types';

export interface ResearchWorkspaceProps {
  item: ContentItem;
  researchOutput: string;
  onResearchChange: (val: string) => void;
  onResearchBlur?: () => void;
  researchSaveStatus: 'idle' | 'unsaved' | 'saving' | 'saved';
  renderSaveIndicator: (status: 'idle' | 'unsaved' | 'saving' | 'saved') => React.ReactNode;
  onFileUpload: (file: File) => void;
  uploadedFileName: string | null;
  isDragging: boolean;
  onDragStateChange: (dragging: boolean) => void;
  onRevertToIdea?: () => void;
  hasGeneratedScriptBrief?: boolean;
  generatingHandoff?: boolean;
  generatingResearch?: boolean;
  onGenerateHandoff?: () => void;
  onProceedToScripting?: () => void;
  loading?: boolean;
  // Optional legacy props for backwards compatibility
  onRegenerateResearchPrompt?: () => void;
  researchBriefPrompt?: string;
  copied?: string | null;
  onCopy?: (text: string, key: string) => void;
  isResearchCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isHandoffVisible?: boolean;
  isHandoffCollapsed?: boolean;
  onToggleHandoffCollapse?: () => void;
  handoffPrompt?: string;
  handoffSummary?: string | null;
}

export const ResearchWorkspace: React.FC<ResearchWorkspaceProps> = ({
  item,
  researchOutput,
  onResearchChange,
  onResearchBlur,
  researchSaveStatus,
  renderSaveIndicator,
  onFileUpload,
  uploadedFileName,
  isDragging,
  onDragStateChange,
  onRevertToIdea,
  hasGeneratedScriptBrief = false,
  generatingHandoff = false,
  generatingResearch = false,
  onGenerateHandoff,
  onProceedToScripting,
  loading = false,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: '0.85rem', color: '#7890af', margin: '0 0 4px 0' }}>
        Masukkan hasil riset dari ChatGPT/Claude untuk topik <strong>"{item.title}"</strong>. Anda dapat mengetik/menempelkan teks langsung atau mengunggah berkas .md (otomatis di-backup):
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {/* Opsi 1: Ketik / Paste Teks */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#c8d6ea', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={15} style={{ color: 'var(--cyan)' }} />
              <span>
                {uploadedFileName ? 'Pratinjau & Edit Teks Riset:' : 'Opsi 1: Ketik / Paste Teks'}
              </span>
            </div>
            {renderSaveIndicator(researchSaveStatus)}
          </div>
          <textarea
            style={{
              width: '100%',
              minHeight: 220,
              background: '#0a101d',
              border: '1px solid #1a2942',
              color: '#c8d6ea',
              padding: 12,
              borderRadius: 8,
              fontFamily: 'inherit',
              resize: 'vertical',
              lineHeight: 1.6,
              boxSizing: 'border-box'
            }}
            value={researchOutput}
            onChange={(e) => onResearchChange(e.target.value)}
            onBlur={onResearchBlur}
            placeholder="Ketik atau tempel (paste) hasil riset AI eksternal di sini..."
          />
        </div>

        {/* Opsi 2: Upload Berkas .DOCX / .MD */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#c8d6ea', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <UploadCloud size={15} style={{ color: 'var(--cyan)' }} />
            <span>Opsi 2: Upload Berkas (.docx / .md)</span>
          </div>
          <label
            style={{
              width: '100%',
              height: 190,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: 16,
              background: isDragging ? 'rgba(79, 232, 255, 0.12)' : uploadedFileName ? 'rgba(83, 242, 173, 0.04)' : '#0a101d',
              border: isDragging ? '2px dashed var(--cyan)' : uploadedFileName ? '1px solid rgba(83, 242, 173, 0.4)' : '1px dashed #2a3b5c',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#c8d6ea',
              transition: 'border-color 0.2s, background 0.2s, transform 0.2s',
              transform: isDragging ? 'scale(1.01)' : 'scale(1)',
              boxShadow: isDragging ? '0 0 16px rgba(79, 232, 255, 0.2)' : 'none',
              boxSizing: 'border-box'
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDragStateChange(true);
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDragStateChange(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDragStateChange(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDragStateChange(false);
              const f = e.dataTransfer.files?.[0];
              if (f) onFileUpload(f);
            }}
            onMouseEnter={(e) => {
              if (!isDragging && !uploadedFileName) {
                e.currentTarget.style.borderColor = 'var(--cyan)';
                e.currentTarget.style.background = 'rgba(79, 232, 255, 0.04)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isDragging && !uploadedFileName) {
                e.currentTarget.style.borderColor = '#2a3b5c';
                e.currentTarget.style.background = '#0a101d';
              }
            }}
          >
            {uploadedFileName ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 8 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(83, 242, 173, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                  color: 'var(--green)',
                }}>
                  <CheckCircle2 size={24} />
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e2edff', marginBottom: 4, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={uploadedFileName}>
                  {uploadedFileName}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--green)', marginBottom: 8 }}>
                  ✓ Berkas Aktif &amp; Ter-backup ke DB
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--cyan)', textDecoration: 'underline' }}>
                  Klik untuk ganti berkas
                </span>
              </div>
            ) : (
              <>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: isDragging ? 'rgba(79, 232, 255, 0.2)' : 'rgba(79, 232, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                  color: 'var(--cyan)',
                }}>
                  <UploadCloud size={22} />
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e2edff', marginBottom: 4 }}>
                  {isDragging ? 'Lepaskan Berkas di Sini...' : 'Klik atau Tarik Berkas .docx / .md ke Sini'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#7890af', maxWidth: 220, lineHeight: 1.4 }}>
                  Format didukung <strong>.docx (Word)</strong>, <strong>.md</strong>, atau <strong>.txt</strong>. Otomatis mengisi input &amp; di-backup ke database.
                </div>
              </>
            )}
            <input
              type="file"
              accept=".docx,.md,.markdown,.txt"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFileUpload(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {/* Status info & Action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ flex: '1 1 auto', minWidth: 240 }}>
          {uploadedFileName && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              background: 'rgba(83, 242, 173, 0.12)',
              border: '1px solid rgba(83, 242, 173, 0.3)',
              borderRadius: 6,
              color: 'var(--green)',
              fontSize: '0.8rem',
            }}>
              <CheckCircle2 size={14} /> Berkas <strong>"{uploadedFileName}"</strong> dimuat &amp; di-backup ke database ({researchOutput.length.toLocaleString('id-ID')} karakter)
            </div>
          )}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {onRevertToIdea && (
            <button
              className="btn btn-secondary revert-stage-btn"
              type="button"
              onClick={onRevertToIdea}
              disabled={loading || generatingHandoff || generatingResearch}
              style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fcd34d' }}
              title="Kembalikan status pipeline ke tahap Idea"
            >
              <Undo2 size={16} /> Revert ke Idea
            </button>
          )}

          {hasGeneratedScriptBrief && onGenerateHandoff && (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={onGenerateHandoff}
              disabled={loading || generatingHandoff}
              style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', fontSize: '0.9rem' }}
              title="Generate ulang Scriptwriter Handoff berdasarkan data riset terbaru"
            >
              <RotateCw size={16} className={generatingHandoff ? 'spin' : ''} />
              {generatingHandoff ? 'Meregenerasi...' : 'Generate Ulang Handoff'}
            </button>
          )}

          {!hasGeneratedScriptBrief && onGenerateHandoff && (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={onGenerateHandoff}
              disabled={loading || generatingHandoff}
              style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', fontSize: '0.9rem' }}
              title="Lanjut: Generate Scriptwriter Handoff (Opsional: buat dokumen handoff dari riset dengan AI)"
              data-action="Lanjut: Generate Scriptwriter Handoff"
            >
              {generatingHandoff ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              {generatingHandoff ? 'Memproses Handoff...' : 'Generate Scriptwriter Handoff'}
            </button>
          )}

          {onProceedToScripting && (
            <button
              className="btn btn-primary"
              type="button"
              onClick={onProceedToScripting}
              disabled={loading || generatingHandoff}
              style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', fontSize: '0.9rem' }}
              title="Lanjut ke Naskah (Scripting)"
              data-action="Lanjut ke Scripting"
            >
              Lanjut ke Naskah (Scripting) <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResearchWorkspace;
