import React from 'react';
import {
  FileText,
  Copy,
  Check,
  RotateCw,
  Image as ImageIcon,
  Download,
  X,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { formatStructuredPrompt } from '@/lib/gemini';

export interface ThumbnailTitleStudioProps {
  isOpen: boolean;
  onClose: () => void;
  thumbnailMode: 'prompt' | 'visual';
  onSelectThumbnailMode: (mode: 'prompt' | 'visual') => void;
  thumbnailPrompt: string;
  generatedThumbnailPrompt?: string | null;
  thumbnailAspectRatio: '16:9' | '1:1' | '9:16';
  onAspectRatioChange: (ratio: '16:9' | '1:1' | '9:16') => void;
  thumbnailProvider: 'imagen3' | 'dalle3' | 'flux';
  onProviderChange: (provider: 'imagen3' | 'dalle3' | 'flux') => void;
  thumbnailHookText: string;
  onHookTextChange: (text: string) => void;
  onExportMockupSvg: () => void;
  onGenerateThumbnail: (isRegenerate: boolean) => void;
  generatingThumbnail: boolean;
  loading: boolean;
  hasGeneratedThumbnail: boolean;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
  onPublish: () => Promise<void>;
  onProceedToThumbnailing?: () => void;
}

export const ThumbnailTitleStudio: React.FC<ThumbnailTitleStudioProps> = ({
  isOpen,
  onClose,
  thumbnailMode,
  onSelectThumbnailMode,
  thumbnailPrompt,
  generatedThumbnailPrompt,
  thumbnailAspectRatio,
  onAspectRatioChange,
  thumbnailProvider,
  onProviderChange,
  thumbnailHookText,
  onHookTextChange,
  onExportMockupSvg,
  onGenerateThumbnail,
  generatingThumbnail,
  loading,
  hasGeneratedThumbnail,
  copied,
  onCopy,
  onPublish,
  onProceedToThumbnailing,
}) => {
  if (!isOpen) return null;

  const formatPromptText = formatStructuredPrompt;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        id="studio-thumbnail-section"
        className="modal-container thumbnail-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 960,
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ImageIcon size={18} style={{ color: 'var(--cyan)' }} />
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.05rem', fontWeight: 700 }}>
                Studio Generate Thumbnail (Dual-Mode)
              </h3>
            </div>
            <span className="collapsed-pill" style={{ background: 'rgba(79, 232, 255, 0.12)', color: 'var(--cyan)', borderColor: 'rgba(79, 232, 255, 0.3)' }}>
              {thumbnailMode === 'prompt' ? 'Mode 1: Copywriting Prompt' : 'Mode 2: Visual Image AI'}
            </span>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            title="Tutup Modal"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: 20 }}>
          {/* Dual Mode Tab Selector */}
          <div className="thumbnail-tabs" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              type="button"
              className={`thumbnail-tab-btn ${thumbnailMode === 'prompt' ? 'active' : ''}`}
              onClick={() => onSelectThumbnailMode('prompt')}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 8,
                border: `1.5px solid ${thumbnailMode === 'prompt' ? 'var(--cyan)' : '#1e293b'}`,
                background: thumbnailMode === 'prompt' ? 'rgba(56, 189, 248, 0.15)' : '#0b1324',
                color: thumbnailMode === 'prompt' ? '#f8fafc' : '#94a3b8',
                fontWeight: thumbnailMode === 'prompt' ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: '0.88rem',
              }}
            >
              <FileText size={16} style={{ color: 'var(--cyan)' }} />
              <span>Opsi 1: Copywriting Prompt (Text AI)</span>
            </button>
            <button
              type="button"
              className={`thumbnail-tab-btn ${thumbnailMode === 'visual' ? 'active' : ''}`}
              onClick={() => onSelectThumbnailMode('visual')}
              style={{
                display: 'none',
                flex: 1,
                padding: '10px 14px',
                borderRadius: 8,
                border: `1.5px solid ${thumbnailMode === 'visual' ? 'var(--cyan)' : '#1e293b'}`,
                background: thumbnailMode === 'visual' ? 'rgba(56, 189, 248, 0.15)' : '#0b1324',
                color: thumbnailMode === 'visual' ? '#f8fafc' : '#94a3b8',
                fontWeight: thumbnailMode === 'visual' ? 700 : 500,
                cursor: 'pointer',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: '0.88rem',
              }}
            >
              <ImageIcon size={16} style={{ color: 'var(--cyan)' }} />
              <span>Opsi 2: Visual Image AI (Placeholder)</span>
            </button>
          </div>

          {/* Mode 1: Copywriting Prompt */}
          {thumbnailMode === 'prompt' && (
            <div>
              <div style={{ background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: '0.82rem', color: '#94a3b8' }}>
                <strong style={{ color: 'var(--cyan)' }}>Aturan Thumbnail Zeinity (Bab 13):</strong> Teks 2–4 kata UPPERCASE • Menghadirkan stakes emosional/konflik visual • Dilarang mengulang kata judul.
              </div>

              {thumbnailPrompt || generatedThumbnailPrompt ? (
                <>
                  <pre className="audit-pre" style={{ maxHeight: 380, overflowY: 'auto' }}>
                    {formatPromptText(thumbnailPrompt || generatedThumbnailPrompt)}
                  </pre>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`copy-action-btn ${copied === 'thumb_prompt' ? 'copied' : ''}`}
                      onClick={() => onCopy(formatPromptText(thumbnailPrompt || generatedThumbnailPrompt), 'thumb_prompt')}
                      title="Salin seluruh prompt thumbnail"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      {copied === 'thumb_prompt' ? <Check size={15} /> : <Copy size={15} />}
                      <span>{copied === 'thumb_prompt' ? 'Tersalin!' : 'Salin Thumbnail Prompt'}</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => onGenerateThumbnail(false)}
                      disabled={generatingThumbnail || loading}
                      style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <RotateCw size={14} className={generatingThumbnail ? 'spin' : ''} />
                      <span>{generatingThumbnail ? 'Meregenerasi...' : 'Generate Ulang Prompt'}</span>
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px 16px', background: '#07101f', borderRadius: 8, border: '1px dashed #1e293b' }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 14px 0' }}>
                    Thumbnail Prompt belum di-generate untuk naskah ini.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onGenerateThumbnail(false)}
                    disabled={generatingThumbnail || loading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px' }}
                  >
                    {generatingThumbnail ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                    <span>{generatingThumbnail ? 'Merumuskan Prompt...' : 'Generate Thumbnail Prompt ✨'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Visual Image AI Placeholder */}
          {thumbnailMode === 'visual' && (
            <div>
              {/* Visual Toolbar Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14, background: '#07101f', padding: '10px 14px', borderRadius: 8, border: '1px solid #1e293b' }}>
                {/* Aspect Ratio */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Rasio:</span>
                  {(['16:9', '1:1', '9:16'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => onAspectRatioChange(ratio)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        borderRadius: 6,
                        border: `1px solid ${thumbnailAspectRatio === ratio ? 'var(--cyan)' : '#334155'}`,
                        background: thumbnailAspectRatio === ratio ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                        color: thumbnailAspectRatio === ratio ? '#38bdf8' : '#cbd5e1',
                        cursor: 'pointer',
                        fontWeight: thumbnailAspectRatio === ratio ? 700 : 500,
                      }}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>

                {/* Provider Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Model Provider:</span>
                  <select
                    value={thumbnailProvider}
                    onChange={(e) => onProviderChange(e.target.value as 'imagen3' | 'dalle3' | 'flux')}
                    style={{
                      background: '#0b1324',
                      color: '#e2e8f0',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: '0.78rem',
                    }}
                  >
                    <option value="imagen3">Google Imagen 3 (Placeholder)</option>
                    <option value="dalle3">OpenAI DALL-E 3 (Placeholder)</option>
                    <option value="flux">Flux 1.1 Pro (Placeholder)</option>
                  </select>
                </div>

                {/* Export Button */}
                <div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onExportMockupSvg}
                    style={{ padding: '5px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Unduh mockup thumbnail format vektor SVG resolusi tinggi"
                  >
                    <Download size={13} />
                    <span>Unduh Mockup SVG</span>
                  </button>
                </div>
              </div>

              {/* Hook Text Customization Bar */}
              <div style={{ background: '#07101f', padding: '12px 14px', borderRadius: 8, border: '1px solid #1e293b', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <label htmlFor="thumbnail-hook-input" style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} /> Hook Teks Thumbnail (2–4 Kata Kapital, Kontras Tinggi):
                  </label>
                  {(() => {
                    const words = thumbnailHookText.trim().split(/\s+/).filter(Boolean);
                    const isOptimal = words.length >= 2 && words.length <= 4;
                    return (
                      <span
                        className="collapsed-pill"
                        style={{
                          background: isOptimal ? 'rgba(52, 211, 153, 0.15)' : 'rgba(249, 199, 79, 0.15)',
                          color: isOptimal ? 'var(--green)' : 'var(--amber)',
                          borderColor: isOptimal ? 'rgba(52, 211, 153, 0.3)' : 'rgba(249, 199, 79, 0.3)',
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                        }}
                      >
                        {words.length} kata • {isOptimal ? 'Aman Hook (2–4 Kata)' : 'Optimal: 2–4 Kata'}
                      </span>
                    );
                  })()}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input
                    id="thumbnail-hook-input"
                    type="text"
                    value={thumbnailHookText}
                    onChange={(e) => onHookTextChange(e.target.value)}
                    placeholder="Contoh: ILUSI DIBONGKAR"
                    style={{
                      flex: 1,
                      padding: '7px 12px',
                      fontSize: '0.85rem',
                      background: '#0b1324',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      color: '#f8fafc',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  />
                </div>

                {/* Quick Preset Chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Preset Cepat:</span>
                  {['ILUSI DIBONGKAR', 'FAKTA TERSEMBUNYI', 'JEBAKAN SISTEM', 'AKHIRNYA TERUNGKAP'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onHookTextChange(preset)}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 4,
                        border: thumbnailHookText.trim().toUpperCase() === preset ? '1px solid var(--cyan)' : '1px solid #334155',
                        background: thumbnailHookText.trim().toUpperCase() === preset ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                        color: thumbnailHookText.trim().toUpperCase() === preset ? '#38bdf8' : '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Canvas Preview Container */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                <div
                  style={{
                    width: '100%',
                    maxWidth: thumbnailAspectRatio === '16:9' ? 620 : thumbnailAspectRatio === '1:1' ? 420 : 320,
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
                  {/* Safe zone boundary guide */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: '10%',
                      border: '1px dashed rgba(56, 189, 248, 0.25)',
                      borderRadius: 8,
                      pointerEvents: 'none',
                      display: 'flex',
                      justifySelf: 'stretch',
                      justifyContent: 'flex-end',
                      alignItems: 'flex-start',
                      padding: 6,
                    }}
                  >
                    <span style={{ fontSize: '0.62rem', color: 'rgba(56, 189, 248, 0.5)', letterSpacing: '0.5px' }}>SAFE ZONE 80%</span>
                  </div>

                  {/* Canvas Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 4, color: 'var(--cyan)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                      {thumbnailAspectRatio} • {thumbnailProvider.toUpperCase()} PREVIEW
                    </span>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                      HIGH TENSION
                    </span>
                  </div>

                  {/* Center Focal Visual Area */}
                  <div style={{ textAlign: 'center', zIndex: 1, padding: '10px 0' }}>
                    <div style={{ width: 44, height: 44, margin: '0 auto 8px auto', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', border: '1.5px solid var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)' }}>
                      <ImageIcon size={22} />
                    </div>
                    {/* Bold UPPERCASE Hook Text (2-4 words) */}
                    <div
                      style={{
                        fontSize: thumbnailAspectRatio === '9:16' ? '1.1rem' : '1.35rem',
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
                    <span style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: 4, display: 'inline-block' }}>
                      (Maksimal 2–4 Kata Kapital Kontras Tinggi)
                    </span>
                  </div>

                  {/* Canvas Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4 }}>
                      Subjek Utama + Objek Kontras
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--amber)', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4 }}>
                      Zero Clutter
                    </span>
                  </div>
                </div>
              </div>

              {/* Integration notice */}
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #1e293b', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>
                <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>ℹ️ Placeholder Generasi Gambar Aktif:</span> Studio ini dirancang siap dihubungkan langsung ke API provider image generation ({thumbnailProvider === 'imagen3' ? 'Google Imagen 3' : thumbnailProvider === 'dalle3' ? 'OpenAI DALL-E 3' : 'Flux 1.1 Pro'}) pada pembaruan mendatang. Untuk saat ini, Anda dapat mengunduh berkas mockup SVG atau menyalin copywriting prompt di Opsi 1 untuk digunakan di Midjourney, Flux, atau image generator web lainnya.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Tutup
            </button>
            {hasGeneratedThumbnail && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onGenerateThumbnail(false)}
                disabled={loading || generatingThumbnail}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                title="Generate ulang Thumbnail"
              >
                <RotateCw size={14} className={generatingThumbnail ? 'spin' : ''} />
                <span>Generate Ulang Thumbnail</span>
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {onProceedToThumbnailing && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onProceedToThumbnailing}
                style={{ display: 'none' }}
              >
                Lanjut ke Thumbnailing
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                onClose();
                await onPublish();
              }}
              disabled={loading || generatingThumbnail}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', fontWeight: 600 }}
            >
              <span>Tandai Siap Publikasi / Publish ➔</span>
              <Check size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThumbnailTitleStudio;
