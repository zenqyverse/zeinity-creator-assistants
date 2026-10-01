import { useState, useEffect, useRef } from 'react';
import type { ContentItem, ContentStatus } from '@/types';
import { CONTENT_STATUSES } from '@/types';
import {
  ArrowLeft,
  Eye,
  ThumbsUp,
  MessageCircle,
  Calendar,
  Edit3,
  Check,
  Save,
  Undo2,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RotateCw,
  FileText,
  Loader2,
  Bot,
  FileDown,
  AlertTriangle,
} from 'lucide-react';
import {
  generateAlternativeTitles,
  resolveTargetModelForTask,
  isProviderConfigured,
  type ProviderConfig,
} from '@/lib/gemini';
import { useAlert, parseAIError } from '@/components/AlertModal';
import { useTerminal } from '@/components/Terminal';
import { formatDate } from '@/lib/date';

interface PublishedDetailProps {
  item: ContentItem;
  onBack: () => void;
  onUpdate?: (id: string, updates: Partial<ContentItem>) => Promise<ContentItem | null>;
  providerConfig?: ProviderConfig;
  onNavigateSettings?: () => void;
  onRevertToScript?: (item: ContentItem) => void;
}

export default function PublishedDetail({
  item,
  onBack,
  onUpdate,
  providerConfig,
  onNavigateSettings,
  onRevertToScript,
}: PublishedDetailProps) {
  const { showAlert, showError } = useAlert();
  const { startActivity, addLog, finishActivity, errorActivity } = useTerminal();

  const [isEditing, setIsEditing] = useState(false);
  const [viewsInput, setViewsInput] = useState(String(item.views ?? 0));
  const [likesInput, setLikesInput] = useState(String(item.likes ?? 0));
  const [commentsInput, setCommentsInput] = useState(String(item.comments ?? 0));
  const [platformInput, setPlatformInput] = useState(item.target_platform || 'YouTube');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Script & Titles continuity states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isScriptCollapsed, setIsScriptCollapsed] = useState(false);
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [titleA, setTitleA] = useState(item.generated_title_a || '');
  const [titleB, setTitleB] = useState(item.generated_title_b || '');

  const [scriptOutput, setScriptOutput] = useState(item.external_script_output || '');
  const scriptOutputRef = useRef(scriptOutput);
  scriptOutputRef.current = scriptOutput;
  const lastSavedScriptRef = useRef(item.external_script_output || '');
  const itemRef = useRef(item);
  itemRef.current = item;

  useEffect(() => {
    setScriptOutput(item.external_script_output || '');
    lastSavedScriptRef.current = item.external_script_output || '';
  }, [item.external_script_output]);

  useEffect(() => {
    if (scriptOutput === lastSavedScriptRef.current) return;
    const timer = setTimeout(async () => {
      const textToSave = scriptOutput;
      try {
        if (onUpdate) {
          await onUpdate(item.id, { external_script_output: textToSave });
        }
        lastSavedScriptRef.current = textToSave;
      } catch (err) {
        console.error('Failed to save script in PublishedDetail', err);
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [scriptOutput, item.id, onUpdate]);

  useEffect(() => {
    const flushPending = () => {
      if (scriptOutputRef.current !== lastSavedScriptRef.current && onUpdate) {
        onUpdate(itemRef.current.id, { external_script_output: scriptOutputRef.current });
        lastSavedScriptRef.current = scriptOutputRef.current;
      }
    };
    window.addEventListener('beforeunload', flushPending);
    return () => {
      window.removeEventListener('beforeunload', flushPending);
      flushPending();
    };
  }, [onUpdate]);

  useEffect(() => {
    setViewsInput(String(item.views ?? 0));
    setLikesInput(String(item.likes ?? 0));
    setCommentsInput(String(item.comments ?? 0));
    setPlatformInput(item.target_platform || 'YouTube');
  }, [item.views, item.likes, item.comments, item.target_platform]);

  useEffect(() => {
    setTitleA(item.generated_title_a || '');
    setTitleB(item.generated_title_b || '');
  }, [item.generated_title_a, item.generated_title_b]);

  // Real persistent metrics from item (defaulting to 0)
  const views = item.views ?? 0;
  const likes = item.likes ?? 0;
  const comments = item.comments ?? 0;
  const totalEngagement = likes + comments;
  const engagementRate = views > 0 ? ((totalEngagement / views) * 100).toFixed(1) : '0.0';
  const commentRate = views > 0 ? ((comments / views) * 100).toFixed(1) : '0.0';
  const publishDate = item.published_at || item.updated_at || item.created_at;

  const countWords = (text?: string | null) => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  };

  const copyText = async (text?: string | null, key?: string) => {
    if (!text || !key) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 2000);
    } catch (e) {
      console.error('Failed to copy text', e);
    }
  };

  const handleSaveMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdate) return;
    setIsSaving(true);
    try {
      const v = Math.max(0, parseInt(viewsInput, 10) || 0);
      const l = Math.max(0, parseInt(likesInput, 10) || 0);
      const c = Math.max(0, parseInt(commentsInput, 10) || 0);
      await onUpdate(item.id, {
        views: v,
        likes: l,
        comments: c,
        target_platform: platformInput.trim() || 'YouTube',
        updated_at: new Date().toISOString(),
      });
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: ContentStatus) => {
    if (newStatus === item.status || !onUpdate) return;
    showAlert({
      type: 'warning',
      title: 'Konfirmasi Perubahan Status',
      message: `Yakin ingin mengembalikan status ke ${newStatus}? Perubahan ini tidak dapat dibatalkan secara otomatis.`,
      confirmText: 'Ya, Kembalikan Status',
      cancelText: 'Batal',
      onConfirm: async () => {
        try {
          startActivity('Pipeline Status Log', `Mengubah status konten ke ${newStatus}...`);
          const res = await onUpdate(item.id, {
            status: newStatus,
          });
          finishActivity(`Status berhasil diubah menjadi ${newStatus}!`);
          if (newStatus !== 'Published') {
            const targetItem = res || { ...item, status: newStatus };
            if (onRevertToScript) {
              onRevertToScript(targetItem);
            }
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Gagal mengubah status konten.';
          errorActivity(`Gagal mengubah status: ${errMsg}`);
          showError('Gagal Mengubah Status', errMsg);
        }
      }
    });
  };

  const handleGenerateTitles = async () => {
    if (!providerConfig) return;
    if (!isProviderConfigured(providerConfig)) {
      showError(
        'Kunci API Belum Dikonfigurasi',
        `API Key untuk provider ${providerConfig.provider.toUpperCase()} belum diatur di menu Settings.`,
        {
          solution: 'Buka menu Settings dan masukkan API Key Anda, lalu klik Simpan.',
          actionButton: onNavigateSettings
            ? { label: 'Buka Settings', onClick: onNavigateSettings }
            : undefined,
        }
      );
      return;
    }

    const targetConfig = resolveTargetModelForTask('audit', providerConfig);
    const modelLabel = targetConfig.modelVersion || targetConfig.provider.toUpperCase();
    setGeneratingTitles(true);
    startActivity('AI Title Generator Log', `Menghubungkan ke ${modelLabel}...`);
    addLog('Menganalisis naskah video & topik konten...', 35);
    addLog('Merumuskan Mode A (Curiosity & Mobile 5–8 kata) & Mode B (SEO Keyword & Authority)...', 75);

    try {
      const res = await generateAlternativeTitles(
        targetConfig,
        item.title,
        item.category || 'Umum',
        item.external_script_output || item.research_text
      );

      setTitleA(res.titleA);
      setTitleB(res.titleB);

      if (onUpdate) {
        await onUpdate(item.id, {
          generated_title_a: res.titleA,
          generated_title_b: res.titleB,
        });
      }

      finishActivity('Judul alternatif Mode A & Mode B berhasil dibuat!');
    } catch (err: unknown) {
      const parsed = parseAIError(err);
      errorActivity(`Gagal membuat judul alternatif: ${parsed.title}`);
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        diagnostics: parsed.diagnostics,
        actionButton: onNavigateSettings
          ? { label: 'Buka Settings', onClick: onNavigateSettings }
          : undefined,
      });
    } finally {
      setGeneratingTitles(false);
    }
  };

  const handleApplyTitleAsMain = async (newTitle: string) => {
    if (!onUpdate || !newTitle.trim()) return;
    try {
      await onUpdate(item.id, { title: newTitle });
      showAlert({
        type: 'success',
        title: 'Judul Utama Diperbarui',
        message: `Judul konten berhasil diubah menjadi:\n"${newTitle}"`,
      });
    } catch (err: unknown) {
      const parsed = parseAIError(err);
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        diagnostics: parsed.diagnostics,
      });
    }
  };

  const finalScriptText = scriptOutput || item.external_script_output || '';
  const finalScriptWordCount = countWords(finalScriptText);
  const activeTitleA = titleA || item.generated_title_a || item.title;
  const activeTitleB = titleB || item.generated_title_b || '';

  const handleDownloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="main-content">
      {copiedKey && (
        <span aria-live="polite" role="status" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          Teks berhasil disalin ke clipboard
        </span>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft size={18} /> Kembali ke Pipeline
        </button>

        {onUpdate && !isEditing && (
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setIsEditing(true)}
          >
            <Edit3 size={16} /> Edit Metrik Performa
          </button>
        )}
      </div>

      <section className="hero">
        <div>
          <p className="eyebrow">Published Content</p>
          <h1>{item.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 6 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p className="subtitle" style={{ margin: 0 }}>
                Status: <span style={{ color: 'var(--green)', fontWeight: 600 }}>{item.status}</span>
              </p>
              {item.source === 'Telegram' ? (
                item.telegram_message_id ? (
                  <span
                    className="source-verified-bot"
                    title={`Verified Bot — Telegram (Bot): dikirim otomatis via Telegram Bot API${item.telegram_sender_username ? ` • @${item.telegram_sender_username}` : ''} • Msg ID: ${item.telegram_message_id}`}
                  >
                    <Bot size={11} /> Telegram (Bot)
                  </span>
                ) : (
                  <span
                    className="source source-telegram-manual"
                    title="Telegram (Manual) — Dicatat manual oleh user di web app"
                  >
                    Telegram (Manual)
                  </span>
                )
              ) : (
                <span className={`source ${item.source.toLowerCase()}`}>{item.source}</span>
              )}
            </div>
            {onUpdate && (
              <>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <label htmlFor="publishedStatusSelect" style={{ fontSize: '0.8rem', color: '#7890af' }}>
                    Koreksi Status:
                  </label>
                  <select
                    id="publishedStatusSelect"
                    className="status-selector-dropdown"
                    value={item.status}
                    onChange={(e) => handleStatusChange(e.target.value as ContentStatus)}
                    style={{
                      background: '#0d1526',
                      border: '1px solid #1a2942',
                      color: 'var(--cyan)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Pilih status untuk melompat atau mengoreksi alur pipeline"
                  >
                    {CONTENT_STATUSES.filter((st) => st !== 'Validating').map((st) => (
                      <option key={st} value={st} style={{ background: '#0d1526', color: '#e2edff' }}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn btn-secondary revert-stage-btn"
                  type="button"
                  onClick={() => handleStatusChange('Thumbnailing')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fcd34d', padding: '4px 12px', fontSize: '0.8rem' }}
                  title="Kembalikan status pipeline ke tahap Thumbnailing"
                >
                  <Undo2 size={14} /> Revert ke Thumbnailing
                </button>
              </>
            )}
          </div>
          <p className="subtitle" style={{ marginTop: 8 }}>
            {item.generated_title_a || item.title} — dipublikasi di {item.target_platform || 'YouTube'} · {formatDate(item.published_at || item.created_at, true)}
          </p>
        </div>
      </section>

      {saveSuccess && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(83, 242, 173, 0.12)',
          border: '1px solid var(--green)',
          borderRadius: 12,
          color: 'var(--green)',
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.88rem'
        }}>
          <Check size={18} /> Metrik performa berhasil disimpan dan diperbarui di LocalStorage!
        </div>
      )}

      {isEditing && (
        <section className="detail-card glass" style={{ marginBottom: 20, borderColor: 'var(--cyan)' }}>
          <form onSubmit={handleSaveMetrics}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: 'var(--cyan)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit3 size={18} /> Update Data Metrik Video
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Data disimpan permanen di LocalStorage</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div className="field">
                <label htmlFor="inputViews">Views (Tayangan)</label>
                <input
                  id="inputViews"
                  type="number"
                  min="0"
                  value={viewsInput}
                  onChange={(e) => setViewsInput(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="field">
                <label htmlFor="inputLikes">Likes (Suka)</label>
                <input
                  id="inputLikes"
                  type="number"
                  min="0"
                  value={likesInput}
                  onChange={(e) => setLikesInput(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="field">
                <label htmlFor="inputComments">Comments (Komentar)</label>
                <input
                  id="inputComments"
                  type="number"
                  min="0"
                  value={commentsInput}
                  onChange={(e) => setCommentsInput(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="field">
                <label htmlFor="inputPlatform">Target Platform</label>
                <input
                  id="inputPlatform"
                  type="text"
                  value={platformInput}
                  onChange={(e) => setPlatformInput(e.target.value)}
                  placeholder="YouTube"
                />
              </div>
            </div>

            {(parseInt(likesInput, 10) || 0) > (parseInt(viewsInput, 10) || 0) && (
              <div
                style={{
                  marginTop: 14,
                  padding: '9px 14px',
                  background: 'rgba(249, 199, 79, 0.12)',
                  border: '1px solid rgba(249, 199, 79, 0.35)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  color: 'var(--amber, #f9c74f)',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>Peringatan: Jumlah likes tidak lazim melebihi total views.</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setViewsInput(String(item.views ?? 0));
                  setLikesInput(String(item.likes ?? 0));
                  setCommentsInput(String(item.comments ?? 0));
                  setPlatformInput(item.target_platform || 'YouTube');
                  setIsEditing(false);
                }}
                disabled={isSaving}
              >
                Batal
              </button>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={isSaving}
              >
                <Save size={16} /> {isSaving ? 'Menyimpan…' : 'Simpan Metrik'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Real Metrics Cards */}
      <section className="metrics" style={{ marginBottom: 18 }}>
        <article className="metric-card glass" style={{ ['--metric' as string]: '#4fe8ff' }}>
          <div className="metric-top">
            <span>Views</span>
            <span className="metric-icon"><Eye size={16} /></span>
          </div>
          <div className="metric-value">{views.toLocaleString()}</div>
          <div className="metric-change">
            {views > 0 ? 'Total tayangan video' : 'Belum ada data tayangan'}
          </div>
        </article>
        <article className="metric-card glass" style={{ ['--metric' as string]: '#53f2ad' }}>
          <div className="metric-top">
            <span>Likes</span>
            <span className="metric-icon"><ThumbsUp size={16} /></span>
          </div>
          <div className="metric-value">{likes.toLocaleString()}</div>
          <div className="metric-change">{engagementRate}% rasio interaksi</div>
        </article>
        <article className="metric-card glass" style={{ ['--metric' as string]: '#f9c74f' }}>
          <div className="metric-top">
            <span>Komentar</span>
            <span className="metric-icon"><MessageCircle size={16} /></span>
          </div>
          <div className="metric-value">{comments.toLocaleString()}</div>
          <div className="metric-change">{commentRate}% rasio komentar</div>
        </article>
        <article className="metric-card glass" style={{ ['--metric' as string]: '#9985ff' }}>
          <div className="metric-top">
            <span>Tanggal Terbit</span>
            <span className="metric-icon"><Calendar size={16} /></span>
          </div>
          <div className="metric-value" style={{ fontSize: '1.3rem' }}>
            {formatDate(publishDate, true)}
          </div>
          <div className="metric-change">{item.target_platform || 'YouTube'}</div>
        </article>
      </section>

      {/* Generator Judul Alternatif (Mode A & Mode B) Sesuai Standar Komunitas YouTube */}
      <section className="detail-card glass" style={{ marginBottom: 18, borderColor: 'rgba(249, 199, 79, 0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--amber)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} /> Rekomendasi Judul YouTube (Mode A & Mode B)
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#9eb3cf' }}>
              Standar YouTube: Mode A (5–8 kata ramah layar mobile) & Mode B (High-intent SEO & Otoritas).
            </p>
          </div>
          {providerConfig && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleGenerateTitles}
              disabled={generatingTitles}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '6px 14px' }}
              title="Generate ulang alternatif judul Mode A & Mode B"
            >
              {generatingTitles ? (
                <>
                  <Loader2 size={14} className="spin" /> Membuat Judul...
                </>
              ) : (
                <>
                  <RotateCw size={14} /> Buat Ulang Judul A/B
                </>
              )}
            </button>
          )}
        </div>

        <div className="title-comparison">
          {/* Mode A */}
          <div className="title-card" style={{ borderColor: 'rgba(79, 232, 255, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className="mode-label" style={{ color: 'var(--cyan)' }}>
                MODE A — CURIOSITY / INTRIGUE
              </span>
              <span className="collapsed-pill" style={{ background: 'rgba(79, 232, 255, 0.1)', color: 'var(--cyan)' }}>
                {countWords(activeTitleA)} kata • 5–8 Kata Mobile
              </span>
            </div>
            <div className="title-text" style={{ minHeight: 46, color: '#edf6ff', marginBottom: 12 }}>
              {activeTitleA}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className={`copy-action-btn ${copiedKey === 'titleA' ? 'copied' : ''}`}
                onClick={() => copyText(activeTitleA, 'titleA')}
                title="Salin judul Mode A"
              >
                {copiedKey === 'titleA' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedKey === 'titleA' ? 'Tersalin' : 'Copy'}</span>
              </button>
              {onUpdate && activeTitleA !== item.title && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleApplyTitleAsMain(activeTitleA)}
                  style={{ padding: '3px 9px', fontSize: '0.76rem' }}
                  title="Terapkan sebagai judul utama"
                >
                  Gunakan sbg Judul Utama
                </button>
              )}
            </div>
          </div>

          {/* Mode B */}
          <div className="title-card" style={{ borderColor: 'rgba(153, 133, 255, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className="mode-label" style={{ color: 'var(--violet)' }}>
                MODE B — SEO KEYWORD & AUTHORITY
              </span>
              <span className="collapsed-pill" style={{ background: 'rgba(153, 133, 255, 0.1)', color: 'var(--violet)' }}>
                {countWords(activeTitleB)} kata • High Intent Search
              </span>
            </div>
            <div className="title-text" style={{ minHeight: 46, color: '#edf6ff', marginBottom: 12 }}>
              {activeTitleB || 'Belum di-generate'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {activeTitleB && (
                <>
                  <button
                    type="button"
                    className={`copy-action-btn ${copiedKey === 'titleB' ? 'copied' : ''}`}
                    onClick={() => copyText(activeTitleB, 'titleB')}
                    title="Salin judul Mode B"
                  >
                    {copiedKey === 'titleB' ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedKey === 'titleB' ? 'Tersalin' : 'Copy'}</span>
                  </button>
                  {onUpdate && activeTitleB !== item.title && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleApplyTitleAsMain(activeTitleB)}
                      style={{ padding: '3px 9px', fontSize: '0.76rem' }}
                      title="Terapkan sebagai judul utama"
                    >
                      Gunakan sbg Judul Utama
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Kontinuitas Naskah di Seluruh Tahapan: Kartu Naskah Final (Collapsible & Read-Only) */}
      <section
        className={`detail-card glass collapsible-section ${isScriptCollapsed ? 'collapsed' : ''}`}
        style={{ marginBottom: 18 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            paddingBottom: isScriptCollapsed ? 0 : 12,
            borderBottom: isScriptCollapsed ? 'none' : '1px solid #1a2942',
            flexWrap: 'wrap',
            gap: 8,
          }}
          onClick={() => setIsScriptCollapsed((prev) => !prev)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, color: 'var(--cyan)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} /> Naskah Video Final (Arsip & Review)
            </h3>
            <span className="collapsed-pill">
              {finalScriptWordCount.toLocaleString('id-ID')} kata • {finalScriptText.length.toLocaleString('id-ID')} karakter
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            {finalScriptText && (
              <>
                <button
                  type="button"
                  className={`copy-action-btn ${copiedKey === 'finalScript' ? 'copied' : ''}`}
                  onClick={() => copyText(finalScriptText, 'finalScript')}
                  title="Salin Naskah Video Final"
                >
                  {copiedKey === 'finalScript' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedKey === 'finalScript' ? 'Tersalin' : 'Copy Naskah'}</span>
                </button>
                <button
                  type="button"
                  className="copy-action-btn"
                  onClick={() => handleDownloadFile(finalScriptText, `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`, 'text/markdown')}
                  title="Ekspor sebagai Markdown"
                >
                  <FileDown size={14} />
                  <span>Ekspor .md</span>
                </button>
                <button
                  type="button"
                  className="copy-action-btn"
                  onClick={() => handleDownloadFile(finalScriptText, `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`, 'text/plain')}
                  title="Ekspor sebagai Teks"
                >
                  <FileDown size={14} />
                  <span>Ekspor .txt</span>
                </button>
              </>
            )}
            <button
              type="button"
              className="copy-action-btn"
              onClick={() => setIsScriptCollapsed((prev) => !prev)}
              title={isScriptCollapsed ? 'Buka Naskah' : 'Susutkan Naskah'}
            >
              {isScriptCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              <span>{isScriptCollapsed ? 'Buka' : 'Susut'}</span>
            </button>
          </div>
        </div>

        {!isScriptCollapsed && (
          <div style={{ marginTop: 14 }}>
            <textarea
              value={scriptOutput}
              onChange={(e) => setScriptOutput(e.target.value)}
              style={{
                width: '100%',
                minHeight: 220,
                background: '#0a101d',
                border: '1px solid #1a2942',
                color: '#c8d6ea',
                padding: 14,
                borderRadius: 10,
                fontSize: '0.88rem',
                lineHeight: 1.6,
                maxHeight: 400,
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
              placeholder="Belum ada naskah video yang disimpan untuk konten ini..."
            />
          </div>
        )}
      </section>

      {/* Thumbnail Prompt & Metadata */}
      <section className="detail-card glass">
        <div className="detail-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Thumbnail Prompt</h3>
            {item.generated_thumbnail_prompt && (
              <button
                type="button"
                className={`copy-action-btn ${copiedKey === 'thumbPrompt' ? 'copied' : ''}`}
                onClick={() => copyText(item.generated_thumbnail_prompt, 'thumbPrompt')}
                title="Salin Prompt Thumbnail"
              >
                {copiedKey === 'thumbPrompt' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedKey === 'thumbPrompt' ? 'Tersalin' : 'Copy'}</span>
              </button>
            )}
          </div>
          <div className="detail-content" style={{ fontFamily: '"Space Mono", monospace', fontWeight: 700, color: 'var(--cyan)' }}>
            {item.generated_thumbnail_prompt || '—'}
          </div>
        </div>
        <div className="detail-section" style={{ marginBottom: 0 }}>
          <h3>Category</h3>
          <div className="detail-content">{item.category || '—'}</div>
        </div>
      </section>
    </main>
  );
}
