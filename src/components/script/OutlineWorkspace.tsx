import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  RotateCw,
  RotateCcw,
  Sparkles,
  Loader2,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  type ContentItem,
  type ScriptBeatNumber,
  type HookRecommendationResult,
  ZEINITY_HOOK_FORMULAS,
} from '@/types';
import {
  formatStructuredPrompt,
  formatExternalOutlinePrompt,
  formatExternalScriptingPrompt,
  SCRIPT_BEATS,
  calculateBeatTargetWords,
  getHookFormulaById,
} from '@/lib/gemini';

export interface OutlineWorkspaceProps {
  productionTrack: 'in_app' | 'external';
  externalSubMode: 'one_shot' | 'step_by_step';
  onExternalSubModeChange: (mode: 'one_shot' | 'step_by_step') => void;
  computedTargetWords: number;
  outlineText: string;
  onOutlineChange: (text: string) => void;
  onOutlineBlur: () => void;
  isOutlineApproved: boolean;
  generatingOutline: boolean;
  generatingFullScript: boolean;
  revisionNoteInput: string;
  onRevisionNoteChange: (val: string) => void;
  onGenerateOutline: (isRegenerate: boolean) => void;
  onUndoOutline: () => void;
  canUndoOutline: boolean;
  onApproveAndGenerateScript: () => void;
  onApproveExternalOutline: () => void;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
  item: ContentItem;
  researchOutput: string;
  identityText: string;
  angleNotes: string;
  targetDuration: string;
  handoffPrompt: string;
  generatingHandoff: boolean;
  onGenerateHandoff: () => void;
  loading?: boolean;
  // Per-Beat generation props
  onGenerateBeat?: (beatNumber: ScriptBeatNumber, beatRevisionNotes?: string) => void;
  generatingBeatNumber?: number | null;
  // Hook-First Pipeline props
  selectedHookType?: string;
  onSelectHookType?: (hookType: string) => void;
  hookDraft?: string;
  onHookDraftChange?: (val: string) => void;
  hookNotes?: string;
  onHookNotesChange?: (val: string) => void;
  hookRecommendation?: HookRecommendationResult | null;
  recommendingHook?: boolean;
  onRecommendHook?: () => void;
  generatingHook?: boolean;
  onGenerateHook?: (isRegenerate?: boolean) => void;
  onApplyHookToOutline?: () => void;
}

