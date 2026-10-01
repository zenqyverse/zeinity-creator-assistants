import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  RotateCw,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  Sparkles,
  Maximize2,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
  FileDown,
  Loader2,
} from 'lucide-react';
import type { ContentItem, TitleRecommendationItem, ScriptBeatNumber } from '@/types';
import {
  formatExternalAuditPrompt,
  formatExternalFinalRevisionPrompt,
  formatExternalTitlePrompt,
  SCRIPT_BEATS,
  calculateBeatTargetWords,
  extractBeatFromScript,
} from '@/lib/gemini';

export interface ScriptDraftStudioProps {
  item: ContentItem;
  scriptOutput: string;
  onScriptChange: (val: string) => void;
  onScriptBlur?: () => void;
  scriptSaveStatus: 'idle' | 'unsaved' | 'saving' | 'saved';
  renderSaveIndicator: (status: 'idle' | 'unsaved' | 'saving' | 'saved') => React.ReactNode;
  onFileUpload: (file: File) => void;
  uploadedFileName: string | null;
  isDragging: boolean;
  onDragStateChange: (dragging: boolean) => void;
  onOpenDraftHistory: () => void;
  draftHistoryCount: number;
  onUndoLatestRevision: () => void;
  hasSnapshots: boolean;
  onMaximizeEditor: () => void;
  scriptTextareaRef: React.RefObject<HTMLTextAreaElement>;
  isDraftHighlighted: boolean;
  isScriptInputCollapsed: boolean;
  onToggleScriptInputCollapse: () => void;
  // Per-Beat Generation props
  onGenerateBeat?: (beatNumber: ScriptBeatNumber, beatRevisionNotes?: string) => void;
  generatingBeatNumber?: number | null;
  totalTargetWords?: number;
  // Downstream Spoken Audit props
  showAuditResults: boolean;
  auditFindings: string;
  auditRevisedDraft: string;
  isAuditResultsCollapsed: boolean;
  onToggleAuditCollapse: () => void;
  auditSummary: string | null;
  appliedKey: string | null;
  onApplyToDraft: (newText: string, key: string) => void;
  onRunAudit: () => void;
  generatingAudit: boolean;
  // Downstream Titles props
  showTitleCard: boolean;
  titlesList: TitleRecommendationItem[];
  titleA: string;
  titleB: string;
  isTitlesCollapsed: boolean;
  onToggleTitlesCollapse: () => void;
  generatingTitles: boolean;
  onGenerateTitles: () => void;
  onApplyTitleAsMain: (title: string) => void;
  // Downstream Checklist & Thumbnail modal triggers
  onOpenThumbnailModal: () => void;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
  loading?: boolean;
}

