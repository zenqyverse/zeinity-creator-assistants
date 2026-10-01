import React from 'react';
import { Undo2 } from 'lucide-react';
import { calculateTargetWords } from '@/lib/gemini';

export interface ScriptPreflightBarProps {
  productionTrack: 'in_app' | 'external';
  onSelectTrack: (track: 'in_app' | 'external') => void;
  targetDuration: string;
  onDurationChange: (duration: string) => void;
  computedTargetWords: number;
  customMode: 'words' | 'minutes';
  onCustomModeChange: (mode: 'words' | 'minutes') => void;
  customWordsInput: number;
  onCustomWordsChange: (words: number) => void;
  customMinutesInput: number;
  onCustomMinutesChange: (minutes: number) => void;
  onCustomBlur?: () => void;
  itemTitle: string;
  itemCategory?: string | null;
  hasResearchText?: boolean;
  angleNotes: string;
  onAngleNotesChange: (notes: string) => void;
  onAngleNotesBlur: () => void;
  onRevertToResearching: () => void;
  loading?: boolean;
}

export const ScriptPreflightBar: React.FC<ScriptPreflightBarProps> = ({
  productionTrack,
  onSelectTrack,
  targetDuration,
  onDurationChange,
  computedTargetWords,
  customMode,
  onCustomModeChange,
  customWordsInput,
  onCustomWordsChange,
  customMinutesInput,
  onCustomMinutesChange,
  onCustomBlur,
  itemTitle,
  itemCategory,
  hasResearchText,
  angleNotes,
  onAngleNotesChange,
  onAngleNotesBlur,
  onRevertToResearching,
  loading = false,
}) => {
  return (
    <div
      className="preflight-config-container"
      style={{
        background: '#0c1526',
        border: '1px solid #1d304f',
        borderRadius: 14,
        padding: '16px 20px',
        marginBottom: 20,
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Title Bar */}
      <div
        style={{
          background: '#111d33',
          borderRadius: 6,
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.3px' }}>
            1. PRE-FLIGHT CONFIGURATION: PILIH JALUR, TARGET DURASI/KATA, &amp; SINKRONISASI KONTEKS IDE
          </span>
        </div>
        <button
          className="btn btn-secondary revert-stage-btn"
          type="button"
          onClick={onRevertToResearching}
          disabled={loading}
          style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fcd34d', padding: '4px 10px', fontSize: '0.78rem' }}
          title="Kembalikan status pipeline ke tahap Riset (Researching)"
        >
          <Undo2 size={14} /> Revert ke Researching
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {/* Col A: Mode Switcher */}
        <div
          style={{
            background: '#101c30',
            border: '1px solid #1d3356',
            borderRadius: 10,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8' }}>
            A. PILIH SATU JALUR PRODUKSI (BISA DI-RESET):
          </div>

          {/* Option 1: In-App AI */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectTrack('in_app')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelectTrack('in_app');
            }}
            style={{
              background: productionTrack === 'in_app' ? 'rgba(56, 189, 248, 0.16)' : '#0a1220',
              border: `1.5px solid ${productionTrack === 'in_app' ? 'var(--cyan)' : '#1b2a42'}`,
              borderRadius: 8,
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: productionTrack === 'in_app' ? '0 0 12px rgba(56, 189, 248, 0.25)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: productionTrack === 'in_app' ? 'var(--cyan)' : 'transparent',
                border: `1.5px solid ${productionTrack === 'in_app' ? 'var(--cyan)' : '#94a3b8'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0b1322',
                fontSize: '0.68rem',
                fontWeight: 900,
              }}
            >
              {productionTrack === 'in_app' ? '✓' : ''}
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: productionTrack === 'in_app' ? '#f8fafc' : '#94a3b8' }}>
                ⚡ In-App AI Scriptwriter {productionTrack === 'in_app' && '(Aktif)'}
              </div>
              <div style={{ fontSize: '0.72rem', color: productionTrack === 'in_app' ? 'var(--cyan)' : '#7890af' }}>
                Otomatis penuh di web app: Outline ➔ Naskah Jadi
              </div>
            </div>
          </div>

          {/* Option 2: AI Eksternal */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectTrack('external')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelectTrack('external');
            }}
            style={{
              background: productionTrack === 'external' ? 'rgba(56, 189, 248, 0.16)' : '#0a1220',
              border: `1.5px solid ${productionTrack === 'external' ? 'var(--cyan)' : '#1b2a42'}`,
              borderRadius: 8,
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: productionTrack === 'external' ? '0 0 12px rgba(56, 189, 248, 0.25)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: productionTrack === 'external' ? 'var(--cyan)' : 'transparent',
                border: `1.5px solid ${productionTrack === 'external' ? 'var(--cyan)' : '#94a3b8'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0b1322',
                fontSize: '0.68rem',
                fontWeight: 900,
              }}
            >
              {productionTrack === 'external' ? '✓' : ''}
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: productionTrack === 'external' ? '#f8fafc' : '#94a3b8' }}>
                📋 AI Eksternal (ChatGPT / Claude) {productionTrack === 'external' && '(Aktif)'}
              </div>
              <div style={{ fontSize: '0.72rem', color: productionTrack === 'external' ? 'var(--cyan)' : '#7890af' }}>
                Prompt Outline ➔ Prompt Naskah Instan (0 Token AI)
              </div>
            </div>
          </div>
        </div>

        {/* Col B: Target Duration & Custom Sub-panel */}
        <div
          style={{
            background: '#101c30',
            border: '1px solid #1d3356',
            borderRadius: 10,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8' }}>
              B. TARGET DURASI &amp; AKSI AKSESIBILITAS KATA:
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--green)' }}>
              ~{computedTargetWords.toLocaleString('id-ID')} kata
            </span>
          </div>

          {/* Preset Pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { key: '60s', label: '60s' },
              { key: '1-3m', label: '1–3m' },
              { key: '5-8m', label: '5–8m (Default)' },
              { key: '8-12m', label: '8–12m' },
              { key: 'custom', label: 'Custom' },
            ].map((p) => {
              const isActive = targetDuration === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => onDurationChange(p.key)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: isActive ? 700 : 500,
                    background: isActive
                      ? p.key === 'custom'
                        ? 'rgba(56, 189, 248, 0.2)'
                        : 'rgba(52, 211, 153, 0.18)'
                      : '#162640',
                    border: `1px solid ${isActive ? (p.key === 'custom' ? 'var(--cyan)' : 'var(--green)') : '#253c61'}`,
                    color: isActive ? (p.key === 'custom' ? 'var(--cyan)' : 'var(--green)') : '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Custom Sub-panel */}
          {targetDuration === 'custom' && (
            <div
              style={{
                background: '#080f1c',
                border: '1px solid #23395d',
                borderRadius: 8,
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1' }}>
                Pilih Parameter Input Custom:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {/* Custom Option 1: Target Kata */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onCustomModeChange('words')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onCustomModeChange('words');
                  }}
                  style={{
                    background: customMode === 'words' ? 'rgba(52, 211, 153, 0.12)' : '#101929',
                    border: `1px solid ${customMode === 'words' ? 'var(--green)' : '#1d2e47'}`,
                    borderRadius: 6,
                    padding: '6px 8px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: customMode === 'words' ? 'var(--green)' : 'transparent',
                        border: `1.5px solid ${customMode === 'words' ? 'var(--green)' : '#94a3b8'}`,
                      }}
                    />
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#f8fafc' }}>
                      Target Kata (Disarankan)
                    </span>
                  </div>
                  <input
                    type="number"
                    min={100}
                    max={10000}
                    step={50}
                    value={customWordsInput}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      onCustomWordsChange(val);
                    }}
                    onBlur={onCustomBlur}
                    disabled={customMode !== 'words'}
                    style={{
                      width: '100%',
                      marginTop: 6,
                      padding: '4px 8px',
                      background: '#0a101d',
                      border: '1px solid #1a2942',
                      borderRadius: 4,
                      color: '#e2edff',
                      fontSize: '0.78rem',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Misal: 1400 kata"
                  />
                </div>

                {/* Custom Option 2: Ketik Durasi Menit */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onCustomModeChange('minutes')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onCustomModeChange('minutes');
                  }}
                  style={{
                    background: customMode === 'minutes' ? 'rgba(52, 211, 153, 0.12)' : '#101929',
                    border: `1px solid ${customMode === 'minutes' ? 'var(--green)' : '#1d2e47'}`,
                    borderRadius: 6,
                    padding: '6px 8px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: customMode === 'minutes' ? 'var(--green)' : 'transparent',
                        border: `1.5px solid ${customMode === 'minutes' ? 'var(--green)' : '#94a3b8'}`,
                      }}
                    />
                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: customMode === 'minutes' ? '#f8fafc' : '#94a3b8' }}>
                      Ketik Durasi Menit
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    step={1}
                    value={customMinutesInput}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1;
                      onCustomMinutesChange(val);
                    }}
                    onBlur={onCustomBlur}
                    disabled={customMode !== 'minutes'}
                    style={{
                      width: '100%',
                      marginTop: 6,
                      padding: '4px 8px',
                      background: '#0a101d',
                      border: '1px solid #1a2942',
                      borderRadius: 4,
                      color: '#e2edff',
                      fontSize: '0.78rem',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Misal: 9 menit"
                  />
                  <div style={{ fontSize: '0.68rem', color: '#7890af', marginTop: 4 }}>
                    Auto: {customMinutesInput}m ≈ {calculateTargetWords('custom', 'minutes', customMinutesInput).toLocaleString('id-ID')} kata
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Col C: Idea Context & Extra Angle Binding */}
        <div
          style={{
            background: '#101c30',
            border: '1px solid #1d3356',
            borderRadius: 10,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8' }}>
            C. KONTEKS IDE &amp; INFO TAMBAHAN KARTU IDE:
          </div>

          <div
            style={{
              background: '#080e1a',
              border: '1px solid #1b2a40',
              borderRadius: 6,
              padding: '8px 10px',
              fontSize: '0.76rem',
              color: '#cbd5e1',
            }}
          >
            <div style={{ color: 'var(--cyan)', fontWeight: 700, marginBottom: 2 }}>
              ✓ Terhubung ke Kartu Ide Tabel:
            </div>
            <div style={{ fontWeight: 600, color: '#f1f5f9' }}>
              "{itemTitle}"
            </div>
            <div style={{ fontSize: '0.7rem', color: '#7890af', marginTop: 2 }}>
              Pilar: {itemCategory || 'Umum'} {hasResearchText ? '• Catatan Ide tersinkronisasi' : ''}
            </div>
          </div>

          <div>
            <label htmlFor="angleNotesInput" style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
              Angle Tambahan / Fokus Khusus (Opsional):
            </label>
            <input
              id="angleNotesInput"
              type="text"
              value={angleNotes}
              onChange={(e) => onAngleNotesChange(e.target.value)}
              onBlur={onAngleNotesBlur}
              placeholder='Contoh: "Tekankan sisi dopamin loop dari notifikasi merah"'
              style={{
                width: '100%',
                padding: '6px 10px',
                background: '#080e1a',
                border: '1px solid #253856',
                borderRadius: 6,
                color: '#f1f5f9',
                fontSize: '0.78rem',
                fontStyle: 'italic',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: '0.68rem', color: '#7890af', marginTop: 3 }}>
              AI wajib memasukkan angle ini ke Outline &amp; Script
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptPreflightBar;