export const OutlineWorkspace: React.FC<OutlineWorkspaceProps> = ({
  productionTrack,
  externalSubMode,
  onExternalSubModeChange,
  computedTargetWords,
  outlineText,
  onOutlineChange,
  onOutlineBlur,
  isOutlineApproved,
  generatingOutline,
  generatingFullScript,
  revisionNoteInput,
  onRevisionNoteChange,
  onGenerateOutline,
  onUndoOutline,
  canUndoOutline,
  onApproveAndGenerateScript,
  onApproveExternalOutline,
  copied,
  onCopy,
  item,
  researchOutput,
  identityText,
  angleNotes,
  targetDuration,
  handoffPrompt,
  generatingHandoff,
  onGenerateHandoff,
  loading = false,
  onGenerateBeat,
  generatingBeatNumber = null,
  selectedHookType = '',
  onSelectHookType,
  hookDraft = '',
  onHookDraftChange,
  hookNotes = '',
  onHookNotesChange,
  hookRecommendation = null,
  recommendingHook = false,
  onRecommendHook,
  generatingHook = false,
  onGenerateHook,
  onApplyHookToOutline,
}) => {
  const formatPromptText = formatStructuredPrompt;
  const [selectedBeatForRevision, setSelectedBeatForRevision] = useState<ScriptBeatNumber | null>(null);
  const [beatRevisionNote, setBeatRevisionNote] = useState<string>('');
  const [isHookCollapsed, setIsHookCollapsed] = useState<boolean>(() => {
    // If hook is selected and either draft or outline is already populated, default to collapsed
    return Boolean(selectedHookType && (hookDraft.trim() || outlineText.trim()));
  });

  const hookDraftWords = hookDraft && hookDraft.trim() ? hookDraft.trim().split(/\s+/).filter(Boolean).length : 0;
  const activeFormula = getHookFormulaById(selectedHookType);
  const activeFormulaName = activeFormula ? activeFormula.name : (selectedHookType || 'Belum Dipilih');

  const handleTriggerBeatGen = (beatNum: ScriptBeatNumber) => {
    if (onGenerateBeat) {
      onGenerateBeat(beatNum, selectedBeatForRevision === beatNum ? beatRevisionNote : undefined);
      if (selectedBeatForRevision === beatNum) {
        setSelectedBeatForRevision(null);
        setBeatRevisionNote('');
      }
    }
  };

  return (
    <section className="detail-card glass" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid #1a2942', paddingBottom: 10, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
          <FileText size={17} /> Pipeline Kerangka (Outline Studio)
        </h3>
        <span className="collapsed-pill" style={{ background: 'rgba(79, 232, 255, 0.12)', color: 'var(--cyan)' }}>
          Fokus Panel
        </span>
      </div>

      {productionTrack === 'in_app' ? (
        /* IN-APP TRACK */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ========================================================================= */}
          {/* TAHAP 1: HOOK STUDIO (ACCORDION PROGRESSIVE DISCLOSURE)                  */}
          {/* ========================================================================= */}
          {isHookCollapsed && selectedHookType ? (
            /* Collapsed Summary Badge */
            <div
              style={{
                background: '#07101e',
                border: '1.2px solid rgba(16, 185, 129, 0.35)',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onClick={() => setIsHookCollapsed(false)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid #10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#34d399',
                    fontSize: '0.75rem',
                    fontWeight: 900,
                  }}
                >
                  ✓
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Tahap 1: Tentukan & Generate Hook Pembuka (0–30 Detik)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                    Terpilih: "{activeFormulaName}" {hookDraftWords > 0 ? `• ${hookDraftWords} Kata` : ''}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsHookCollapsed(false);
                }}
                style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                title="Buka pilihan varian Hook"
              >
                <span>Ubah</span>
                <ChevronDown size={13} />
              </button>
            </div>
          ) : (
            /* Expanded Tahap 1 Hook Studio */
            <div
              style={{
                background: '#0a1628',
                border: '1.2px solid #1e3a63',
                borderRadius: 8,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {/* Header: Title + Rekomendasi Hook Button + Collapse toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={16} />
                    <span>Tahap 1: Tentukan & Generate Hook Pembuka (0–30 Detik)</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                    Pilih formula hook 20–30 detik (~80–180 kata) untuk mengunci retensi penonton sejak awal.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onRecommendHook}
                    disabled={recommendingHook}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 11px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      color: '#f8fafc',
                      borderColor: 'rgba(79, 232, 255, 0.4)',
                      background: 'rgba(79, 232, 255, 0.08)',
                    }}
                    title="AI menganalisis topik dan riset untuk merekomendasikan varian hook terbaik"
                  >
                    {recommendingHook ? (
                      <>
                        <Loader2 size={13} className="spin" /> Menganalisis...
                      </>
                    ) : (
                      <>
                        <Target size={13} /> 🎯 Rekomendasikan Hook
                      </>
                    )}
                  </button>

                  {Boolean(selectedHookType) && (
                    <button
                      type="button"
                      className="copy-action-btn"
                      onClick={() => setIsHookCollapsed(true)}
                      title="Lipat panel Hook"
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    >
                      <ChevronUp size={13} />
                      <span>Susut</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Smart Recommendation Reason Card (if available) */}
              {hookRecommendation && (
                <div
                  style={{
                    background: 'rgba(79, 232, 255, 0.08)',
                    border: '1px solid rgba(79, 232, 255, 0.3)',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: '0.76rem',
                    color: '#e2edff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--cyan)', whiteSpace: 'nowrap' }}>
                    💡 Rekomendasi AI ({hookRecommendation.hookName}):
                  </span>
                  <span style={{ color: '#cbd5e1' }}>{hookRecommendation.reason}</span>
                </div>
              )}

              {/* 6 Formula Varian Hook Interactive Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 8,
                }}
              >
                {ZEINITY_HOOK_FORMULAS.map((formula) => {
                  const isSelected =
                    selectedHookType === formula.id ||
                    selectedHookType === formula.label ||
                    selectedHookType === formula.name;
                  return (
                    <div
                      key={formula.id}
                      onClick={() => onSelectHookType && onSelectHookType(formula.id)}
                      style={{
                        background: isSelected ? 'rgba(79, 232, 255, 0.12)' : '#07101e',
                        border: isSelected ? '1.5px solid var(--cyan)' : '1px solid #1a2a44',
                        borderRadius: 6,
                        padding: 10,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 0 12px rgba(79, 232, 255, 0.15)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isSelected ? '#f8fafc' : '#cbd5e1', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>{formula.name}</span>
                          {formula.isStarred && <span style={{ color: '#fbbf24' }}>⭐</span>}
                        </div>
                        {isSelected ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Check size={12} /> Dipilih
                          </span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: isSelected ? '#93c5fd' : '#7e92ad', lineHeight: 1.35, fontStyle: 'italic' }}>
                        {formula.pattern}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Catatan / Arahan Khusus Hook (Opsional) */}
              <div>
                <label
                  htmlFor="hookNotesInput"
                  style={{ fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: 4 }}
                >
                  Arahan Khusus Hook (Opsional):
                </label>
                <input
                  id="hookNotesInput"
                  type="text"
                  value={hookNotes || ''}
                  onChange={(e) => onHookNotesChange && onHookNotesChange(e.target.value)}
                  placeholder='Misal: "Fokuskan kontras pada paradoks waktu vs biaya..."'
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    background: '#070f1d',
                    border: '1px solid #1e3352',
                    borderRadius: 6,
                    color: '#f1f5f9',
                    fontSize: '0.78rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Tombol Generate Hook */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onGenerateHook && onGenerateHook(Boolean(hookDraft && hookDraft.trim()))}
                  disabled={generatingHook || !selectedHookType}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    opacity: !selectedHookType ? 0.6 : 1,
                  }}
                  title={!selectedHookType ? 'Pilih salah satu varian hook di atas terlebih dahulu' : 'Generate draf naskah pembuka 20-30 detik'}
                >
                  {generatingHook ? (
                    <>
                      <Loader2 size={14} className="spin" /> Menulis Draf Hook...
                    </>
                  ) : hookDraft && hookDraft.trim() ? (
                    <>
                      <RotateCw size={14} /> 🔄 Regenerate Hook
                    </>
                  ) : (
                    <>
                      ⚡ Generate Hook
                    </>
                  )}
                </button>
                {!selectedHookType && (
                  <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>
                    * Pilih salah satu formula hook di atas untuk men-generate
                  </span>
                )}
              </div>

              {/* Inline Preview Box */}
              {Boolean(hookDraft && hookDraft.trim()) && (
                <div
                  style={{
                    background: '#060c18',
                    border: '1px solid #1d3356',
                    borderRadius: 6,
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cyan)' }}>
                      Draf Narasi Pembuka (Babak 1):
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {hookDraftWords} kata • Est. durasi: ~{Math.round(hookDraftWords / 2.5)} detik (Ideal: 20–30s)
                    </div>
                  </div>

                  <textarea
                    value={hookDraft || ''}
                    onChange={(e) => onHookDraftChange && onHookDraftChange(e.target.value)}
                    placeholder="Draf teks hook akan muncul di sini..."
                    rows={4}
                    style={{
                      width: '100%',
                      background: '#091222',
                      border: '1px solid #203554',
                      color: '#e2edff',
                      padding: 8,
                      borderRadius: 6,
                      fontFamily: 'inherit',
                      fontSize: '0.8rem',
                      lineHeight: 1.5,
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => onCopy(hookDraft || '', 'hookDraftCopy')}
                      style={{ padding: '5px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      {copied === 'hookDraftCopy' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copied === 'hookDraftCopy' ? 'Tersalin' : '📋 Salin Hook'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => onGenerateHook && onGenerateHook(true)}
                      disabled={generatingHook || !selectedHookType}
                      style={{ padding: '5px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <RotateCw size={12} className={generatingHook ? 'spin' : ''} />
                      <span>🔄 Regenerate Hook</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        if (onApplyHookToOutline) onApplyHookToOutline();
                        setIsHookCollapsed(true);
                      }}
                      style={{
                        padding: '5px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'rgba(52, 211, 153, 0.2)',
                        borderColor: 'var(--green)',
                        color: 'var(--green)',
                      }}
                      title="Perbarui Babak 1 di dalam Textarea Kerangka tanpa merusak Babak 2-5"
                    >
                      📥 Terapkan ke Kerangka
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAHAP 2: SUSUN KERANGKA BERDASARKAN HOOK & RISET (ACTIVE STAGE FOCUS)     */}
          {/* ========================================================================= */}
          <div
            style={{
              background: '#0d182b',
              border: '1.5px solid #0284c7',
              borderRadius: 10,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxShadow: '0 4px 18px rgba(2, 132, 199, 0.12)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8' }} />
                <span>Tahap 2: Susun Kerangka Berdasarkan Hook & Riset</span>
              </div>
              <span
                className="collapsed-pill"
                style={{
                  background: outlineText.trim() ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                  color: outlineText.trim() ? '#34d399' : '#38bdf8',
                  borderColor: outlineText.trim() ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.4)',
                }}
              >
                {outlineText.trim() ? '● KERANGKA SIAP' : '● MENUNGGU SUSUN'}
              </span>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45 }}>
              AI menganalisis data riset aktual & menyusun 5 Babak Zeinity berpusat pada premis Hook{(() => {
                const activeForm = getHookFormulaById(selectedHookType);
                return activeForm ? ` (${activeForm.label})` : (selectedHookType ? ` (${selectedHookType})` : '');
              })()}.
            </div>

            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Target: ~{computedTargetWords.toLocaleString('id-ID')} Kata • 0 Token halusinasi • Mempertahankan fakta riset.
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onGenerateOutline(false)}
                disabled={generatingOutline || !selectedHookType}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  opacity: !selectedHookType ? 0.6 : 1,
                  cursor: !selectedHookType ? 'not-allowed' : 'pointer',
                  background: !selectedHookType ? '#1a293f' : undefined,
                  borderColor: !selectedHookType ? '#294368' : undefined,
                  color: !selectedHookType ? '#7e93af' : undefined,
                  transition: 'all 0.2s ease',
                }}
                title={
                  !selectedHookType
                    ? 'Pilih salah satu formula hook di Tahap 1 terlebih dahulu'
                    : 'Susun kerangka 5 babak berpusat pada premis hook terpilih'
                }
              >
                {generatingOutline ? (
                  <>
                    <RotateCw size={15} className="spin" /> Menyusun Outline...
                  </>
                ) : (
                  <>
                    ⚡ Generate Outline 5 Tahap
                  </>
                )}
              </button>

              {!selectedHookType && (
                <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  * Pilih salah satu formula hook di Tahap 1 terlebih dahulu
                </span>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAHAP 3: HUMAN APPROVAL GATE & ONE PRIMARY HERO CTA                       */}
          {/* ========================================================================= */}
          <div
            style={{
              background: '#091222',
              border: '1.2px solid #23395b',
              borderRadius: 10,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Tahap 3: Human Approval Gate (Kreator Meninjau Kerangka)</span>
              </div>
              <div>
                {isOutlineApproved ? (
                  <span className="collapsed-pill" style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--green)', borderColor: 'rgba(52, 211, 153, 0.4)' }}>
                    ✅ [Disetujui]
                  </span>
                ) : outlineText.trim() ? (
                  <span className="collapsed-pill" style={{ background: 'rgba(251, 191, 36, 0.15)', color: 'var(--amber)', borderColor: 'rgba(251, 191, 36, 0.4)' }}>
                    ⚠️ [Menunggu Review]
                  </span>
                ) : (
                  <span className="collapsed-pill" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', borderColor: 'rgba(148, 163, 184, 0.4)' }}>
                    ⚪ [Belum Dibuat]
                  </span>
                )}
              </div>
            </div>

            {/* Outline Textarea */}
            <textarea
              value={outlineText}
              onChange={(e) => onOutlineChange(e.target.value)}
              onBlur={onOutlineBlur}
              placeholder="Kerangka 5 Babak Zeinity akan muncul di sini setelah Anda mengklik 'Generate Outline 5 Tahap', atau Anda dapat mengetik/menempel kerangka secara manual..."
              style={{
                width: '100%',
                minHeight: 260,
                background: '#050a14',
                border: '1px solid #1a2c48',
                color: '#e2edff',
                padding: 12,
                borderRadius: 8,
                fontFamily: 'inherit',
                resize: 'vertical',
                lineHeight: 1.6,
                boxSizing: 'border-box',
                fontSize: '0.84rem',
              }}
            />

            {/* Catatan Revisi bar */}
            <div>
              <label htmlFor="revisionNoteInput" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>
                Catatan Revisi Regenerasi (Jika belum sesuai):
              </label>
              <input
                id="revisionNoteInput"
                type="text"
                value={revisionNoteInput}
                onChange={(e) => onRevisionNoteChange(e.target.value)}
                placeholder='Ketik catatan revisi: "Perbanyak data riset di babak II..."'
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  background: '#0b1424',
                  border: '1px solid #203554',
                  borderRadius: 6,
                  color: '#f1f5f9',
                  fontSize: '0.8rem',
                  fontStyle: 'italic',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Action Controls: Secondary Buttons + ONE PRIMARY HERO CTA */}
            <div className="outline-approval-bar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Secondary Ghost 1: Regenerate */}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onGenerateOutline(true)}
                disabled={generatingOutline || !outlineText.trim()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.8rem',
                  padding: '7px 12px',
                  background: '#0b1424',
                  border: '1px solid #1e3250',
                  color: '#94a3b8',
                }}
                title="Regenerasi kerangka berdasarkan catatan revisi di atas"
              >
                <RotateCw size={13} className={generatingOutline ? 'spin' : ''} />
                <span>{generatingOutline ? 'Memproses...' : '🔄 Regenerate Outline'}</span>
              </button>

              {/* Secondary Ghost 2: Undo */}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onUndoOutline}
                disabled={!canUndoOutline}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.8rem',
                  padding: '7px 12px',
                  background: '#0b1424',
                  border: '1px solid #1e3250',
                  color: canUndoOutline ? '#fcd34d' : '#64748b',
                }}
                title="Kembalikan kerangka sebelum regenerasi terakhir"
              >
                <RotateCcw size={13} />
                <span>↩️ Undo Terakhir</span>
              </button>

              {/* ONE PRIMARY HERO CTA: Setujui & Tulis Naskah Otomatis */}
              {(() => {
                const isHookSelected = Boolean(selectedHookType && selectedHookType.trim());
                const isOutlineReady = Boolean(outlineText.trim());
                const isDisabled = loading || generatingFullScript || !isOutlineReady || !isHookSelected;

                const tooltipTitle = !isHookSelected
                  ? 'Pilih salah satu jenis Hook di Tahap 1 terlebih dahulu'
                  : !isOutlineReady
                  ? 'Buat kerangka naskah di textarea terlebih dahulu'
                  : 'Setujui kerangka ini dan mulai tulis naskah narasi video';

                return (
                  <button
                    type="button"
                    className="hero-cta-btn"
                    onClick={onApproveAndGenerateScript}
                    disabled={isDisabled}
                    style={{
                      marginLeft: 'auto',
                    }}
                    title={tooltipTitle}
                  >
                    {generatingFullScript ? (
                      <>
                        <Loader2 size={16} className="spin" /> Menulis Naskah Utuh...
                      </>
                    ) : (
                      <>
                        <Check size={16} /> ✨ Setujui & Tulis Naskah Otomatis ➔
                      </>
                    )}
                  </button>
                );
              })()}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* DUKUNGAN PENULISAN MODULAR (PER-BEAT GENERATION CHIPS)                     */}
          {/* ========================================================================= */}
          {outlineText.trim() && (
            <div
              style={{
                background: '#08101d',
                border: '1px solid #182a44',
                borderRadius: 8,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={13} />
                  <span>Dukungan Penulisan Modular (Per-Babak):</span>
                </div>
                <span className="collapsed-pill" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--cyan)', fontSize: '0.75rem' }}>
                  Cegah Pacing Decay
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Kreator dapat men-generate atau merevisi babak tertentu secara mandiri tanpa merombak babak lain.
              </div>

              {/* Modular Beat Chips Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 6, marginTop: 4 }}>
                {SCRIPT_BEATS.map((beat) => {
                  const isGen = generatingBeatNumber === beat.beatNumber;
                  const isSelected = selectedBeatForRevision === beat.beatNumber;
                  const targetBeatWords = calculateBeatTargetWords(beat.beatNumber, computedTargetWords);
                  return (
                    <button
                      key={beat.beatNumber}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          handleTriggerBeatGen(beat.beatNumber);
                        } else {
                          setSelectedBeatForRevision(beat.beatNumber);
                        }
                      }}
                      disabled={isGen || generatingFullScript}
                      style={{
                        padding: '6px 8px',
                        background: isSelected ? 'rgba(56, 189, 248, 0.2)' : '#0b1626',
                        border: `1px solid ${isSelected ? 'var(--cyan)' : '#1a2e48'}`,
                        borderRadius: 6,
                        color: isSelected ? '#f8fafc' : '#cbd5e1',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        transition: 'all 0.15s ease',
                      }}
                      title={`${beat.name}: ${beat.description}`}
                    >
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{beat.shortName}</span>
                        {isGen && <Loader2 size={11} className="spin" />}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#7890af' }}>
                        ~{targetBeatWords} kata
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedBeatForRevision && (
                <div style={{ marginTop: 6, background: '#0e1a2f', padding: 8, borderRadius: 6, border: '1px solid #203554', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cyan)' }}>
                      Revisi/Generate Khusus: {SCRIPT_BEATS.find(b => b.beatNumber === selectedBeatForRevision)?.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedBeatForRevision(null)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Batal
                    </button>
                  </div>
                  <input
                    type="text"
                    value={beatRevisionNote}
                    onChange={(e) => setBeatRevisionNote(e.target.value)}
                    placeholder="Instruksi revisi khusus babak ini (opsional)..."
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      background: '#070d18',
                      border: '1px solid #253d61',
                      borderRadius: 4,
                      color: '#e2edff',
                      fontSize: '0.76rem',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleTriggerBeatGen(selectedBeatForRevision)}
                      disabled={generatingBeatNumber !== null}
                      style={{ padding: '5px 12px', fontSize: '0.76rem' }}
                    >
                      {generatingBeatNumber === selectedBeatForRevision ? 'Menulis Babak...' : `⚡ Tulis/Perbarui Babak ${selectedBeatForRevision}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* EXTERNAL TRACK */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Mode Selector: Mode 1-Pintu vs Mode 2-Langkah */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              background: '#091322',
              padding: 6,
              borderRadius: 8,
              border: '1px solid #1a2d4b',
            }}
          >
            <button
              type="button"
              onClick={() => onExternalSubModeChange('one_shot')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                border: 'none',
                background: externalSubMode === 'one_shot' ? 'var(--cyan)' : 'transparent',
                color: externalSubMode === 'one_shot' ? '#041624' : '#94a3b8',
                fontWeight: externalSubMode === 'one_shot' ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={14} /> Mode 1-Pintu (One-Shot Handoff)
            </button>
            <button
              type="button"
              onClick={() => onExternalSubModeChange('step_by_step')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                border: 'none',
                background: externalSubMode === 'step_by_step' ? 'var(--cyan)' : 'transparent',
                color: externalSubMode === 'step_by_step' ? '#041624' : '#94a3b8',
                fontWeight: externalSubMode === 'step_by_step' ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <FileText size={14} /> Mode 2-Langkah (Alur Bertahap)
            </button>
          </div>

          {externalSubMode === 'one_shot' ? (
            /* MODE 1-PINTU (ONE-SHOT HANDOFF) */
            <div
              style={{
                background: '#121f36',
                border: '1px solid #223b63',
                borderRadius: 8,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--cyan)' }}>
                    Scriptwriter Handoff Utuh (Siap Pakai untuk Claude / ChatGPT)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                    Satu prompt terpadu berisi kerangka riset spesifik dan seluruh panduan Spoken-First + TTS.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {(item.scriptwriter_brief_prompt || handoffPrompt) && (
                    <button
                      type="button"
                      className={`copy-action-btn ${copied === 'extHandoff' ? 'copied' : ''}`}
                      onClick={() => {
                        onCopy(formatPromptText(item.scriptwriter_brief_prompt || handoffPrompt), 'extHandoff');
                      }}
                    >
                      {copied === 'extHandoff' ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied === 'extHandoff' ? 'Tersalin' : 'Salin Handoff Utuh'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onGenerateHandoff}
                    disabled={loading || generatingHandoff}
                    style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Generate atau perbarui Scriptwriter Handoff dari riset"
                  >
                    <RotateCw size={13} className={generatingHandoff ? 'spin' : ''} />
                    <span>{generatingHandoff ? 'Memproses...' : (item.scriptwriter_brief_prompt || handoffPrompt) ? 'Perbarui Handoff' : 'Generate Handoff'}</span>
                  </button>
                </div>
              </div>

              {(item.scriptwriter_brief_prompt || handoffPrompt) ? (
                <div className="prompt-display-box" style={{ maxHeight: 360, overflowY: 'auto' }}>
                  <pre className="prompt-pre" style={{ fontSize: '0.76rem' }}>
                    {formatPromptText(item.scriptwriter_brief_prompt || handoffPrompt)}
                  </pre>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 16px', background: '#0a1322', borderRadius: 6, border: '1px dashed #203554' }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 10px 0' }}>
                    Scriptwriter Handoff belum di-generate untuk topik ini.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onGenerateHandoff}
                    disabled={loading || generatingHandoff}
                    style={{ fontSize: '0.82rem', padding: '7px 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {generatingHandoff ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
                    <span>Generate Scriptwriter Handoff Sekarang</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* MODE 2-LANGKAH (ALUR BERTAHAP) */
            <>
              {/* Tahap 1: Salin Prompt Outline */}
              <div
                style={{
                  background: '#121f36',
                  border: '1px solid #223b63',
                  borderRadius: 8,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--cyan)' }}>
                    Tahap 1: Salin Prompt Outline untuk ChatGPT / Claude
                  </div>
                  <button
                    type="button"
                    className={`copy-action-btn ${copied === 'extOutlinePrompt' ? 'copied' : ''}`}
                    onClick={() => {
                      const p = formatExternalOutlinePrompt(
                        item.title,
                        researchOutput,
                        item.category,
                        item.research_text,
                        angleNotes,
                        computedTargetWords,
                        targetDuration,
                        selectedHookType,
                        hookDraft
                      );
                      onCopy(p, 'extOutlinePrompt');
                    }}
                  >
                    {copied === 'extOutlinePrompt' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied === 'extOutlinePrompt' ? 'Tersalin' : 'Salin Prompt Outline'}</span>
                  </button>
                </div>
                <div className="prompt-display-box" style={{ maxHeight: 160, overflowY: 'auto' }}>
                  <pre className="prompt-pre" style={{ fontSize: '0.76rem' }}>
                    {formatExternalOutlinePrompt(
                      item.title,
                      researchOutput,
                      item.category,
                      item.research_text,
                      angleNotes,
                      computedTargetWords,
                      targetDuration,
                      selectedHookType,
                      hookDraft
                    )}
                  </pre>
                </div>
              </div>

              {/* Tahap 2: Tempel & Setujui Kerangka */}
              <div
                style={{
                  background: '#0a1322',
                  border: '1.2px solid #294572',
                  borderRadius: 8,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fbbf24' }}>
                    Tahap 2: Tempel &amp; Tinjau Kerangka dari AI Eksternal
                  </div>
                  <div>
                    {isOutlineApproved ? (
                      <span className="collapsed-pill" style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--green)', borderColor: 'rgba(52, 211, 153, 0.4)' }}>
                        ✅ [Disetujui]
                      </span>
                    ) : outlineText.trim() ? (
                      <span className="collapsed-pill" style={{ background: 'rgba(251, 191, 36, 0.15)', color: 'var(--amber)', borderColor: 'rgba(251, 191, 36, 0.4)' }}>
                        ⚠️ [Menunggu Review]
                      </span>
                    ) : (
                      <span className="collapsed-pill" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', borderColor: 'rgba(148, 163, 184, 0.4)' }}>
                        ⚪ [Tempel Kerangka]
                      </span>
                    )}
                  </div>
                </div>

                <textarea
                  value={outlineText}
                  onChange={(e) => onOutlineChange(e.target.value)}
                  onBlur={onOutlineBlur}
                  placeholder="Tempel kerangka 5 babak dari ChatGPT atau Claude di sini..."
                  style={{
                    width: '100%',
                    minHeight: 220,
                    background: '#070d18',
                    border: '1px solid #1d3050',
                    color: '#e2edff',
                    padding: 12,
                    borderRadius: 8,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    lineHeight: 1.6,
                    boxSizing: 'border-box',
                    fontSize: '0.84rem',
                  }}
                />

                <div className="outline-approval-bar" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onApproveExternalOutline}
                    disabled={!outlineText.trim()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      padding: '8px 16px',
                      background: 'var(--green)',
                      borderColor: 'var(--green)',
                      color: '#041a10',
                    }}
                  >
                    <Check size={16} /> ✅ Setujui Outline Eksternal
                  </button>
                </div>
              </div>

              {/* Tahap 3: Prompt Naskah Instan Siap Salin */}
              {isOutlineApproved && (
                <div
                  style={{
                    background: '#0d1b2a',
                    border: '1.2px solid rgba(52, 211, 153, 0.4)',
                    borderRadius: 8,
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--green)' }}>
                      Tahap 3: Prompt Naskah Instan Siap Salin (0 Token AI)
                    </div>
                    <button
                      type="button"
                      className={`copy-action-btn ${copied === 'extScriptPrompt' ? 'copied' : ''}`}
                      onClick={() => {
                        const p = formatExternalScriptingPrompt(
                          item.title,
                          outlineText,
                          researchOutput || item.external_research_output || '',
                          identityText,
                          computedTargetWords,
                          angleNotes,
                          selectedHookType,
                          hookDraft
                        );
                        onCopy(p, 'extScriptPrompt');
                      }}
                    >
                      {copied === 'extScriptPrompt' ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied === 'extScriptPrompt' ? 'Tersalin' : 'Salin Prompt Naskah Utuh'}</span>
                    </button>
                  </div>
                  <div className="prompt-display-box" style={{ maxHeight: 180, overflowY: 'auto' }}>
                    <pre className="prompt-pre" style={{ fontSize: '0.76rem' }}>
                      {formatExternalScriptingPrompt(
                        item.title,
                        outlineText,
                        researchOutput || item.external_research_output || '',
                        identityText,
                        computedTargetWords,
                        angleNotes,
                        selectedHookType,
                        hookDraft
                      )}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
};

export default OutlineWorkspace;