export const ScriptDraftStudio: React.FC<ScriptDraftStudioProps> = ({
  item,
  scriptOutput,
  onScriptChange,
  onScriptBlur,
  scriptSaveStatus,
  renderSaveIndicator,
  onFileUpload,
  uploadedFileName,
  isDragging,
  onDragStateChange,
  onOpenDraftHistory,
  draftHistoryCount,
  onUndoLatestRevision,
  hasSnapshots,
  onMaximizeEditor,
  scriptTextareaRef,
  isDraftHighlighted,
  isScriptInputCollapsed,
  onToggleScriptInputCollapse,
  onGenerateBeat,
  generatingBeatNumber = null,
  totalTargetWords = 1200,
  showAuditResults,
  auditFindings,
  auditRevisedDraft,
  isAuditResultsCollapsed,
  onToggleAuditCollapse,
  auditSummary,
  appliedKey,
  onApplyToDraft,
  onRunAudit,
  generatingAudit,
  showTitleCard,
  titlesList,
  titleA,
  titleB,
  isTitlesCollapsed,
  onToggleTitlesCollapse,
  generatingTitles,
  onGenerateTitles,
  onApplyTitleAsMain,
  onOpenThumbnailModal,
  copied,
  onCopy,
  loading = false,
}) => {
  const [activeBeatTab, setActiveBeatTab] = useState<ScriptBeatNumber>(1);
  const [beatRevisionInput, setBeatRevisionInput] = useState<string>('');
  const [showBeatRevisionBox, setShowBeatRevisionBox] = useState<boolean>(false);

  const handleDownloadDraft = () => {
    if (!scriptOutput.trim()) return;
    const blob = new Blob([scriptOutput], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${item.title.replace(/[/\\?%*:|"<>]/g, '_')}_Naskah.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const currentBeatText = extractBeatFromScript(scriptOutput, activeBeatTab);

  return (
    <section className="detail-card glass" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid #1a2942', paddingBottom: 10, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} /> PANEL KANAN: DRAFT STUDIO (RUANG KERJA PRODUKSI)
        </h3>
        <span className="collapsed-pill" style={{ background: 'rgba(52, 211, 153, 0.12)', color: 'var(--green)' }}>
          Stretched Full View
        </span>
      </div>

      {/* Live Script Textarea Box */}
      {isScriptInputCollapsed ? (
        <div
          className="collapsible-section collapsed"
          onDoubleClick={onToggleScriptInputCollapse}
          style={{
            background: '#070d18',
            border: '1.2px solid #223a61',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, color: '#c8d6ea', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                <FileText size={16} style={{ color: 'var(--cyan)' }} />
                <span>Draf Naskah Video</span>
              </h4>
              <span className="collapsed-pill">Ringkas</span>
              <span style={{ fontSize: '0.75rem', color: '#7890af' }}>
                {scriptOutput.trim().length.toLocaleString('id-ID')} karakter
                {scriptOutput.trim() ? ` (${scriptOutput.trim().split(/\s+/).filter(Boolean).length.toLocaleString('id-ID')} kata)` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="copy-action-btn"
                onClick={onToggleScriptInputCollapse}
                title="Buka area draf naskah"
              >
                <ChevronDown size={14} />
                <span>Buka</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: isDragging ? 'rgba(79, 232, 255, 0.08)' : '#070d18',
            border: isDragging ? '1.5px dashed var(--cyan)' : '1.2px solid #223a61',
            borderRadius: 8,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 16,
            transition: 'border 0.2s, background 0.2s',
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
        >
          {/* Textarea Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, borderBottom: '1px solid #14233c', paddingBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>
                Editor Naskah Video:
              </span>
              {renderSaveIndicator(scriptSaveStatus)}
            </div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="copy-action-btn"
                onClick={onOpenDraftHistory}
                title="Buka riwayat versi draf naskah tersimpan"
                style={{ position: 'relative' }}
              >
                <Clock size={13} />
                <span>Riwayat Draf</span>
                {draftHistoryCount > 0 && (
                  <span
                    style={{
                      background: 'var(--cyan)',
                      color: '#080e1a',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      borderRadius: 10,
                      padding: '1px 5px',
                      marginLeft: 3,
                    }}
                  >
                    {draftHistoryCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                className="copy-action-btn"
                onClick={onUndoLatestRevision}
                disabled={!hasSnapshots}
                title="Batalkan perubahan AI terakhir dan kembalikan versi draf sebelumnya"
                style={{ color: hasSnapshots ? '#fcd34d' : undefined }}
              >
                <RotateCcw size={13} />
                <span>Undo Revisi AI</span>
              </button>

              <label
                htmlFor="upload-script-file-input"
                className="copy-action-btn"
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                title="Unggah berkas Word (.docx), Markdown (.md), atau teks (.txt)"
              >
                <UploadCloud size={13} />
                <span>Upload</span>
                <input
                  id="upload-script-file-input"
                  type="file"
                  accept=".md,.markdown,.docx,.txt"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFileUpload(f);
                    e.target.value = '';
                  }}
                />
              </label>

              <button
                type="button"
                className="copy-action-btn"
                onClick={handleDownloadDraft}
                disabled={!scriptOutput.trim()}
                title="Unduh draf naskah sebagai file Markdown (.md)"
              >
                <FileDown size={13} />
                <span>Unduh</span>
              </button>

              <button
                type="button"
                className="copy-action-btn editor-maximize-btn"
                onClick={onMaximizeEditor}
                title="Buka editor layar penuh (Zen Mode)"
              >
                <Maximize2 size={13} />
                <span>Perbesar</span>
              </button>
            </div>
          </div>

          {uploadedFileName && (
            <div style={{ fontSize: '0.74rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📄 Berkas naskah aktif: <strong>{uploadedFileName}</strong></span>
            </div>
          )}

          {/* NEW: Per-Beat Navigation & Regeneration Strip */}
          <div
            style={{
              background: '#091322',
              borderRadius: 6,
              border: '1px solid #1a2f4c',
              padding: '6px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sparkles size={12} />
                <span>Navigasi Per-Babak (Per-Beat):</span>
              </span>
              <span style={{ fontSize: '0.68rem', color: '#7890af' }}>
                Klik tab babak untuk inspeksi atau regenerasi terisolasi
              </span>
            </div>

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {SCRIPT_BEATS.map((beat) => {
                const isSelected = activeBeatTab === beat.beatNumber;
                const isGenerating = generatingBeatNumber === beat.beatNumber;
                const targetW = calculateBeatTargetWords(beat.beatNumber, totalTargetWords);
                const hasExtracted = Boolean(extractBeatFromScript(scriptOutput, beat.beatNumber));
                return (
                  <button
                    key={beat.beatNumber}
                    type="button"
                    onClick={() => setActiveBeatTab(beat.beatNumber)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: '0.7rem',
                      fontWeight: isSelected ? 700 : 500,
                      background: isSelected ? 'rgba(56, 189, 248, 0.2)' : '#0e1828',
                      border: `1px solid ${isSelected ? 'var(--cyan)' : '#1b2d47'}`,
                      color: isSelected ? '#f8fafc' : '#cbd5e1',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    title={`${beat.name}: ${beat.description}`}
                  >
                    <span>{beat.shortName}</span>
                    <span style={{ fontSize: '0.62rem', color: isSelected ? 'var(--cyan)' : '#7890af' }}>
                      ({targetW}k)
                    </span>
                    {hasExtracted && <span style={{ color: 'var(--green)', fontSize: '0.65rem' }}>✓</span>}
                    {isGenerating && <Loader2 size={10} className="spin" />}
                  </button>
                );
              })}
            </div>

            {/* Active Beat Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a101d', padding: '4px 8px', borderRadius: 4, border: '1px solid #142236', flexWrap: 'wrap', gap: 6 }}>
              <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>
                <strong style={{ color: 'var(--cyan)' }}>Babak {activeBeatTab}:</strong> {SCRIPT_BEATS.find(b => b.beatNumber === activeBeatTab)?.stageName}
                {currentBeatText ? (
                  <span style={{ color: 'var(--green)', marginLeft: 6 }}>
                    (~{currentBeatText.split(/\s+/).filter(Boolean).length} kata terdeteksi di draf)
                  </span>
                ) : (
                  <span style={{ color: '#94a3b8', marginLeft: 6 }}>
                    (Belum ada di draf)
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  type="button"
                  className="copy-action-btn"
                  onClick={() => setShowBeatRevisionBox((prev) => !prev)}
                  style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                >
                  {showBeatRevisionBox ? 'Tutup Catatan' : 'Beri Catatan'}
                </button>

                {onGenerateBeat && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      onGenerateBeat(activeBeatTab, beatRevisionInput.trim() ? beatRevisionInput : undefined);
                      setShowBeatRevisionBox(false);
                      setBeatRevisionInput('');
                    }}
                    disabled={generatingBeatNumber !== null}
                    style={{ fontSize: '0.68rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--cyan)' }}
                    title={`Generate ulang atau tulis Babak ${activeBeatTab} secara terisolasi`}
                  >
                    <RotateCw size={11} className={generatingBeatNumber === activeBeatTab ? 'spin' : ''} />
                    <span>{generatingBeatNumber === activeBeatTab ? 'Memproses...' : `Regenerate Babak ${activeBeatTab}`}</span>
                  </button>
                )}
              </div>
            </div>

            {showBeatRevisionBox && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                <input
                  type="text"
                  value={beatRevisionInput}
                  onChange={(e) => setBeatRevisionInput(e.target.value)}
                  placeholder={`Catatan revisi khusus Babak ${activeBeatTab} (misal: "Pertajam kontras di awal...")...`}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    background: '#070c16',
                    border: '1px solid #203554',
                    borderRadius: 4,
                    color: '#f8fafc',
                    fontSize: '0.74rem',
                  }}
                />
              </div>
            )}
          </div>

          <textarea
            ref={scriptTextareaRef}
            value={scriptOutput}
            onChange={(e) => onScriptChange(e.target.value)}
            onBlur={onScriptBlur}
            placeholder="Editor Naskah Video Zeinity... Tempel atau ketik naskah di sini, atau hasilkan otomatis lewat AI Scriptwriter."
            className={isDraftHighlighted ? 'draft-highlight-pulse' : ''}
            style={{
              width: '100%',
              minHeight: 340,
              background: '#040810',
              border: '1px solid #17263c',
              color: '#e2edff',
              padding: 12,
              borderRadius: 6,
              fontFamily: 'inherit',
              resize: 'vertical',
              lineHeight: 1.6,
              boxSizing: 'border-box',
              fontSize: '0.84rem',
              transition: 'background-color 0.4s, border-color 0.4s',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#7890af' }}>
            <span>
              {scriptOutput.length.toLocaleString('id-ID')} karakter
              {scriptOutput.trim() ? ` (${scriptOutput.trim().split(/\s+/).filter(Boolean).length.toLocaleString('id-ID')} kata)` : ''}
            </span>
            <span>Target: ~{totalTargetWords.toLocaleString('id-ID')} kata • Standar Spoken-First &amp; TTS Voice-Over</span>
          </div>
        </div>
      )}

      {/* Downstream Results Panels */}
      {/* 1. Spoken Audit Results Panel */}
      {showAuditResults && auditFindings && (
        <div
          className={`audit-results-panel collapsible-section ${isAuditResultsCollapsed ? 'collapsed' : ''}`}
          onDoubleClick={onToggleAuditCollapse}
          style={{ marginTop: 14 }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 16px',
              background: 'rgba(83, 242, 173, 0.07)',
              borderBottom: isAuditResultsCollapsed ? 'none' : '1px solid rgba(83, 242, 173, 0.15)',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, padding: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green)' }}>
                <CheckCircle2 size={16} /> Hasil Audit Spoken &amp; TTS
              </h4>
              {auditSummary && (
                <span className="ai-summary-badge" style={{ margin: 0, padding: '2px 10px', fontSize: '0.74rem' }}>
                  <CheckCircle2 size={13} />
                  <span>{auditSummary}</span>
                </span>
              )}
              {isAuditResultsCollapsed && (
                <span className="collapsed-pill">Ringkas</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={`copy-action-btn ${copied === 'findings' ? 'copied' : ''}`}
                onClick={() => onCopy(auditFindings, 'findings')}
                title="Salin Laporan Temuan"
              >
                {copied === 'findings' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied === 'findings' ? 'Tersalin' : 'Copy'}</span>
              </button>
              <button
                type="button"
                className={`copy-action-btn ${copied === 'audit_prompt_hdr' ? 'copied' : ''}`}
                onClick={() => onCopy(formatExternalAuditPrompt(scriptOutput), 'audit_prompt_hdr')}
                title="Salin Prompt Audit Spoken & TTS (Tahap 4) untuk ChatGPT / Claude"
              >
                {copied === 'audit_prompt_hdr' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied === 'audit_prompt_hdr' ? 'Audit Tersalin' : 'Salin Prompt Audit (Tahap 4)'}</span>
              </button>
              <button
                type="button"
                className={`copy-action-btn ${copied === 'audit_rev_prompt_hdr' ? 'copied' : ''}`}
                onClick={() => onCopy(formatExternalFinalRevisionPrompt(scriptOutput, auditFindings), 'audit_rev_prompt_hdr')}
                title="Salin Prompt Revisi Naskah (Tahap 5) untuk ChatGPT / Claude"
              >
                {copied === 'audit_rev_prompt_hdr' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied === 'audit_rev_prompt_hdr' ? 'Prompt Tersalin' : 'Salin Prompt Revisi (Tahap 5)'}</span>
              </button>
              {auditRevisedDraft && (
                <button
                  type="button"
                  className={`copy-action-btn ${appliedKey === 'audit' ? 'copied' : ''}`}
                  onClick={() => onApplyToDraft(auditRevisedDraft, 'audit')}
                  title="Terapkan draft revisi ke editor naskah"
                >
                  <Check size={14} />
                  <span>{appliedKey === 'audit' ? 'Diterapkan' : 'Terapkan'}</span>
                </button>
              )}
              <button
                type="button"
                className="copy-action-btn"
                onClick={onToggleAuditCollapse}
                title={isAuditResultsCollapsed ? 'Buka Hasil Audit' : 'Susutkan Hasil Audit'}
              >
                {isAuditResultsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                <span>{isAuditResultsCollapsed ? 'Buka' : 'Susut'}</span>
              </button>
            </div>
          </div>

          {!isAuditResultsCollapsed && (
            <>
              <div className="audit-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <h5 style={{ margin: 0 }}>📋 Laporan Temuan</h5>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`copy-action-btn ${copied === 'findings' ? 'copied' : ''}`}
                      onClick={() => onCopy(auditFindings, 'findings')}
                      title="Salin Laporan Temuan"
                    >
                      {copied === 'findings' ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied === 'findings' ? 'Tersalin' : 'Copy Temuan'}</span>
                    </button>
                    <button
                      type="button"
                      className={`copy-action-btn ${copied === 'audit_prompt_sub' ? 'copied' : ''}`}
                      onClick={() => onCopy(formatExternalAuditPrompt(scriptOutput), 'audit_prompt_sub')}
                      title="Salin Prompt Audit Spoken & TTS (Tahap 4) untuk ChatGPT / Claude"
                    >
                      {copied === 'audit_prompt_sub' ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied === 'audit_prompt_sub' ? 'Audit Tersalin' : 'Salin Prompt Audit (Tahap 4)'}</span>
                    </button>
                    <button
                      type="button"
                      className={`copy-action-btn ${copied === 'audit_rev_prompt' ? 'copied' : ''}`}
                      onClick={() => onCopy(formatExternalFinalRevisionPrompt(scriptOutput, auditFindings), 'audit_rev_prompt')}
                      title="Salin Prompt Revisi Naskah (Tahap 5) untuk ChatGPT / Claude"
                    >
                      {copied === 'audit_rev_prompt' ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied === 'audit_rev_prompt' ? 'Prompt Tersalin' : 'Salin Prompt Revisi (Tahap 5)'}</span>
                    </button>
                  </div>
                </div>
                <pre className="audit-pre">{auditFindings}</pre>
              </div>

              {auditRevisedDraft && (
                <div className="audit-section">
                  <h5>✍️ Draft Revisi</h5>
                  <pre className="audit-pre">{auditRevisedDraft}</pre>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      type="button"
                      className={`btn ${appliedKey === 'audit' ? 'btn-applied' : 'btn-primary'}`}
                      onClick={() => onApplyToDraft(auditRevisedDraft, 'audit')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', padding: '8px 14px' }}
                    >
                      <Check size={15} /> {appliedKey === 'audit' ? 'Sudah Diterapkan' : 'Terapkan ke Draft'}
                    </button>
                    <button
                      type="button"
                      className={`copy-action-btn ${copied === 'revised' ? 'copied' : ''}`}
                      onClick={() => onCopy(auditRevisedDraft, 'revised')}
                      title="Salin Draft Revisi"
                    >
                      {copied === 'revised' ? <Check size={15} /> : <Copy size={15} />}
                      <span>{copied === 'revised' ? 'Tersalin' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 2. Rekomendasi 5 Judul YouTube (5 Formula Hook Zeinity) */}
      {(showTitleCard || titlesList.length > 0 || titleA || titleB) && (
        <div
          className={`audit-results-panel collapsible-section ${isTitlesCollapsed ? 'collapsed' : ''}`}
          onDoubleClick={onToggleTitlesCollapse}
          style={{ borderColor: 'rgba(249, 199, 79, 0.35)', marginTop: 14 }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 16px',
              background: 'rgba(249, 199, 79, 0.08)',
              borderBottom: isTitlesCollapsed ? 'none' : '1px solid rgba(249, 199, 79, 0.2)',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, padding: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--amber)' }}>
                <Sparkles size={16} /> Rekomendasi Judul YouTube (5 Formula Hook Zeinity)
              </h4>
              <span className="collapsed-pill" style={{ background: 'rgba(249, 199, 79, 0.12)', color: 'var(--amber)', borderColor: 'rgba(249, 199, 79, 0.3)' }}>
                Bab 12, 25C &amp; 32 Dokumen Strategi
              </span>
              {isTitlesCollapsed && (
                <span className="collapsed-pill">Ringkas</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onGenerateTitles}
                disabled={generatingTitles || loading}
                style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                title="Generate ulang 5 varian judul hook Zeinity"
              >
                <RotateCw size={13} className={generatingTitles ? 'spin' : ''} />
                <span>{generatingTitles ? 'Membuat...' : 'Generate Ulang'}</span>
              </button>
              <button
                type="button"
                className={`copy-action-btn ${copied === 'title_prompt_hdr' ? 'copied' : ''}`}
                onClick={() => onCopy(formatExternalTitlePrompt(item.title, item.category || 'Umum', scriptOutput || item.external_research_output || ''), 'title_prompt_hdr')}
                title="Salin Prompt 5 Formula Judul untuk ChatGPT / Claude"
              >
                {copied === 'title_prompt_hdr' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied === 'title_prompt_hdr' ? 'Prompt Tersalin' : 'Salin Prompt 5 Formula Judul'}</span>
              </button>
              <button
                type="button"
                className="copy-action-btn"
                onClick={onToggleTitlesCollapse}
                title={isTitlesCollapsed ? 'Buka Rekomendasi Judul' : 'Susutkan Rekomendasi Judul'}
              >
                {isTitlesCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                <span>{isTitlesCollapsed ? 'Buka' : 'Susut'}</span>
              </button>
            </div>
          </div>

          {!isTitlesCollapsed && (
            <div className="audit-section" style={{ padding: 14 }}>
              <div className="title-recommendations-grid">
                {titlesList.length > 0 ? (
                  titlesList.map((rec, idx) => {
                    const words = rec.title.trim().split(/\s+/).filter(Boolean);
                    const wordCount = rec.wordCount || words.length;
                    const isSafe = rec.isMobileSafe ?? (wordCount >= 5 && wordCount <= 8);
                    const copyKey = `title_${rec.id || idx}`;
                    return (
                      <div key={rec.id || idx} className="title-card formula-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                          <span className="mode-label formula-badge">
                            {rec.formulaName || `Formula ${idx + 1}`}
                          </span>
                          <span
                            className="collapsed-pill"
                            style={{
                              background: isSafe ? 'rgba(52, 211, 153, 0.15)' : 'rgba(249, 199, 79, 0.15)',
                              color: isSafe ? 'var(--green)' : 'var(--amber)',
                              borderColor: isSafe ? 'rgba(52, 211, 153, 0.3)' : 'rgba(249, 199, 79, 0.3)',
                            }}
                          >
                            {wordCount} kata • {isSafe ? 'Aman Mobile (5–8 kata)' : 'Periksa Panjang'}
                          </span>
                        </div>
                        <div className="title-text" style={{ minHeight: 44, color: '#edf6ff', marginBottom: 8, fontSize: '0.96rem', fontWeight: 600 }}>
                          {rec.title}
                        </div>
                        {rec.explanation && (
                          <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                            {rec.explanation}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className={`copy-action-btn ${copied === copyKey ? 'copied' : ''}`}
                            onClick={() => onCopy(rec.title, copyKey)}
                            title="Salin judul ini"
                          >
                            {copied === copyKey ? <Check size={13} /> : <Copy size={13} />}
                            <span>{copied === copyKey ? 'Tersalin!' : 'Salin'}</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => onApplyTitleAsMain(rec.title)}
                            style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                            title="Gunakan sebagai judul utama konten ini"
                          >
                            Gunakan sbg Judul
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <>
                    {titleA && (
                      <div className="title-card formula-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span className="mode-label formula-badge">Formula 1 — Curiosity Gap</span>
                          <span className="collapsed-pill" style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--green)' }}>
                            {titleA.trim().split(/\s+/).length} kata • Aman Mobile
                          </span>
                        </div>
                        <div className="title-text" style={{ minHeight: 44, color: '#edf6ff', marginBottom: 10, fontWeight: 600 }}>
                          {titleA}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className={`copy-action-btn ${copied === 'titleA' ? 'copied' : ''}`}
                            onClick={() => onCopy(titleA, 'titleA')}
                          >
                            {copied === 'titleA' ? <Check size={13} /> : <Copy size={13} />}
                            <span>{copied === 'titleA' ? 'Tersalin!' : 'Salin'}</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => onApplyTitleAsMain(titleA)}
                            style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                          >
                            Gunakan sbg Judul
                          </button>
                        </div>
                      </div>
                    )}
                    {titleB && (
                      <div className="title-card formula-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span className="mode-label formula-badge">Formula 4 — SEO Keyword &amp; Otoritas</span>
                          <span className="collapsed-pill" style={{ background: 'rgba(153, 133, 255, 0.15)', color: 'var(--violet)' }}>
                            {titleB.trim().split(/\s+/).length} kata
                          </span>
                        </div>
                        <div className="title-text" style={{ minHeight: 44, color: '#edf6ff', marginBottom: 10, fontWeight: 600 }}>
                          {titleB}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className={`copy-action-btn ${copied === 'titleB' ? 'copied' : ''}`}
                            onClick={() => onCopy(titleB, 'titleB')}
                          >
                            {copied === 'titleB' ? <Check size={13} /> : <Copy size={13} />}
                            <span>{copied === 'titleB' ? 'Tersalin!' : 'Salin'}</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => onApplyTitleAsMain(titleB)}
                            style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                          >
                            Gunakan sbg Judul
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. SMART PRODUCTION CHECKLIST DOWNSTREAM TOOLBAR */}
      <div
        className="smart-checklist-toolbar"
        style={{
          marginTop: 18,
          background: '#0a1324',
          border: '1px solid #1e3355',
          borderRadius: 10,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🛠️ SMART CHECKLIST PEMOLESAN NASKAH</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#7890af' }}>
            Langkah downstream setelah draf selesai ditulis
          </span>
        </div>

        {/* 3 Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {/* Card 1: Spoken Audit */}
          <div
            className="checklist-card-interactive"
            style={{
              background: '#0d192f',
              border: '1px solid #233b63',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f1f5f9' }}>
                Card 1: Spoken Audit
              </span>
              {auditFindings.trim() ? (
                <span className="collapsed-pill" style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--green)', fontSize: '0.68rem' }}>
                  ✓ Selesai
                </span>
              ) : (
                <span className="collapsed-pill" style={{ background: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', fontSize: '0.68rem' }}>
                  Disarankan
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: 1.4 }}>
              Evaluasi 4 dimensi kelayakan tutur lisan &amp; pembacaan TTS.
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onRunAudit}
                disabled={generatingAudit || loading || !scriptOutput.trim()}
                style={{ fontSize: '0.74rem', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {generatingAudit ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
                <span>{generatingAudit ? 'Mengaudit...' : 'Audit Spoken & TTS ✨'}</span>
              </button>
              <button
                type="button"
                className="copy-action-btn"
                onClick={() => onCopy(formatExternalAuditPrompt(scriptOutput), 'audit_prompt_chk')}
                disabled={!scriptOutput.trim()}
                title="Salin Prompt Audit Spoken untuk AI Eksternal"
                style={{ fontSize: '0.72rem', padding: '6px 8px' }}
              >
                <Copy size={12} />
                <span>Salin Prompt Audit</span>
              </button>
            </div>
          </div>

          {/* Card 2: Generate Rekomendasi Judul */}
          <div
            className="checklist-card-interactive"
            style={{
              background: '#0d192f',
              border: '1px solid #233b63',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f1f5f9' }}>
                Card 2: Generate Rekomendasi Judul
              </span>
              {titlesList.length > 0 || titleA || titleB ? (
                <span className="collapsed-pill" style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--green)', fontSize: '0.68rem' }}>
                  ✓ 5 Varian Siap
                </span>
              ) : (
                <span className="collapsed-pill" style={{ background: 'rgba(249, 199, 79, 0.15)', color: 'var(--amber)', fontSize: '0.68rem' }}>
                  Disarankan
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: 1.4 }}>
              5 varian judul hook Zeinity (5–8 kata, aman tampilan mobile).
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onGenerateTitles}
                disabled={generatingTitles || loading}
                style={{ fontSize: '0.74rem', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {generatingTitles ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
                <span>{generatingTitles ? 'Membuat...' : 'Generate Rekomendasi Judul ✨'}</span>
              </button>
              <button
                type="button"
                className="copy-action-btn"
                onClick={() => onCopy(formatExternalTitlePrompt(item.title, item.category || 'Umum', scriptOutput || item.external_research_output || ''), 'title_prompt_chk')}
                title="Salin Prompt 5 Formula Judul untuk AI Eksternal"
                style={{ fontSize: '0.72rem', padding: '6px 8px' }}
              >
                <Copy size={12} />
                <span>Salin Prompt 5 Formula Judul</span>
              </button>
            </div>
          </div>

          {/* Card 3: Generate Thumbnail */}
          <div
            className="checklist-card-interactive"
            style={{
              background: '#0d192f',
              border: '1px solid #233b63',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f1f5f9' }}>
                Card 3: Generate Thumbnail
              </span>
              {item.generated_thumbnail_prompt ? (
                <span className="collapsed-pill" style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--green)', fontSize: '0.68rem' }}>
                  ✓ Siap
                </span>
              ) : (
                <span className="collapsed-pill" style={{ background: 'rgba(79, 232, 255, 0.15)', color: 'var(--cyan)', fontSize: '0.68rem' }}>
                  Langkah Terakhir
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: 1.4 }}>
              Studio dual-mode: Prompt Text AI (Bab 13) &amp; Canvas Preview visual.
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onOpenThumbnailModal}
                title="Buka Studio Generate Thumbnail (Dual-Mode)"
                aria-label="Buka Studio Generate Thumbnail (Dual-Mode)"
                style={{ fontSize: '0.74rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <ImageIcon size={13} />
                <span>Studio Generate Thumbnail</span>
              </button>
            </div>
          </div>
        </div>

        {/* Smart Reminder Banner */}
        <div
          className="smart-reminder-banner"
          style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: '0.74rem',
            color: '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span>
            💡 <strong>Pengingat Cerdas Workflow:</strong> Untuk menghasilkan video berkualitas standar industri, lengkapi seluruh tahapan berurutan: <strong>Audit Spoken &amp; TTS</strong> ➔ <strong>Generate Rekomendasi Judul</strong> ➔ <strong>Generate Thumbnail</strong>.
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenThumbnailModal}
            style={{ fontSize: '0.72rem', padding: '4px 10px', color: 'var(--cyan)' }}
          >
            Lompat ke Thumbnail Studio ➔
          </button>
        </div>
      </div>
    </section>
  );
};

export default ScriptDraftStudio;
