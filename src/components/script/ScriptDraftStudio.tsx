import React, { useState, useEffect, useRef } from 'react';
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
  ArrowRight,
  ArrowLeft,
  Download,
  Smile,
  MessageSquareHeart,
} from 'lucide-react';
import type { ContentItem, TitleRecommendationItem, ScriptBeatNumber } from '@/types';
import {
  formatExternalAuditPrompt,
  formatExternalCasualAuditPrompt,
  formatExternalFinalRevisionPrompt,
  formatExternalTitlePrompt,
  formatStructuredPrompt,
  SCRIPT_BEATS,
  calculateBeatTargetWords,
  extractBeatFromScript,
} from '@/lib/gemini';

export interface DiffItem {
  id: number;
  original: string;
  problem: string;
  revision: string;
  reason?: string;
}

export function parseAuditFindings(findingsText: string): DiffItem[] {
  if (!findingsText || !findingsText.trim()) return [];

  // Match each section starting with BAGIAN ASLI (supporting optional markdown stars, numbers, headings, etc.)
  // Handles: **BAGIAN ASLI:**, **BAGIAN ASLI**:, BAGIAN ASLI:, 1. **BAGIAN ASLI:**, ### BAGIAN ASLI:
  const sectionMatches = [...findingsText.matchAll(/(?:^|\n)\s*(?:[#*>\s\d.-]*\bBAGIAN ASLI\b[^\n:]*:\s*(?:\*\*)?\s*)/gi)];
  
  const cleanVal = (s: string) => {
    if (!s) return '';
    return s
      .replace(/^[*_~`"'\s]+/, '')
      .replace(/[*_~`"'\s]+$/, '')
      .trim();
  };

  if (sectionMatches.length === 0) {
    const fallbackRegex = /(?:\*\*|\b)BAGIAN ASLI(?:\*\*|\b)\s*:\s*([\s\S]*?)(?=(?:\*\*|\b)BAGIAN ASLI(?:\*\*|\b)\s*:|$)/gi;
    let fbMatch: RegExpExecArray | null;
    const items: DiffItem[] = [];
    let counter = 1;
    while ((fbMatch = fallbackRegex.exec(findingsText)) !== null) {
      const block = fbMatch[1];
      const problemMatch = block.match(/(?:\*\*|\b)MASALAH(?:\*\*|\b)\s*:\s*([\s\S]*?)(?=(?:\*\*|\b)REVISI(?:\*\*|\b)\s*:|$)/i);
      const revisionMatch = block.match(/(?:\*\*|\b)REVISI(?:\*\*|\b)\s*:\s*([\s\S]*?)(?=(?:\*\*|\b)ALASAN(?:\*\*|\b)\s*:|$)/i);
      const reasonMatch = block.match(/(?:\*\*|\b)ALASAN(?:\*\*|\b)\s*:\s*([\s\S]*)$/i);

      const originalText = block.split(/(?:\*\*|\b)MASALAH(?:\*\*|\b)\s*:/i)[0] || '';

      const original = cleanVal(originalText);
      const problem = cleanVal(problemMatch ? problemMatch[1] : '');
      const revision = cleanVal(revisionMatch ? revisionMatch[1] : '');
      const reason = reasonMatch ? cleanVal(reasonMatch[1]) : undefined;

      if (original || problem || revision) {
        items.push({ id: counter++, original, problem, revision, reason });
      }
    }
    return items;
  }

  const items: DiffItem[] = [];

  for (let i = 0; i < sectionMatches.length; i++) {
    const start = (sectionMatches[i].index ?? 0) + sectionMatches[i][0].length;
    const end = (i + 1 < sectionMatches.length) ? (sectionMatches[i + 1].index ?? findingsText.length) : findingsText.length;
    const block = findingsText.slice(start, end);

    const tagRegex = /(?:^|\n)\s*(?:[#*>\s\d.-]*\b(MASALAH|REVISI|ALASAN)\b[^\n:]*:\s*(?:\*\*)?\s*)/gi;
    const tagMatches = [...block.matchAll(tagRegex)];

    let original = '';
    let problem = '';
    let revision = '';
    let reason: string | undefined = undefined;

    if (tagMatches.length === 0) {
      original = block.trim();
    } else {
      original = block.slice(0, tagMatches[0].index).trim();

      for (let t = 0; t < tagMatches.length; t++) {
        const tagName = tagMatches[t][1].toUpperCase();
        const contentStart = (tagMatches[t].index ?? 0) + tagMatches[t][0].length;
        const contentEnd = (t + 1 < tagMatches.length) ? (tagMatches[t + 1].index ?? block.length) : block.length;
        const val = block.slice(contentStart, contentEnd).trim();

        if (tagName === 'MASALAH') problem = val;
        else if (tagName === 'REVISI') revision = val;
        else if (tagName === 'ALASAN') reason = val;
      }
    }

    const cleanOriginal = cleanVal(original);
    const cleanProblem = cleanVal(problem);
    const cleanRevision = cleanVal(revision);
    const cleanReason = reason ? cleanVal(reason) : undefined;

    if (cleanOriginal || cleanProblem || cleanRevision) {
      items.push({
        id: i + 1,
        original: cleanOriginal,
        problem: cleanProblem,
        revision: cleanRevision,
        reason: cleanReason,
      });
    }
  }

  return items;
}

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
  // Sub-Session Casual Audit props
  casualFindings?: string;
  casualRevisedDraft?: string;
  casualSummary?: string | null;
  generatingCasualAudit?: boolean;
  onRunCasualAudit?: () => void;
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
  // Workflow Tab mode (Writing vs Finishing Separation)
  activeWorkflowTab?: 'writing' | 'finishing';
  onSwitchToFinishing?: () => void;
  onSwitchToWriting?: () => void;

  // Inline Thumbnail Studio props for Sub-Studio 3
  thumbnailMode?: 'prompt' | 'visual';
  onSelectThumbnailMode?: (mode: 'prompt' | 'visual') => void;
  thumbnailPrompt?: string;
  generatedThumbnailPrompt?: string | null;
  thumbnailAspectRatio?: '16:9' | '1:1' | '9:16';
  onAspectRatioChange?: (ratio: '16:9' | '1:1' | '9:16') => void;
  thumbnailProvider?: 'imagen3' | 'dalle3' | 'flux';
  onProviderChange?: (provider: 'imagen3' | 'dalle3' | 'flux') => void;
  thumbnailHookText?: string;
  onHookTextChange?: (text: string) => void;
  onExportMockupSvg?: () => void;
  onGenerateThumbnail?: (isRegenerate: boolean) => void;
  generatingThumbnail?: boolean;
  hasGeneratedThumbnail?: boolean;
  onPublish?: () => Promise<void>;
  onProceedToThumbnailing?: () => void;
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
  casualFindings = '',
  casualRevisedDraft = '',
  casualSummary = null,
  generatingCasualAudit = false,
  onRunCasualAudit,
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
  activeWorkflowTab = 'writing',
  onSwitchToFinishing,
  onSwitchToWriting,
  thumbnailMode = 'prompt',
  onSelectThumbnailMode,
  thumbnailPrompt = '',
  generatedThumbnailPrompt = null,
  thumbnailAspectRatio = '16:9',
  onAspectRatioChange = () => {},
  thumbnailProvider = 'imagen3',
  onProviderChange = () => {},
  thumbnailHookText = 'ILUSI DIBONGKAR',
  onHookTextChange = () => {},
  onExportMockupSvg = () => {},
  onGenerateThumbnail = () => {},
  generatingThumbnail = false,
  hasGeneratedThumbnail = false,
  onPublish,
  onProceedToThumbnailing,
}) => {
  const [activeBeatTab, setActiveBeatTab] = useState<ScriptBeatNumber>(1);
  const [beatRevisionInput, setBeatRevisionInput] = useState<string>('');
  const [showBeatRevisionBox, setShowBeatRevisionBox] = useState<boolean>(false);

  // Completion checks for 3 finishing steps
  const isStep1Done = Boolean(auditFindings && auditFindings.trim());
  const hasTitlesGenerated = Boolean((titlesList && titlesList.length > 0) || titleA || titleB);

  const isSelectedTitle = (titleCandidate?: string | null) => {
    if (!titleCandidate || !item.title) return false;
    return item.title.trim().toLowerCase() === titleCandidate.trim().toLowerCase();
  };

  const selectedRec = titlesList?.find((t) => isSelectedTitle(t.title));
  const hasSelectedTitle = Boolean(
    (titlesList && titlesList.some((t) => isSelectedTitle(t.title))) ||
    isSelectedTitle(titleA) ||
    isSelectedTitle(titleB)
  );

  const isStep2Done = Boolean(hasSelectedTitle || (hasTitlesGenerated && item.title));
  const isStep3Done = Boolean(item.generated_thumbnail_prompt || thumbnailPrompt);

  const completedStepsCount = (isStep1Done ? 1 : 0) + (isStep2Done ? 1 : 0) + (isStep3Done ? 1 : 0);
  const progressPercentFinishing = Math.round((completedStepsCount / 3) * 100);

  const getInitialStep = (): 1 | 2 | 3 => {
    if (!isStep1Done) return 1;
    if (!hasSelectedTitle) return 2;
    return 3;
  };

  const [activeFinishingStep, setActiveFinishingStep] = useState<1 | 2 | 3>(getInitialStep);

  const prevTabRef = useRef(activeWorkflowTab);
  useEffect(() => {
    if (activeWorkflowTab === 'finishing' && prevTabRef.current !== 'finishing') {
      setActiveFinishingStep(getInitialStep());
    }
    prevTabRef.current = activeWorkflowTab;
  }, [activeWorkflowTab, isStep1Done, hasSelectedTitle]);

  const currentWords = scriptOutput.trim()
    ? scriptOutput.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const targetW = totalTargetWords || 1200;
  const progressPercent = Math.min(100, Math.round((currentWords / targetW) * 100));

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

  // =========================================================================
  // VIEW 1: ZEN WRITING STUDIO (TAB 1: STUDIO NASKAH)
  // =========================================================================
  if (activeWorkflowTab === 'writing') {
    return (
      <section className="detail-card glass" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Editor Top Bar with Title, Save Indicator & Word Meter */}
        <div
          style={{
            borderBottom: '1px solid #1a2942',
            paddingBottom: 10,
            marginBottom: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
              <FileText size={17} /> Draft Studio (Ruang Kerja Produksi)
            </h3>
            {renderSaveIndicator(scriptSaveStatus)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Word Count Progress Meter */}
            <div
              className="word-meter-pill"
              title={`Progres Target Kata: ${currentWords.toLocaleString('id-ID')} dari ${targetW.toLocaleString('id-ID')} kata (${progressPercent}%)`}
            >
              <div className="word-meter-track">
                <div className="word-meter-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <span>
                {currentWords.toLocaleString('id-ID')} / {targetW.toLocaleString('id-ID')} kata
              </span>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <button
                type="button"
                className="copy-action-btn"
                onClick={onOpenDraftHistory}
                title="Buka riwayat snapshot versi draf tersimpan"
                style={{ position: 'relative' }}
              >
                <Clock size={13} />
                <span>Riwayat</span>
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
                title="Batalkan revisi AI terakhir"
                style={{ color: hasSnapshots ? '#fcd34d' : undefined }}
              >
                <RotateCcw size={13} />
                <span>Undo AI</span>
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
                <span>Zen</span>
              </button>
            </div>
          </div>
        </div>

        {/* Collapsed State Toggle */}
        {isScriptInputCollapsed ? (
          <div
            className="collapsible-section collapsed"
            onDoubleClick={onToggleScriptInputCollapse}
            style={{
              background: '#070d18',
              border: '1.2px solid #223a61',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 14,
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
                  {scriptOutput.trim().length.toLocaleString('id-ID')} karakter ({currentWords.toLocaleString('id-ID')} kata)
                </span>
              </div>
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
        ) : (
          <div
            style={{
              background: isDragging ? 'rgba(79, 232, 255, 0.08)' : '#070d18',
              border: isDragging ? '1.5px dashed var(--cyan)' : '1.2px solid #1b2d49',
              borderRadius: 10,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
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
            {uploadedFileName && (
              <div style={{ fontSize: '0.74rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📄 Berkas naskah aktif: <strong>{uploadedFileName}</strong></span>
              </div>
            )}

            {/* SLEEK BEAT TIMELINE STRIP */}
            <div
              style={{
                background: '#091322',
                borderRadius: 6,
                border: '1px solid #172944',
                padding: '6px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Sparkles size={12} />
                  <span>Timeline Babak (Beat Navigator):</span>
                </span>
                <span style={{ fontSize: '0.68rem', color: '#7890af' }}>
                  Klik tab babak untuk inspeksi atau regenerasi terisolasi
                </span>
              </div>

              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {SCRIPT_BEATS.map((beat) => {
                  const isSelected = activeBeatTab === beat.beatNumber;
                  const isGenerating = generatingBeatNumber === beat.beatNumber;
                  const targetBeatW = calculateBeatTargetWords(beat.beatNumber, targetW);
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
                        ({targetBeatW} kata)
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
                      disabled={generatingBeatNumber !== null || loading}
                      style={{ fontSize: '0.68rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--cyan)' }}
                      title={`Generate ulang atau tulis Babak ${activeBeatTab} secara terisolasi`}
                    >
                      <RotateCw size={11} className={generatingBeatNumber === activeBeatTab ? 'spin' : ''} />
                      <span>{generatingBeatNumber === activeBeatTab ? 'Memproses...' : (currentBeatText ? 'Regenerate Babak ' : 'Tulis Babak ') + activeBeatTab}</span>
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

            {/* DISTRACTION-FREE WRITING CANVAS */}
            <textarea
              ref={scriptTextareaRef}
              value={scriptOutput}
              onChange={(e) => onScriptChange(e.target.value)}
              onBlur={onScriptBlur}
              placeholder="Editor Naskah Video Zeinity... Tempel atau ketik naskah di sini, atau hasilkan otomatis lewat AI Scriptwriter."
              className={isDraftHighlighted ? 'draft-highlight-pulse' : ''}
              style={{
                width: '100%',
                minHeight: 460,
                background: '#040812',
                border: '1px solid #142238',
                color: '#e2edff',
                padding: '16px 18px',
                borderRadius: 8,
                fontFamily: 'inherit',
                resize: 'vertical',
                lineHeight: 1.7,
                boxSizing: 'border-box',
                fontSize: '0.88rem',
                letterSpacing: '0.15px',
                transition: 'background-color 0.4s, border-color 0.4s',
              }}
            />

            {/* SLEEK FOOTER STATUS & TRANSITION TO FINISHING */}
            <div
              style={{
                marginTop: 4,
                padding: '8px 12px',
                background: '#091322',
                borderRadius: 6,
                border: '1px solid #16263e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>💡</span>
                <span>
                  <strong>Fokus Menulis:</strong> Setelah draf selesai, buka tab <strong style={{ color: 'var(--cyan)' }}>"2. Finishing &amp; Packaging"</strong> untuk menjalankan Spoken Audit, 5 Formula Judul, dan Studio Thumbnail.
                </span>
              </div>

              {onSwitchToFinishing && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onSwitchToFinishing}
                  style={{
                    fontSize: '0.75rem',
                    padding: '5px 12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--cyan)',
                    borderColor: 'rgba(56, 189, 248, 0.4)',
                    background: 'rgba(56, 189, 248, 0.08)',
                    fontWeight: 700,
                  }}
                  title="Pindah ke tahap pemolesan: Spoken Audit, 5 Formula Judul, dan Studio Thumbnail"
                >
                  <span>Lanjut ke Finishing &amp; Packaging</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    );
  }

  // =========================================================================
  // VIEW 2: DEDICATED FINISHING & PACKAGING STUDIO (TAB 2)
  // 2-Panel Master-Detail Architecture
  // =========================================================================

  const currentHookText = thumbnailHookText || 'ILUSI DIBONGKAR';
  const hookWords = currentHookText.trim().split(/\s+/).filter(Boolean);
  const isHookOptimal = hookWords.length >= 2 && hookWords.length <= 4;

  const handleApplySingleDiff = (original: string, revision: string, diffId: number) => {
    if (!original || !revision || !scriptOutput) return;

    const normScript = scriptOutput.replace(/\r\n/g, '\n');
    const normOrig = original.replace(/\r\n/g, '\n').trim();
    const normRev = revision.replace(/\r\n/g, '\n').trim();

    if (normScript.includes(normOrig)) {
      const updated = normScript.replace(normOrig, normRev);
      onApplyToDraft(updated, `diff_${diffId}`);
      return;
    }

    // Try without surrounding quotes
    const unquotedOrig = normOrig.replace(/^["']|["']$/g, '').trim();
    const unquotedRev = normRev.replace(/^["']|["']$/g, '').trim();
    if (normScript.includes(unquotedOrig)) {
      const updated = normScript.replace(unquotedOrig, unquotedRev);
      onApplyToDraft(updated, `diff_${diffId}`);
      return;
    }

    // Try whitespace-relaxed replacement
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const words = unquotedOrig.split(/\s+/).filter(Boolean);
    if (words.length > 0) {
      const relaxedPattern = words.map(escapeRegex).join('\\s+');
      const relaxedRegex = new RegExp(relaxedPattern, 'm');
      if (relaxedRegex.test(normScript)) {
        const updated = normScript.replace(relaxedRegex, unquotedRev);
        onApplyToDraft(updated, `diff_${diffId}`);
        return;
      }
    }
  };

  const parsedDiffs = parseAuditFindings(auditFindings);

  const handleApplyAllRevisions = () => {
    if (auditRevisedDraft && auditRevisedDraft.trim()) {
      onApplyToDraft(auditRevisedDraft, 'audit');
      return;
    }
    let draft = scriptOutput;
    for (const d of parsedDiffs) {
      if (!d.original || !d.revision) continue;
      const normDraft = draft.replace(/\r\n/g, '\n');
      const normO = d.original.replace(/\r\n/g, '\n').trim();
      const normR = d.revision.replace(/\r\n/g, '\n').trim();
      if (normDraft.includes(normO)) {
        draft = normDraft.replace(normO, normR);
      } else {
        const unqO = normO.replace(/^["']|["']$/g, '').trim();
        const unqR = normR.replace(/^["']|["']$/g, '').trim();
        if (normDraft.includes(unqO)) {
          draft = normDraft.replace(unqO, unqR);
        }
      }
    }
    onApplyToDraft(draft, 'audit');
  };

  const [activeAuditSubTab, setActiveAuditSubTab] = useState<'spoken' | 'casual'>('spoken');
  const parsedCasualDiffs = parseAuditFindings(casualFindings || '');

  const handleApplySingleCasualDiff = (original: string, revision: string, diffId: number) => {
    if (!original || !revision || !scriptOutput) return;

    const normScript = scriptOutput.replace(/\r\n/g, '\n');
    const normOrig = original.replace(/\r\n/g, '\n').trim();
    const normRev = revision.replace(/\r\n/g, '\n').trim();

    if (normScript.includes(normOrig)) {
      const updated = normScript.replace(normOrig, normRev);
      onApplyToDraft(updated, `casual_diff_${diffId}`);
      return;
    }

    // Try without surrounding quotes
    const unquotedOrig = normOrig.replace(/^["']|["']$/g, '').trim();
    const unquotedRev = normRev.replace(/^["']|["']$/g, '').trim();
    if (normScript.includes(unquotedOrig)) {
      const updated = normScript.replace(unquotedOrig, unquotedRev);
      onApplyToDraft(updated, `casual_diff_${diffId}`);
      return;
    }

    // Try whitespace-relaxed replacement
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const words = unquotedOrig.split(/\s+/).filter(Boolean);
    if (words.length > 0) {
      const relaxedPattern = words.map(escapeRegex).join('\\s+');
      const relaxedRegex = new RegExp(relaxedPattern, 'm');
      if (relaxedRegex.test(normScript)) {
        const updated = normScript.replace(relaxedRegex, unquotedRev);
        onApplyToDraft(updated, `casual_diff_${diffId}`);
        return;
      }
    }
  };

  const handleApplyAllCasualRevisions = () => {
    if (casualRevisedDraft && casualRevisedDraft.trim()) {
      onApplyToDraft(casualRevisedDraft, 'casual_audit');
      return;
    }
    let draft = scriptOutput;
    for (const d of parsedCasualDiffs) {
      if (!d.original || !d.revision) continue;
      const normDraft = draft.replace(/\r\n/g, '\n');
      const normO = d.original.replace(/\r\n/g, '\n').trim();
      const normR = d.revision.replace(/\r\n/g, '\n').trim();
      if (normDraft.includes(normO)) {
        draft = normDraft.replace(normO, normR);
      } else {
        const unqO = normO.replace(/^["']|["']$/g, '').trim();
        const unqR = normR.replace(/^["']|["']$/g, '').trim();
        if (normDraft.includes(unqO)) {
          draft = normDraft.replace(unqO, unqR);
        }
      }
    }
    onApplyToDraft(draft, 'casual_audit');
  };

  const handleInternalExportMockupSvg = () => {
    if (onExportMockupSvg) {
      onExportMockupSvg();
      return;
    }
    const width = thumbnailAspectRatio === '16:9' ? 1280 : thumbnailAspectRatio === '1:1' ? 1080 : 720;
    const height = thumbnailAspectRatio === '16:9' ? 720 : thumbnailAspectRatio === '1:1' ? 1080 : 1280;
    const hookWordsText = (thumbnailHookText.trim() || 'ILUSI DIBONGKAR').toUpperCase();
    const safeTitle = (item.title || 'Zeinity Executive Video').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeHook = hookWordsText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a1324"/>
      <stop offset="50%" stop-color="#050a14"/>
      <stop offset="100%" stop-color="#02050a"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.9"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
  <rect x="${width * 0.05}" y="${height * 0.06}" width="${width * 0.9}" height="${height * 0.88}" fill="none" stroke="rgba(79, 232, 255, 0.25)" stroke-width="2" rx="16" />
  <g transform="translate(${width * 0.1}, ${height * 0.26})">
    <rect width="${width * 0.8}" height="${height * 0.48}" rx="20" fill="rgba(10, 22, 44, 0.65)" stroke="rgba(79, 232, 255, 0.3)" stroke-width="2"/>
    <text x="${width * 0.4}" y="${height * 0.27}" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.round(height * 0.10)}" font-weight="900" fill="#ffffff" text-anchor="middle" filter="url(#shadow)" letter-spacing="2">
      ${safeHook}
    </text>
  </g>
  <g transform="translate(${width * 0.08}, ${height * 0.80})">
    <rect width="${width * 0.84}" height="52" rx="10" fill="rgba(4, 12, 24, 0.9)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1"/>
    <text x="20" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#cbd5e1">
      TOPIK: ${safeTitle}
    </text>
  </g>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zeinity_thumbnail_${thumbnailAspectRatio.replace(':', '_')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="detail-card glass" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 2-PANEL MASTER-DETAIL LAYOUT */}
      <div className="finishing-packaging-layout">
        {/* =========================================================================
            LEFT PANEL: STEPPER NAVIGATION & PACKAGING PROGRESS (Width: ~320-340px)
           ========================================================================= */}
        <aside className="finishing-stepper-panel">
          {/* Header & Overall Progress */}
          <div style={{ background: '#070f1e', border: '1px solid #1a2f4c', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} />
              <span>Finishing &amp; Packaging</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4, lineHeight: 1.4 }}>
              Tahap pemolesan naskah, formula judul YouTube, dan desain visual thumbnail.
            </div>

            {/* Packaging Progress Bar */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 600 }}>
                  Progres Packaging:
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--cyan)', fontWeight: 700 }}>
                  {completedStepsCount} dari 3 Selesai ({progressPercentFinishing}%)
                </span>
              </div>
              <div style={{ width: '100%', height: 6, background: '#162842', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${progressPercentFinishing}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #38bdf8 0%, #10b981 100%)',
                    borderRadius: 3,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          </div>

          {/* 3 LARGE VERTICAL STEPPER CARDS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* CARD 1: Audit Spoken & TTS */}
            <div
              className={`finishing-stepper-card ${activeFinishingStep === 1 ? 'active' : ''}`}
              onClick={() => setActiveFinishingStep(1)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFinishingStep(1);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Langkah 1: Audit Spoken & TTS"
              aria-current={activeFinishingStep === 1 ? 'step' : undefined}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: isStep1Done ? 'rgba(52, 211, 153, 0.2)' : activeFinishingStep === 1 ? 'var(--cyan)' : '#1e293b',
                      color: isStep1Done ? 'var(--green)' : activeFinishingStep === 1 ? '#080e1a' : '#94a3b8',
                      border: `1px solid ${isStep1Done ? 'rgba(52, 211, 153, 0.4)' : activeFinishingStep === 1 ? 'var(--cyan)' : '#334155'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                    }}
                  >
                    1
                  </span>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>
                    Audit Spoken &amp; TTS
                  </span>
                </div>

                {isStep1Done ? (
                  <span className="collapsed-pill" style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--green)', fontSize: '0.68rem', fontWeight: 700, borderColor: 'rgba(52, 211, 153, 0.4)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Check size={11} /> SELESAI
                  </span>
                ) : (
                  <span className="collapsed-pill" style={{ background: 'rgba(249, 199, 79, 0.15)', color: 'var(--amber)', fontSize: '0.68rem', fontWeight: 700 }}>
                    ● PERLU AUDIT
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.35 }}>
                Evaluasi 4 dimensi kelayakan tutur lisan &amp; prosodi TTS AI.
              </div>

              <div style={{ fontSize: '0.70rem', color: isStep1Done ? 'var(--green)' : '#7890af', display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                {isStep1Done ? (
                  <>
                    <CheckCircle2 size={12} />
                    <span>{parsedDiffs.length > 0 ? `${parsedDiffs.length} Temuan Terdeteksi` : auditSummary || 'Temuan Tersedia'}</span>
                    {casualFindings ? (
                      <span style={{ color: 'var(--cyan)' }}>
                        • {parsedCasualDiffs.length > 0 ? `${parsedCasualDiffs.length} Temuan Kasual` : 'Gaya Sudah Kasual Friendly'}
                      </span>
                    ) : (
                      <span style={{ color: '#7890af' }}>
                        • Sub-sesi Kasual Siap
                      </span>
                    )}
                  </>
                ) : (
                  <span>Belum diaudit</span>
                )}
              </div>
            </div>

            {/* CARD 2: 5 Formula Judul */}
            <div
              className={`finishing-stepper-card ${activeFinishingStep === 2 ? 'active' : ''}`}
              onClick={() => setActiveFinishingStep(2)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFinishingStep(2);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Langkah 2: 5 Formula Judul"
              aria-current={activeFinishingStep === 2 ? 'step' : undefined}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: hasSelectedTitle ? 'rgba(52, 211, 153, 0.2)' : activeFinishingStep === 2 ? 'var(--cyan)' : hasTitlesGenerated ? 'rgba(56, 189, 248, 0.2)' : '#1e293b',
                      color: hasSelectedTitle ? 'var(--green)' : activeFinishingStep === 2 ? '#080e1a' : hasTitlesGenerated ? 'var(--cyan)' : '#94a3b8',
                      border: `1px solid ${hasSelectedTitle ? 'rgba(52, 211, 153, 0.4)' : activeFinishingStep === 2 ? 'var(--cyan)' : hasTitlesGenerated ? 'rgba(56, 189, 248, 0.4)' : '#334155'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                    }}
                  >
                    2
                  </span>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>
                    5 Formula Judul
                  </span>
                </div>

                {hasSelectedTitle ? (
                  <span className="collapsed-pill" style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--green)', fontSize: '0.68rem', fontWeight: 700, borderColor: 'rgba(52, 211, 153, 0.4)' }}>
                    ● JUDUL TERPILIH
                  </span>
                ) : hasTitlesGenerated ? (
                  <span className="collapsed-pill" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--cyan)', fontSize: '0.68rem', fontWeight: 700, borderColor: 'rgba(56, 189, 248, 0.4)' }}>
                    ● 5 VARIAN SIAP
                  </span>
                ) : (
                  <span className="collapsed-pill" style={{ background: 'rgba(249, 199, 79, 0.15)', color: 'var(--amber)', fontSize: '0.68rem', fontWeight: 700 }}>
                    ● BELUM DIBUAT
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.35 }}>
                {hasSelectedTitle && item.title ? (
                  <span style={{ color: '#cbd5e1' }}>
                    Aktif: <strong>"{item.title.length > 28 ? item.title.slice(0, 26) + '...' : item.title}"</strong>
                  </span>
                ) : hasTitlesGenerated ? (
                  <span style={{ color: '#cbd5e1' }}>
                    5 varian rekomendasi judul Zeinity siap dipilih.
                  </span>
                ) : (
                  'Rekomendasi formula judul Zeinity sesuai Bab 12, 25C &amp; 32.'
                )}
              </div>

              <div style={{ fontSize: '0.70rem', color: '#7890af', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span>{selectedRec ? selectedRec.formulaName : 'Formula Judul & Hook'}</span>
                <span>•</span>
                <span style={{ color: selectedRec?.isMobileSafe ? 'var(--green)' : undefined }}>
                  {selectedRec ? (selectedRec.isMobileSafe ? 'Aman Mobile (5–8 kata)' : `${selectedRec.wordCount} kata • Periksa`) : '5–8 kata • Mobile-safe'}
                </span>
              </div>
            </div>

            {/* CARD 3: Studio Thumbnail */}
            <div
              className={`finishing-stepper-card ${activeFinishingStep === 3 ? 'active' : ''}`}
              onClick={() => setActiveFinishingStep(3)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFinishingStep(3);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Langkah 3: Studio Thumbnail"
              aria-current={activeFinishingStep === 3 ? 'step' : undefined}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: activeFinishingStep === 3 ? 'var(--cyan)' : isStep3Done ? 'rgba(52, 211, 153, 0.2)' : '#1e293b',
                      color: activeFinishingStep === 3 ? '#080e1a' : isStep3Done ? 'var(--green)' : '#94a3b8',
                      border: `1px solid ${activeFinishingStep === 3 ? 'var(--cyan)' : isStep3Done ? 'rgba(52, 211, 153, 0.4)' : '#334155'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                    }}
                  >
                    3
                  </span>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>
                    Studio Thumbnail
                  </span>
                </div>

                {activeFinishingStep === 3 ? (
                  <span className="collapsed-pill" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--cyan)', fontSize: '0.68rem', fontWeight: 700 }}>
                    ● SEDANG AKTIF
                  </span>
                ) : isStep3Done ? (
                  <span className="collapsed-pill" style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--green)', fontSize: '0.68rem', fontWeight: 700 }}>
                    ● SIAP
                  </span>
                ) : (
                  <span className="collapsed-pill" style={{ background: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', fontSize: '0.68rem', fontWeight: 700 }}>
                    ● PERLU DESAIN
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.35 }}>
                Rasio: {thumbnailAspectRatio} • Hook: <strong>"{(thumbnailHookText.trim() || 'ILUSI DIBONGKAR').toUpperCase()}"</strong>
              </div>

              <div style={{ fontSize: '0.70rem', color: '#7890af' }}>
                Safe Zone 80% • Client-side HD SVG
              </div>
            </div>
          </div>

          {/* Bottom Back Button */}
          {onSwitchToWriting && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onSwitchToWriting}
              style={{
                marginTop: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: '0.78rem',
                padding: '9px 14px',
                color: '#cbd5e1',
                width: '100%',
              }}
            >
              <ArrowLeft size={14} />
              <span>← Kembali ke Studio Naskah</span>
            </button>
          )}
        </aside>

        {/* =========================================================================
            RIGHT PANEL: DEDICATED SUB-STUDIO CANVAS
           ========================================================================= */}
        <main className="finishing-substudio-canvas">
          {/* ==================== SUB-STUDIO 1: AUDIT SPOKEN & TTS ==================== */}
          {activeFinishingStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* SUB-SESSION MODE SWITCHER */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px',
                  background: '#070f1e',
                  border: '1px solid #1a2f4c',
                  borderRadius: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveAuditSubTab('spoken')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: activeAuditSubTab === 'spoken' ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
                    border: `1px solid ${activeAuditSubTab === 'spoken' ? 'rgba(52, 211, 153, 0.5)' : 'transparent'}`,
                    color: activeAuditSubTab === 'spoken' ? 'var(--green)' : '#94a3b8',
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span>Evaluasi Spoken &amp; TTS (Wajib)</span>
                  {isStep1Done && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', background: 'rgba(52, 211, 153, 0.2)', color: 'var(--green)', padding: '1px 6px', borderRadius: 4 }}>
                      <Check size={10} /> Selesai
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAuditSubTab('casual')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: activeAuditSubTab === 'casual' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    border: `1px solid ${activeAuditSubTab === 'casual' ? 'rgba(56, 189, 248, 0.5)' : 'transparent'}`,
                    color: activeAuditSubTab === 'casual' ? 'var(--cyan)' : '#94a3b8',
                  }}
                >
                  <Smile size={14} />
                  <span>Poles Kasual Friendly (Opsional)</span>
                  {casualFindings ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', background: 'rgba(56, 189, 248, 0.2)', color: 'var(--cyan)', padding: '1px 6px', borderRadius: 4 }}>
                      <Check size={10} /> {parsedCasualDiffs.length} Temuan
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--cyan)', padding: '1px 6px', borderRadius: 4 }}>
                      Poles Santai ✨
                    </span>
                  )}
                </button>
              </div>

              {activeAuditSubTab === 'spoken' ? (
                <>
                  {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'rgba(83, 242, 173, 0.08)',
                  border: '1px solid rgba(83, 242, 173, 0.2)',
                  borderRadius: 8,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, padding: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green)', fontSize: '0.92rem', fontWeight: 700 }}>
                    <CheckCircle2 size={17} /> Hasil Audit Spoken &amp; TTS
                  </h4>
                  {auditSummary && (
                    <span className="ai-summary-badge" style={{ margin: 0, padding: '2px 10px', fontSize: '0.74rem' }}>
                      <CheckCircle2 size={13} />
                      <span>{auditSummary}</span>
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {auditFindings && (
                    <button
                      type="button"
                      className={`copy-action-btn ${copied === 'findings' ? 'copied' : ''}`}
                      onClick={() => onCopy(auditFindings, 'findings')}
                      title="Salin Seluruh Laporan Temuan"
                      style={{ fontSize: '0.74rem', padding: '5px 10px' }}
                    >
                      {copied === 'findings' ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copied === 'findings' ? 'Tersalin' : 'Salin Temuan'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onRunAudit}
                    disabled={generatingAudit || loading || !scriptOutput.trim()}
                    style={{ fontSize: '0.74rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Jalankan audit tutur lisan & TTS"
                  >
                    {generatingAudit ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
                    <span>{generatingAudit ? 'Mengaudit...' : 'Audit Spoken & TTS ✨'}</span>
                  </button>
                </div>
              </div>

              {/* Prompt Copy Buttons for External AI */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`copy-action-btn ${copied === 'audit_prompt_hdr' ? 'copied' : ''}`}
                  onClick={() => onCopy(formatExternalAuditPrompt(scriptOutput), 'audit_prompt_hdr')}
                  disabled={!scriptOutput.trim()}
                  title="Salin Prompt Audit Spoken & TTS untuk ChatGPT / Claude"
                  style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                >
                  {copied === 'audit_prompt_hdr' ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied === 'audit_prompt_hdr' ? 'Audit Tersalin' : 'Salin Prompt Audit Spoken'}</span>
                </button>
                <button
                  type="button"
                  className={`copy-action-btn ${copied === 'audit_rev_prompt_hdr' ? 'copied' : ''}`}
                  onClick={() => onCopy(formatExternalFinalRevisionPrompt(scriptOutput, auditFindings), 'audit_rev_prompt_hdr')}
                  disabled={!scriptOutput.trim()}
                  title="Salin Prompt Revisi Naskah untuk ChatGPT / Claude"
                  style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                >
                  {copied === 'audit_rev_prompt_hdr' ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied === 'audit_rev_prompt_hdr' ? 'Prompt Tersalin' : 'Salin Prompt Revisi Naskah'}</span>
                </button>
              </div>

              {/* Interactive Diff Cards or Empty State */}
              {auditFindings ? (
                <>
                  {/* Full Revised Draft Apply Banner */}
                  {(auditRevisedDraft || parsedDiffs.length > 0) && (
                    <div
                      style={{
                        background: 'rgba(52, 211, 153, 0.08)',
                        border: '1px solid rgba(52, 211, 153, 0.3)',
                        borderRadius: 8,
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 10,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--green)' }}>
                          Draf Narasi Bersih Tersedia (Semua Perbaikan Digabung)
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                          Terapkan seluruh perbaikan lisan dan hilangkan tanda baca terlarang ke draf editor.
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`btn ${appliedKey === 'audit' ? 'btn-applied' : 'btn-primary'}`}
                        onClick={handleApplyAllRevisions}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '7px 16px', fontWeight: 700 }}
                      >
                        <Check size={14} />
                        <span>{appliedKey === 'audit' ? 'Sudah Diterapkan' : 'Terapkan Revisi ke Draf Naskah'}</span>
                      </button>
                    </div>
                  )}

                  {/* Diff Cards List */}
                  {parsedDiffs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {parsedDiffs.map((diff) => (
                        <div
                          key={diff.id}
                          className="interactive-diff-card"
                          style={{
                            background: '#070f1e',
                            border: '1px solid #1a2f4c',
                            borderRadius: 8,
                            padding: 14,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  color: '#f87171',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  borderRadius: 4,
                                  padding: '2px 8px',
                                }}
                              >
                                Temuan #{diff.id}
                              </span>
                              {diff.problem && (
                                <span style={{ fontSize: '0.78rem', color: '#fca5a5', fontWeight: 600 }}>
                                  {diff.problem}
                                </span>
                              )}
                            </div>

                            {diff.original && diff.revision && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleApplySingleDiff(diff.original, diff.revision, diff.id)}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '3px 10px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  color: appliedKey === `diff_${diff.id}` ? 'var(--green)' : 'var(--cyan)',
                                  borderColor: appliedKey === `diff_${diff.id}` ? 'var(--green)' : 'rgba(56, 189, 248, 0.4)',
                                }}
                                title="Terapkan perbaikan bagian ini saja ke naskah"
                              >
                                <Check size={12} />
                                <span>{appliedKey === `diff_${diff.id}` ? 'Telah Diterapkan' : 'Terapkan Revisi Ini'}</span>
                              </button>
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 6, padding: '8px 12px' }}>
                              <div style={{ fontSize: '0.68rem', color: '#f87171', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                ✖ BAGIAN ASLI
                              </div>
                              <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5, textDecoration: 'line-through', opacity: 0.85 }}>
                                {diff.original}
                              </div>
                            </div>

                            <div style={{ background: 'rgba(52, 211, 153, 0.06)', border: '1px solid rgba(52, 211, 153, 0.25)', borderRadius: 6, padding: '8px 12px' }}>
                              <div style={{ fontSize: '0.68rem', color: 'var(--green)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                ✓ REVISI SPOKEN / TTS
                              </div>
                              <div style={{ fontSize: '0.82rem', color: '#f8fafc', lineHeight: 1.5, fontWeight: 500 }}>
                                {diff.revision}
                              </div>
                            </div>
                          </div>

                          {diff.reason && (
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>💡</span>
                              <span>{diff.reason}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <pre className="audit-pre" style={{ maxHeight: 300, overflowY: 'auto' }}>
                      {auditFindings}
                    </pre>
                  )}

                  {/* Bridge Banner to Casual Sub-Session */}
                  <div
                    style={{
                      background: 'rgba(56, 189, 248, 0.08)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: 8,
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      flexWrap: 'wrap',
                      marginTop: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)' }}>
                        <Smile size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>
                          Audit Spoken Selesai — Lanjutkan ke Sub-Sesi Kasual Friendly?
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                          Ubah gaya naskah formal/kaku menjadi gaya tutur santai, akrab, dan ramah pendengar ala teman diskusi cerdas Zeinity.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setActiveAuditSubTab('casual')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.78rem',
                        padding: '6px 14px',
                        color: 'var(--cyan)',
                        borderColor: 'rgba(56, 189, 248, 0.4)',
                        fontWeight: 700,
                      }}
                    >
                      <span>Buka Sub-Sesi Kasual Friendly ➔</span>
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px 16px', background: '#070f1e', borderRadius: 8, border: '1px dashed #1a2f4c' }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 14px 0' }}>
                    Belum ada hasil audit spoken untuk draf ini.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onRunAudit}
                    disabled={generatingAudit || loading || !scriptOutput.trim()}
                    style={{ fontSize: '0.84rem', padding: '8px 18px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {generatingAudit ? (
                      <>
                        <Loader2 size={14} className="spin" /> Mengaudit...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} /> Jalankan Audit Spoken Sekarang ✨
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Bottom Navigation for Spoken */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveFinishingStep(2)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', fontSize: '0.84rem', fontWeight: 700 }}
                >
                  <span>Lanjut ke 5 Formula Judul ➔</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* VIEW B: CASUAL FRIENDLY REWRITE SUB-SESSION */}
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: 8,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, padding: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--cyan)', fontSize: '0.92rem', fontWeight: 700 }}>
                    <Smile size={17} /> Sub-Sesi: Transformasi Kasual Friendly
                  </h4>
                  {casualSummary && (
                    <span className="ai-summary-badge" style={{ margin: 0, padding: '2px 10px', fontSize: '0.74rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--cyan)', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                      <CheckCircle2 size={13} />
                      <span>{casualSummary}</span>
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {casualFindings && (
                    <button
                      type="button"
                      className={`copy-action-btn ${copied === 'casual_findings' ? 'copied' : ''}`}
                      onClick={() => onCopy(casualFindings, 'casual_findings')}
                      title="Salin Seluruh Temuan Kasual Friendly"
                      style={{ fontSize: '0.74rem', padding: '5px 10px' }}
                    >
                      {copied === 'casual_findings' ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copied === 'casual_findings' ? 'Tersalin' : 'Salin Temuan Kasual'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onRunCasualAudit}
                    disabled={generatingCasualAudit || loading || !scriptOutput.trim()}
                    style={{ fontSize: '0.74rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--cyan)', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                    title="Jalankan transformasi formal ke kasual friendly"
                  >
                    {generatingCasualAudit ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
                    <span>{generatingCasualAudit ? 'Memoles Kasual...' : 'Audit Kasual Friendly ✨'}</span>
                  </button>
                </div>
              </div>

              {/* Prompt Copy Buttons for External AI */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`copy-action-btn ${copied === 'casual_prompt_hdr' ? 'copied' : ''}`}
                  onClick={() => onCopy(formatExternalCasualAuditPrompt(scriptOutput), 'casual_prompt_hdr')}
                  disabled={!scriptOutput.trim()}
                  title="Salin Prompt Kasual Friendly untuk ChatGPT / Claude"
                  style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                >
                  {copied === 'casual_prompt_hdr' ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied === 'casual_prompt_hdr' ? 'Prompt Kasual Tersalin' : 'Salin Prompt Kasual Friendly'}</span>
                </button>
              </div>

              {/* Principles banner */}
              <div style={{ background: '#091322', border: '1px solid #1a2f4c', borderRadius: 8, padding: '10px 14px', fontSize: '0.74rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ color: '#cbd5e1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>💬</span>
                  <span>Filosofi Kasual Friendly Zeinity:</span>
                </div>
                <div style={{ lineHeight: 1.45 }}>
                  Mengubah nada ensiklopedia dan kalimat pasif kaku (misal: <em>"Berdasarkan data...", "Dapat disimpulkan bahwa..."</em>) menjadi bahasa percakapan hangat dan santai layaknya teman sebaya yang cerdas (<em>"Kalau kita perhatiin...", "Intinya..."</em>), tanpa menggunakan bahasa alay dan tetap mematuhi prosodi TTS.
                </div>
              </div>

              {/* Interactive Diff Cards or Empty State for Casual Audit */}
              {casualFindings ? (
                <>
                  {/* Full Revised Draft Apply Banner */}
                  {(casualRevisedDraft || parsedCasualDiffs.length > 0) && (
                    <div
                      style={{
                        background: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: 8,
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 10,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--cyan)' }}>
                          Draf Narasi Kasual Friendly Tersedia (Semua Perbaikan Digabung)
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                          Terapkan seluruh polesan gaya santai dan ramah pendengar ke draf editor.
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`btn ${appliedKey === 'casual_audit' ? 'btn-applied' : 'btn-primary'}`}
                        onClick={handleApplyAllCasualRevisions}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '7px 16px', fontWeight: 700 }}
                      >
                        <Check size={14} />
                        <span>{appliedKey === 'casual_audit' ? 'Sudah Diterapkan' : 'Terapkan Revisi Kasual ke Draf'}</span>
                      </button>
                    </div>
                  )}

                  {/* Diff Cards List */}
                  {parsedCasualDiffs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {parsedCasualDiffs.map((diff) => (
                        <div
                          key={diff.id}
                          className="interactive-diff-card"
                          style={{
                            background: '#070f1e',
                            border: '1px solid #1a2f4c',
                            borderRadius: 8,
                            padding: 14,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  color: '#f87171',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  borderRadius: 4,
                                  padding: '2px 8px',
                                }}
                              >
                                Temuan Kasual #{diff.id}
                              </span>
                              {diff.problem && (
                                <span style={{ fontSize: '0.78rem', color: '#fca5a5', fontWeight: 600 }}>
                                  {diff.problem}
                                </span>
                              )}
                            </div>

                            {diff.original && diff.revision && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleApplySingleCasualDiff(diff.original, diff.revision, diff.id)}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '3px 10px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  color: appliedKey === `casual_diff_${diff.id}` ? 'var(--green)' : 'var(--cyan)',
                                  borderColor: appliedKey === `casual_diff_${diff.id}` ? 'var(--green)' : 'rgba(56, 189, 248, 0.4)',
                                }}
                                title="Terapkan perbaikan bagian ini saja ke naskah"
                              >
                                <Check size={12} />
                                <span>{appliedKey === `casual_diff_${diff.id}` ? 'Telah Diterapkan' : 'Terapkan Revisi Ini'}</span>
                              </button>
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 6, padding: '8px 12px' }}>
                              <div style={{ fontSize: '0.68rem', color: '#f87171', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                ✖ GAYA FORMAL / KAKU
                              </div>
                              <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5, textDecoration: 'line-through', opacity: 0.85 }}>
                                {diff.original}
                              </div>
                            </div>

                            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 6, padding: '8px 12px' }}>
                              <div style={{ fontSize: '0.68rem', color: 'var(--cyan)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                ✓ REVISI KASUAL FRIENDLY
                              </div>
                              <div style={{ fontSize: '0.82rem', color: '#f8fafc', lineHeight: 1.5, fontWeight: 500 }}>
                                {diff.revision}
                              </div>
                            </div>
                          </div>

                          {diff.reason && (
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>💡</span>
                              <span>{diff.reason}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <pre className="audit-pre" style={{ maxHeight: 300, overflowY: 'auto' }}>
                      {casualFindings}
                    </pre>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px 16px', background: '#070f1e', borderRadius: 8, border: '1px dashed #1a2f4c' }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 14px 0' }}>
                    Belum ada hasil audit kasual friendly untuk draf ini.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onRunCasualAudit}
                    disabled={generatingCasualAudit || loading || !scriptOutput.trim()}
                    style={{ fontSize: '0.84rem', padding: '8px 18px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {generatingCasualAudit ? (
                      <>
                        <Loader2 size={14} className="spin" /> Memoles Kasual...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} /> Jalankan Audit Kasual Friendly ✨
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Bottom Navigation for Casual */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveAuditSubTab('spoken')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: '0.84rem' }}
                >
                  <ArrowLeft size={14} />
                  <span>Kembali ke Audit Spoken (Wajib)</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveFinishingStep(2)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', fontSize: '0.84rem', fontWeight: 700 }}
                >
                  <span>Lanjut ke 5 Formula Judul ➔</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

          {/* ==================== SUB-STUDIO 2: 5 FORMULA JUDUL YOUTUBE ==================== */}
          {activeFinishingStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'rgba(249, 199, 79, 0.08)',
                  border: '1px solid rgba(249, 199, 79, 0.25)',
                  borderRadius: 8,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, padding: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--amber)', fontSize: '0.92rem', fontWeight: 700 }}>
                    <Sparkles size={17} /> Rekomendasi Judul YouTube (5 Formula Hook Zeinity)
                  </h4>
                  <span className="collapsed-pill" style={{ background: 'rgba(249, 199, 79, 0.12)', color: 'var(--amber)', borderColor: 'rgba(249, 199, 79, 0.3)' }}>
                    Bab 12, 25C &amp; 32
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onGenerateTitles}
                    disabled={generatingTitles || loading}
                    style={{ padding: '5px 12px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Generate ulang 5 varian judul hook Zeinity"
                  >
                    <RotateCw size={13} className={generatingTitles ? 'spin' : ''} />
                    <span>{generatingTitles ? 'Membuat...' : 'Generate Rekomendasi Judul ✨'}</span>
                  </button>

                  <button
                    type="button"
                    className={`copy-action-btn ${copied === 'title_prompt_hdr' ? 'copied' : ''}`}
                    onClick={() => onCopy(formatExternalTitlePrompt(item.title, item.category || 'Umum', scriptOutput || item.external_research_output || ''), 'title_prompt_hdr')}
                    title="Salin Prompt 5 Formula Judul untuk ChatGPT / Claude"
                    style={{ fontSize: '0.74rem', padding: '5px 10px' }}
                  >
                    {copied === 'title_prompt_hdr' ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied === 'title_prompt_hdr' ? 'Tersalin' : 'Salin Prompt Judul'}</span>
                  </button>
                </div>
              </div>

              {/* 5 Titles Cards Responsive Grid */}
              <div className="title-recommendations-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: 12 }}>
                {titlesList.length > 0 ? (
                  titlesList.map((rec, idx) => {
                    const words = rec.title.trim().split(/\s+/).filter(Boolean);
                    const wordCount = rec.wordCount || words.length;
                    const isSafe = rec.isMobileSafe ?? (wordCount >= 5 && wordCount <= 8);
                    const copyKey = `title_${rec.id || idx}`;
                    const isSelected = isSelectedTitle(rec.title);

                    return (
                      <div
                        key={rec.id || idx}
                        className={`title-card formula-card ${isSelected ? 'active-title' : ''}`}
                        style={{
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          border: isSelected ? '1.5px solid var(--green)' : undefined,
                          boxShadow: isSelected ? '0 0 16px rgba(52, 211, 153, 0.25)' : undefined,
                          background: isSelected ? 'rgba(52, 211, 153, 0.06)' : undefined,
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
                            <span className="mode-label formula-badge" style={{ fontSize: '0.72rem' }}>
                              {rec.formulaName || `Formula ${idx + 1}`}
                            </span>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              {isSelected && (
                                <span className="collapsed-pill" style={{ background: 'rgba(52, 211, 153, 0.2)', color: 'var(--green)', fontSize: '0.68rem', fontWeight: 700, borderColor: 'var(--green)' }}>
                                  Judul Utama Aktif ✓
                                </span>
                              )}
                              <span
                                className="collapsed-pill"
                                style={{
                                  background: isSafe ? 'rgba(52, 211, 153, 0.15)' : 'rgba(249, 199, 79, 0.15)',
                                  color: isSafe ? 'var(--green)' : 'var(--amber)',
                                  borderColor: isSafe ? 'rgba(52, 211, 153, 0.3)' : 'rgba(249, 199, 79, 0.3)',
                                  fontSize: '0.68rem',
                                }}
                              >
                                {wordCount} kata • {isSafe ? 'Aman Mobile (5–8 kata)' : 'Periksa Panjang'}
                              </span>
                            </div>
                          </div>

                          <div className="title-text" style={{ color: '#ffffff', marginBottom: 8, fontSize: '0.94rem', fontWeight: 700, lineHeight: 1.4 }}>
                            {rec.title}
                          </div>

                          {rec.explanation && (
                            <p style={{ fontSize: '0.73rem', color: '#94a3b8', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                              {rec.explanation}
                            </p>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                          <button
                            type="button"
                            className={`copy-action-btn ${copied === copyKey ? 'copied' : ''}`}
                            onClick={() => onCopy(rec.title, copyKey)}
                            title="Salin judul ini"
                            style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                          >
                            {copied === copyKey ? <Check size={12} /> : <Copy size={12} />}
                            <span>{copied === copyKey ? 'Tersalin!' : 'Salin'}</span>
                          </button>

                          {!isSelected ? (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => onApplyTitleAsMain(rec.title)}
                              style={{ padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600 }}
                              title="Gunakan sebagai judul utama konten ini"
                            >
                              Gunakan sbg Judul
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}>
                              <Check size={13} /> Aktif Terpilih
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '36px 16px', background: '#08101d', borderRadius: 8, border: '1px dashed #203554' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 14px 0' }}>
                      Belum ada rekomendasi judul yang dibuat untuk naskah ini.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={onGenerateTitles}
                      disabled={generatingTitles || loading}
                      style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {generatingTitles ? (
                        <>
                          <Loader2 size={14} className="spin" /> Membuat Judul...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} /> Generate Rekomendasi Judul ✨
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Navigation */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveFinishingStep(3)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', fontSize: '0.84rem', fontWeight: 700 }}
                >
                  <span>Lanjut ke Studio Thumbnail ➔</span>
                </button>
              </div>
            </div>
          )}

          {/* ==================== SUB-STUDIO 3: STUDIO THUMBNAIL (INLINE) ==================== */}
          {activeFinishingStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: 8,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div>
                  <h4 style={{ margin: 0, padding: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--cyan)', fontSize: '0.92rem', fontWeight: 700 }}>
                    <ImageIcon size={17} /> Studio Thumbnail (Copywriting &amp; Mockup Visual)
                  </h4>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>
                    Standar Packaging Bab 13: Hook Teks 2–4 Kata Kapital Kontras Tinggi &amp; Safe Zone 80%.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleInternalExportMockupSvg}
                    style={{ fontSize: '0.74rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Unduh mockup thumbnail format vektor SVG resolusi tinggi"
                  >
                    <Download size={13} />
                    <span>Unduh Mockup SVG (Vektor HD)</span>
                  </button>
                </div>
              </div>

              {/* Split 2-Column Studio */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
                  gap: 16,
                  alignItems: 'start',
                }}
              >
                {/* Left Sub-Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Hook Text Input */}
                  <div style={{ background: '#07101f', padding: '12px 14px', borderRadius: 8, border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                      <label htmlFor="finishing-thumbnail-hook-input" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Sparkles size={14} /> Hook Teks Thumbnail (2–4 Kata Kapital):
                      </label>
                      <span
                        className="collapsed-pill"
                        style={{
                          background: isHookOptimal ? 'rgba(52, 211, 153, 0.15)' : 'rgba(249, 199, 79, 0.15)',
                          color: isHookOptimal ? 'var(--green)' : 'var(--amber)',
                          borderColor: isHookOptimal ? 'rgba(52, 211, 153, 0.3)' : 'rgba(249, 199, 79, 0.3)',
                          fontSize: '0.70rem',
                          padding: '2px 8px',
                        }}
                      >
                        {hookWords.length} kata ({currentHookText.length} char) • {isHookOptimal ? 'Aman Hook (2–4 Kata)' : 'Optimal: 2–4 Kata'}
                      </span>
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <input
                        id="finishing-thumbnail-hook-input"
                        type="text"
                        value={thumbnailHookText}
                        onChange={(e) => onHookTextChange(e.target.value.toUpperCase())}
                        placeholder="Contoh: ILUSI DIBONGKAR"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '0.88rem',
                          background: '#0b1324',
                          border: '1px solid #334155',
                          borderRadius: 6,
                          color: '#f8fafc',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* Quick Preset Chips */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>Preset Cepat:</span>
                      {['ILUSI DIBONGKAR', 'FAKTA TERSEMBUNYI', 'JEBAKAN SISTEM', 'AKHIRNYA TERUNGKAP'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => onHookTextChange(preset)}
                          style={{
                            fontSize: '0.70rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 4,
                            border: currentHookText.trim().toUpperCase() === preset ? '1px solid var(--cyan)' : '1px solid #334155',
                            background: currentHookText.trim().toUpperCase() === preset ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                            color: currentHookText.trim().toUpperCase() === preset ? '#38bdf8' : '#94a3b8',
                            cursor: 'pointer',
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Aspect Ratio & Model Provider */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', background: '#07101f', padding: '10px 14px', borderRadius: 8, border: '1px solid #1e293b' }}>
                    <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600 }}>Rasio:</span>
                      {(['16:9', '1:1', '9:16'] as const).map((ratio) => (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => onAspectRatioChange(ratio)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.74rem',
                            borderRadius: 6,
                            border: `1px solid ${thumbnailAspectRatio === ratio ? 'var(--cyan)' : '#334155'}`,
                            background: thumbnailAspectRatio === ratio ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                            color: thumbnailAspectRatio === ratio ? '#38bdf8' : '#cbd5e1',
                            cursor: 'pointer',
                            fontWeight: thumbnailAspectRatio === ratio ? 700 : 500,
                          }}
                        >
                          {ratio === '16:9' ? '16:9 (YT)' : ratio === '9:16' ? '9:16 (Shorts)' : '1:1'}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600 }}>Model:</span>
                      <select
                        value={thumbnailProvider}
                        onChange={(e) => onProviderChange(e.target.value as 'imagen3' | 'dalle3' | 'flux')}
                        style={{
                          background: '#0b1324',
                          color: '#e2e8f0',
                          border: '1px solid #334155',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: '0.74rem',
                        }}
                      >
                        <option value="imagen3">Google Imagen 3 (0 Token)</option>
                        <option value="dalle3">OpenAI DALL-E 3 (Placeholder)</option>
                        <option value="flux">Flux 1.1 Pro (Placeholder)</option>
                      </select>
                    </div>
                  </div>

                  {/* Copywriting Prompt Textarea */}
                  <div style={{ background: '#07101f', padding: '12px 14px', borderRadius: 8, border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FileText size={14} style={{ color: 'var(--cyan)' }} /> Prompt Copywriting AI (Midjourney / DALL-E):
                      </span>
                    </div>

                    <div style={{ background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 6, padding: '8px 10px', marginBottom: 10, fontSize: '0.74rem', color: '#94a3b8' }}>
                      <strong style={{ color: 'var(--cyan)' }}>Aturan Thumbnail Zeinity (Bab 13):</strong> Teks 2–4 kata UPPERCASE • Stakes emosional visual • Dilarang mengulang kata judul.
                    </div>

                    {thumbnailPrompt || generatedThumbnailPrompt ? (
                      <>
                        <pre className="audit-pre" style={{ maxHeight: 220, overflowY: 'auto' }}>
                          {formatStructuredPrompt(thumbnailPrompt || generatedThumbnailPrompt)}
                        </pre>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className={`copy-action-btn ${copied === 'thumb_prompt' ? 'copied' : ''}`}
                            onClick={() => onCopy(formatStructuredPrompt(thumbnailPrompt || generatedThumbnailPrompt), 'thumb_prompt')}
                            title="Salin seluruh prompt thumbnail"
                            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                          >
                            {copied === 'thumb_prompt' ? <Check size={14} /> : <Copy size={14} />}
                            <span>{copied === 'thumb_prompt' ? 'Tersalin!' : 'Salin Thumbnail Prompt'}</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => onGenerateThumbnail(false)}
                            disabled={generatingThumbnail || loading}
                            style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            <RotateCw size={13} className={generatingThumbnail ? 'spin' : ''} />
                            <span>{generatingThumbnail ? 'Memproses...' : 'Regenerate Prompt'}</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '24px 12px', background: '#091322', borderRadius: 6, border: '1px dashed #1a2f4c' }}>
                        <p style={{ color: '#94a3b8', fontSize: '0.80rem', margin: '0 0 10px 0' }}>
                          Prompt copywriting AI belum dibuat untuk naskah ini.
                        </p>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => onGenerateThumbnail(false)}
                          disabled={generatingThumbnail || loading}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: '0.78rem' }}
                        >
                          {generatingThumbnail ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
                          <span>{generatingThumbnail ? 'Merumuskan Prompt...' : 'Generate Thumbnail Prompt ✨'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Sub-Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Live Mockup Canvas */}
                  <div style={{ background: '#07101f', padding: '14px', borderRadius: 8, border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ImageIcon size={14} style={{ color: 'var(--cyan)' }} /> Live Mockup Canvas Preview:
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--cyan)', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 8px', borderRadius: 4 }}>
                        100% Client-Side Vector
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: thumbnailAspectRatio === '16:9' ? 520 : thumbnailAspectRatio === '1:1' ? 360 : 260,
                          aspectRatio: thumbnailAspectRatio === '16:9' ? '16/9' : thumbnailAspectRatio === '1:1' ? '1/1' : '9/16',
                          background: 'radial-gradient(ellipse at 50% 30%, #1e293b 0%, #080f1d 75%, #030712 100%)',
                          border: '2px solid rgba(56, 189, 248, 0.4)',
                          borderRadius: 12,
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          padding: 16,
                          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.15)',
                        }}
                      >
                        {/* Safe Zone 80% Overlay Guide */}
                        <div
                          style={{
                            position: 'absolute',
                            inset: '10%',
                            border: '1px dashed rgba(56, 189, 248, 0.28)',
                            borderRadius: 8,
                            pointerEvents: 'none',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'flex-start',
                            padding: 6,
                          }}
                        >
                          <span style={{ fontSize: '0.60rem', color: 'rgba(56, 189, 248, 0.6)', letterSpacing: '0.5px', fontWeight: 600 }}>
                            SAFE ZONE 80%
                          </span>
                        </div>

                        {/* Canvas Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 4, color: 'var(--cyan)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                            {thumbnailAspectRatio} • {thumbnailProvider.toUpperCase()} PREVIEW
                          </span>
                          <span style={{ fontSize: '0.62rem', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                            HIGH TENSION
                          </span>
                        </div>

                        {/* Center Focal Visual Area */}
                        <div style={{ textAlign: 'center', zIndex: 1, padding: '10px 0' }}>
                          <div style={{ width: 42, height: 42, margin: '0 auto 8px auto', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', border: '1.5px solid var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)' }}>
                            <ImageIcon size={20} />
                          </div>
                          <div
                            style={{
                              fontSize: thumbnailAspectRatio === '9:16' ? '1.05rem' : '1.30rem',
                              fontWeight: 900,
                              color: '#ffffff',
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                              textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 15px rgba(249, 199, 79, 0.4)',
                              background: 'linear-gradient(180deg, #ffffff 20%, #fde047 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              lineHeight: 1.15,
                            }}
                          >
                            {(thumbnailHookText.trim() || 'ILUSI DIBONGKAR').toUpperCase()}
                          </div>
                          <span style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: 4, display: 'inline-block' }}>
                            (Maksimal 2–4 Kata Kapital Kontras Tinggi)
                          </span>
                        </div>

                        {/* Canvas Footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                          <span style={{ fontSize: '0.62rem', color: '#94a3b8', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4 }}>
                            Subjek Utama + Objek Kontras
                          </span>
                          <span style={{ fontSize: '0.62rem', color: 'var(--amber)', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4 }}>
                            Zero Clutter
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Standar Mutu Thumbnail Checklist */}
                  <div
                    style={{
                      background: '#07101f',
                      border: '1px solid #1e293b',
                      borderRadius: 8,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--cyan)', marginBottom: 2 }}>
                      Standar Mutu Thumbnail Zeinity (Bab 13):
                    </div>
                    <div style={{ fontSize: '0.72rem', color: isHookOptimal ? 'var(--green)' : 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{isHookOptimal ? '✓' : '⚠️'}</span>
                      <span>Teks 2–4 kata UPPERCASE kontras tinggi ({hookWords.length} kata: {isHookOptimal ? 'Terpenuhi' : 'Periksa'})</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>✓</span>
                      <span>Menghadirkan stakes emosional visual (dilarang mengulang kata judul)</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>✓</span>
                      <span>Subjek utama terfokus + objek kontras (Zero clutter)</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>✓</span>
                      <span>Safe Zone 80% menjamin keterbacaan di layar perangkat mobile</span>
                    </div>
                  </div>

                  {/* Unduh Mockup SVG Button in Right Sub-Column */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleInternalExportMockupSvg}
                      style={{
                        fontSize: '0.78rem',
                        padding: '8px 16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(56, 189, 248, 0.1)',
                        borderColor: 'rgba(56, 189, 248, 0.35)',
                        color: '#38bdf8',
                        fontWeight: 700,
                        width: '100%',
                        justifyContent: 'center',
                      }}
                      title="Unduh mockup thumbnail format vektor SVG resolusi tinggi"
                    >
                      <Download size={14} />
                      <span>Unduh Mockup SVG (Vektor HD)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Footer Hero Bar */}
              <div
                style={{
                  marginTop: 10,
                  padding: '14px 18px',
                  background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(56, 189, 248, 0.12) 100%)',
                  border: '1px solid rgba(52, 211, 153, 0.35)',
                  borderRadius: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle2 size={20} style={{ color: 'var(--green)' }} />
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc' }}>
                      Seluruh Tahapan Finishing &amp; Packaging Siap
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                      Naskah terverifikasi lisan, judul hook terpilih, dan kemasan visual siap dipublikasikan.
                    </div>
                  </div>
                </div>

                {onPublish && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onPublish}
                    disabled={loading || generatingThumbnail}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 20px',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderColor: '#10b981',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    <span>Tandai Siap Publikasi / Publish ➔</span>
                    <Check size={16} />
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </section>
  );
};

export default ScriptDraftStudio;
