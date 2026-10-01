import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  RotateCw,
  RotateCcw,
  Sparkles,
  Loader2,
} from 'lucide-react';
import type { ContentItem, ScriptBeatNumber } from '@/types';
import {
  formatStructuredPrompt,
  formatExternalOutlinePrompt,
  formatExternalScriptingPrompt,
  SCRIPT_BEATS,
  calculateBeatTargetWords,
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
}) => {
  const formatPromptText = formatStructuredPrompt;
  const [selectedBeatForRevision, setSelectedBeatForRevision] = useState<ScriptBeatNumber | null>(null);
  const [beatRevisionNote, setBeatRevisionNote] = useState<string>('');

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
        <h3 style={{ margin: 0, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} /> PANEL KIRI: PIPELINE KERANGKA (OUTLINE STUDIO)
        </h3>
        <span className="collapsed-pill" style={{ background: 'rgba(79, 232, 255, 0.12)', color: 'var(--cyan)' }}>
          Lebar Penuh (Stretch)
        </span>
      </div>

      {productionTrack === 'in_app' ? (
        /* IN-APP TRACK */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tahap 1: Outline Generator Header */}
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
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--cyan)' }}>
              Tahap 1: Susun Kerangka Berdasarkan Riset + Konteks Ide
            </div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4 }}>
              AI menganalisis data riset aktual &amp; memasukkan angle spesifik ke 5 Babak Zeinity.
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Target: ~{computedTargetWords.toLocaleString('id-ID')} Kata • 0 Token halusinasi • Mempertahankan fakta riset.
            </div>
            <div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onGenerateOutline(false)}
                disabled={generatingOutline}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                }}
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
            </div>
          </div>

          {/* Tahap 2: Human Approval Gate */}
          <div
            style={{
              background: '#0a1322',
              border: '1.2px solid #294572',
              borderRadius: 8,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Tahap 2: Human Approval Gate (Kreator Meninjau Kerangka)</span>
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
                minHeight: 280,
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

            {/* Catatan Revisi bar */}
            <div>
              <label htmlFor="revisionNoteInput" style={{ fontSize: '0.74rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>
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
                  background: '#0e1728',
                  border: '1px solid #253a5e',
                  borderRadius: 6,
                  color: '#f1f5f9',
                  fontSize: '0.8rem',
                  fontStyle: 'italic',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Action Controls */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onGenerateOutline(true)}
                disabled={generatingOutline || !outlineText.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '8px 12px' }}
                title="Regenerasi kerangka berdasarkan catatan revisi di atas"
              >
                <RotateCw size={14} className={generatingOutline ? 'spin' : ''} />
                <span>{generatingOutline ? 'Memproses...' : '🔄 Regenerate Outline'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={onUndoOutline}
                disabled={!canUndoOutline}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '8px 12px', color: canUndoOutline ? '#fcd34d' : undefined }}
                title="Kembalikan kerangka sebelum regenerasi terakhir"
              >
                <RotateCcw size={14} />
                <span>↩️ Undo Terakhir</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={onApproveAndGenerateScript}
                disabled={generatingFullScript || !outlineText.trim()}
                style={{
                  marginLeft: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  padding: '9px 16px',
                  background: 'var(--green)',
                  borderColor: 'var(--green)',
                  color: '#041a10',
                }}
                title="Setujui kerangka ini dan mulai tulis naskah narasi video"
              >
                {generatingFullScript ? (
                  <>
                    <Loader2 size={15} className="spin" /> Menulis Naskah Utuh...
                  </>
                ) : (
                  <>
                    <Check size={16} /> ✅ Setujui & Tulis Naskah
                  </>
                )}
              </button>
            </div>
          </div>

          {/* NEW: Per-Beat Quick Action Section */}
          {outlineText.trim() && (
            <div
              style={{
                background: '#091222',
                border: '1px solid #1a2f4e',
                borderRadius: 8,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} />
                  <span>Dukungan Penulisan Per-Babak (Per-Beat Generation):</span>
                </div>
                <span className="collapsed-pill" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--cyan)', fontSize: '0.7rem' }}>
                  Cegah Pacing Decay
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                Kreator dapat men-generate atau merevisi babak tertentu secara mandiri tanpa merombak babak lain.
              </div>

              {/* Beat Buttons Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6, marginTop: 4 }}>
                {SCRIPT_BEATS.map((beat) => {
                  const isGen = generatingBeatNumber === beat.beatNumber;
                  const targetBeatWords = calculateBeatTargetWords(beat.beatNumber, computedTargetWords);
                  return (
                    <button
                      key={beat.beatNumber}
                      type="button"
                      onClick={() => {
                        if (selectedBeatForRevision === beat.beatNumber) {
                          handleTriggerBeatGen(beat.beatNumber);
                        } else {
                          setSelectedBeatForRevision(beat.beatNumber);
                        }
                      }}
                      disabled={isGen || generatingFullScript}
                      style={{
                        padding: '6px 8px',
                        background: selectedBeatForRevision === beat.beatNumber ? 'rgba(56, 189, 248, 0.2)' : '#0d182b',
                        border: `1px solid ${selectedBeatForRevision === beat.beatNumber ? 'var(--cyan)' : '#1e3352'}`,
                        borderRadius: 6,
                        color: selectedBeatForRevision === beat.beatNumber ? '#f8fafc' : '#cbd5e1',
                        fontSize: '0.72rem',
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
                      <div style={{ fontSize: '0.66rem', color: '#7890af' }}>
                        ~{targetBeatWords} kata
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedBeatForRevision && (
                <div style={{ marginTop: 6, background: '#0e1a2f', padding: 8, borderRadius: 6, border: '1px solid #203554', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--cyan)' }}>
                      Revisi/Generate Khusus: {SCRIPT_BEATS.find(b => b.beatNumber === selectedBeatForRevision)?.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedBeatForRevision(null)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer' }}
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
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 2 }}>
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
                        targetDuration
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
                      targetDuration
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

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
                          angleNotes
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
                        angleNotes
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
