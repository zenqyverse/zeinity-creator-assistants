import { useState, useEffect } from 'react';
import {
  Lightbulb,
  Clock,
  FileText,
  CheckCircle,
  Plus,
  Upload,
  Bot,
  Flame,
  ArrowRight,
  Zap,
  TrendingUp,
  Rss,
  Check,
} from 'lucide-react';
import type { ContentItem, ContentSource, GoogleTrendItem, ViewKey } from '@/types';
import { formatDate } from '@/lib/date';
import { fetchGoogleTrends } from '@/lib/trendsService';

interface OverviewProps {
  items: ContentItem[];
  onAddIdea: () => void;
  onImportFile: () => void;
  onNavigate: (view: ViewKey) => void;
  onViewScript?: (item: ContentItem) => void;
  onViewPublished?: (item: ContentItem) => void;
  onEditIdea?: (item: ContentItem) => void;
  onAddIdeaFromTrend?: (data: {
    title: string;
    source: ContentSource;
    category: string;
    research_text: string | null;
  }) => void;
}

export default function Overview({
  items,
  onAddIdea,
  onImportFile,
  onNavigate,
  onViewScript,
  onViewPublished,
  onEditIdea,
  onAddIdeaFromTrend,
}: OverviewProps) {
  const [topTrends, setTopTrends] = useState<GoogleTrendItem[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [addedTrendIds, setAddedTrendIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;
    setTrendsLoading(true);
    fetchGoogleTrends({ regionCode: 'ID' })
      .then((res) => {
        if (isMounted && res.items.length > 0) {
          setTopTrends(res.items.slice(0, 3));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setTrendsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleTitleClick = (item: ContentItem) => {
    if (item.status === 'Published') {
      if (onViewPublished) {
        onViewPublished(item);
      } else {
        onNavigate('published');
      }
    } else if (item.status === 'Researching' || item.status === 'Scripting' || item.status === 'Thumbnailing') {
      if (onViewScript) {
        onViewScript(item);
      } else {
        onNavigate('scripts');
      }
    } else {
      if (onEditIdea) {
        onEditIdea(item);
      } else {
        onNavigate('ideas');
      }
    }
  };

function detectPillarFromKeywords(text: string, fallbackPillar = 'Internet & Social Media Culture'): string {
  const lower = text.toLowerCase();
  if (
    lower.includes('ai') ||
    lower.includes('chatgpt') ||
    lower.includes('robot') ||
    lower.includes('teknologi') ||
    lower.includes('gadget') ||
    lower.includes('software') ||
    lower.includes('coding') ||
    lower.includes('chip') ||
    lower.includes('nvidia') ||
    lower.includes('apple') ||
    lower.includes('google')
  ) {
    return 'AI & Technology Impact';
  }
  if (
    lower.includes('game') ||
    lower.includes('gaming') ||
    lower.includes('playstation') ||
    lower.includes('xbox') ||
    lower.includes('nintendo') ||
    lower.includes('esport') ||
    lower.includes('steam') ||
    lower.includes('anime') ||
    lower.includes('film') ||
    lower.includes('bioskop') ||
    lower.includes('movie')
  ) {
    return 'Gaming & Digital Entertainment';
  }
  if (
    lower.includes('ekonomi') ||
    lower.includes('saham') ||
    lower.includes('crypto') ||
    lower.includes('bitcoin') ||
    lower.includes('bisnis') ||
    lower.includes('finansial') ||
    lower.includes('uang') ||
    lower.includes('cuan') ||
    lower.includes('investasi') ||
    lower.includes('creator') ||
    lower.includes('monetisasi')
  ) {
    return 'Digital Economy & Creator Economy';
  }
  if (
    lower.includes('mental') ||
    lower.includes('psikologi') ||
    lower.includes('kesehatan') ||
    lower.includes('kebiasaan') ||
    lower.includes('tidur') ||
    lower.includes('stress') ||
    lower.includes('gaya hidup') ||
    lower.includes('relasi') ||
    lower.includes('kerja') ||
    lower.includes('burnout')
  ) {
    return 'Modern Life & Digital Psychology';
  }
  return fallbackPillar;
}

  const handleAddTopTrend = (trend: GoogleTrendItem) => {
    const pillar = detectPillarFromKeywords(`${trend.title} ${trend.newsTitle || ''}`);
    if (onAddIdeaFromTrend) {
      onAddIdeaFromTrend({
        title: trend.title,
        source: 'Google Trends',
        category: pillar,
        research_text: `[Google Trends (ID)]\nVolume Pencarian: ${trend.approxTraffic}\nTrend URL: ${trend.trendUrl}${
          trend.newsTitle ? `\n\nBerita Pemicu:\n"${trend.newsTitle}" (${trend.newsSource || 'Media'})` : ''
        }`,
      });
    } else {
      onAddIdea();
    }
    setAddedTrendIds((prev) => new Set(prev).add(trend.id));
  };

  const now = new Date();
  const nowMs = now.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * oneDayMs;

  const total = items.length;
  const pending = items.filter((i) => i.status === 'Idea' || i.status === 'Validating').length;
  const production = items.filter((i) => i.status === 'Researching' || i.status === 'Scripting' || i.status === 'Thumbnailing').length;
  const published = items.filter((i) => i.status === 'Published').length;

  // Real date-windowed calculations
  const ideasThisWeek = items.filter((i) => {
    if (!i.created_at) return false;
    const t = new Date(i.created_at).getTime();
    return nowMs - t <= sevenDaysMs && nowMs - t >= 0;
  }).length;

  const ideasToday = items.filter((i) => {
    if (!i.created_at) return false;
    const t = new Date(i.created_at).getTime();
    return nowMs - t <= oneDayMs && nowMs - t >= 0;
  }).length;

  const scriptsInProduction = items.filter(
    (i) => i.status === 'Scripting' || i.status === 'Thumbnailing'
  ).length;

  const publishedThisMonth = items.filter((i) => {
    if (i.status !== 'Published') return false;
    const pubDate = i.published_at || i.updated_at || i.created_at;
    if (!pubDate) return false;
    const d = new Date(pubDate);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const recentItems = items.slice(0, 5);

  return (
    <main className="main-content">
      <section className="hero">
        <div>
          <p className="eyebrow">Operasi Konten Internal</p>
          <h1>Intelijen Konten</h1>
          <p className="subtitle">
            Kelola ide, validasi dengan AI, dan ubah menjadi konten siap produksi.
          </p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" type="button" onClick={onAddIdea}>
            <Plus size={18} /> Tambah Ide
          </button>
          <button className="btn btn-secondary" type="button" onClick={onImportFile}>
            <Upload size={18} /> Impor Berkas
          </button>
        </div>
      </section>

      <section className="metrics" aria-label="Ringkasan metrik">
        <article className="metric-card glass" style={{ ['--metric' as string]: '#4fe8ff' }}>
          <div className="metric-top">
            <span>Total Ide</span>
            <span className="metric-icon"><Lightbulb size={16} /></span>
          </div>
          <div className="metric-value">{total}</div>
          <div className="metric-change">+{ideasThisWeek} minggu ini</div>
        </article>
        <article className="metric-card glass" style={{ ['--metric' as string]: '#f9c74f' }}>
          <div className="metric-top">
            <span>Menunggu Validasi</span>
            <span className="metric-icon"><Clock size={16} /></span>
          </div>
          <div className="metric-value">{pending}</div>
          <div className="metric-change">{ideasToday} ide baru hari ini</div>
        </article>
        <article className="metric-card glass" style={{ ['--metric' as string]: '#53f2ad' }}>
          <div className="metric-top">
            <span>Dalam Produksi</span>
            <span className="metric-icon"><FileText size={16} /></span>
          </div>
          <div className="metric-value">{production}</div>
          <div className="metric-change">{scriptsInProduction} script dalam pengerjaan</div>
        </article>
        <article className="metric-card glass" style={{ ['--metric' as string]: '#9985ff' }}>
          <div className="metric-top">
            <span>Telah Terbit</span>
            <span className="metric-icon"><CheckCircle size={16} /></span>
          </div>
          <div className="metric-value">{published}</div>
          <div className="metric-change">+{publishedThisMonth} bulan ini</div>
        </article>
      </section>

      {/* Radar Sinyal Terhangat (Compact Trends Widget) */}
      <section
        className="pipeline-panel glass"
        style={{
          marginTop: 18,
          padding: '16px 20px',
          background: 'linear-gradient(180deg, rgba(13, 21, 38, 0.7) 0%, rgba(10, 16, 30, 0.85) 100%)',
          border: '1px solid rgba(79, 232, 255, 0.12)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ff5c5c',
                padding: '6px 8px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <Flame size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '0.98rem', margin: 0, color: '#f1f5f9', fontWeight: 700 }}>
                Radar Sinyal Terhangat
              </h2>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--muted)' }}>
                Topik pencarian teratas di Indonesia siap dijadikan ide konten seketika
              </p>
            </div>
          </div>
          <button
            className="small-btn"
            type="button"
            onClick={() => onNavigate('trends')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              color: 'var(--cyan)',
              borderColor: 'rgba(79, 232, 255, 0.3)',
              fontSize: '0.76rem',
              padding: '5px 12px',
            }}
          >
            Buka Radar Tren <ArrowRight size={13} />
          </button>
        </div>

        {trendsLoading && topTrends.length === 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 8,
                  height: 68,
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  animation: 'pulse 1.5s infinite',
                }}
              />
            ))}
          </div>
        ) : topTrends.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 12,
            }}
          >
            {topTrends.map((t, idx) => {
              const isAdded =
                addedTrendIds.has(t.id) ||
                items.some((i) => i.title.toLowerCase().trim() === t.title.toLowerCase().trim());
              return (
                <article
                  key={t.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '0.86rem',
                          color: '#e2edff',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={t.title}
                      >
                        {t.title}
                      </h4>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: '#fb923c',
                          fontWeight: 600,
                        }}
                      >
                        🔥 {t.approxTraffic}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={isAdded ? 'small-btn' : 'small-btn primary'}
                    onClick={() => handleAddTopTrend(t)}
                    disabled={isAdded}
                    style={{
                      fontSize: '0.72rem',
                      padding: '4px 8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      flexShrink: 0,
                      background: isAdded ? 'rgba(34, 197, 94, 0.15)' : undefined,
                      color: isAdded ? '#4ade80' : undefined,
                      borderColor: isAdded ? 'rgba(34, 197, 94, 0.35)' : undefined,
                    }}
                    title="Tambah topik ke pipeline ide"
                  >
                    {isAdded ? <Check size={12} /> : <Zap size={12} />}
                    {isAdded ? 'Masuk' : '+ Ide'}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              padding: '12px 14px',
              fontSize: '0.82rem',
              color: 'var(--muted)',
              textAlign: 'center',
            }}
          >
            Sinyal tren sedang diperbarui. Klik "Buka Radar Tren" untuk eksplorasi lebih lanjut.
          </div>
        )}
      </section>

      <section className="pipeline-panel glass" style={{ marginTop: 18 }}>
        <div className="table-head">
          <h2>Aktivitas Terbaru</h2>
          <button
            className="small-btn"
            type="button"
            onClick={() => onNavigate('ideas')}
          >
            Lihat Semua
          </button>
        </div>
        <div className="table-container table-scroll">
          <table>
            <thead>
              <tr>
                <th>Judul</th>
                <th>Sumber</th>
                <th>Status</th>
                <th>Dibuat</th>
              </tr>
            </thead>
            <tbody>
              {recentItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty-row">Belum ada ide. Klik "Tambah Ide" untuk memulai.</td>
                </tr>
              ) : (
                recentItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button
                        type="button"
                        className="cell-title cell-title-btn"
                        onClick={() => handleTitleClick(item)}
                        title={`Buka detail / workspace: ${item.title}`}
                        aria-label={`Buka detail ${item.title}`}
                      >
                        {item.title}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
                        ) : item.source === 'YouTube Trends' ? (
                          <span
                            className="source source-youtube-trends"
                            title="YouTube Trends"
                            style={{
                              color: '#ff6b6b',
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Flame size={11} /> YouTube Trends
                          </span>
                        ) : item.source === 'Google Trends' ? (
                          <span
                            className="source source-google-trends"
                            title="Google Trends"
                            style={{
                              color: '#38bdf8',
                              background: 'rgba(56, 189, 248, 0.12)',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <TrendingUp size={11} /> Google Trends
                          </span>
                        ) : item.source === 'RSS' ? (
                          <span
                            className="source source-rss"
                            title="RSS Reader"
                            style={{
                              color: '#fb923c',
                              background: 'rgba(249, 115, 22, 0.12)',
                              border: '1px solid rgba(249, 115, 22, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Rss size={11} /> RSS
                          </span>
                        ) : (
                          <span className={`source ${item.source.toLowerCase()}`}>{item.source}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${item.status.toLowerCase()}`}>{item.status}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: '#a6b7cf', fontSize: '.76rem' }}>
                      {formatDate(item.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
