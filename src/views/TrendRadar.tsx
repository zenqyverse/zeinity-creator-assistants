import { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Zap,
  Key,
  Globe,
  Loader2,
  Check,
  AlertCircle,
  Eye,
  Calendar,
} from 'lucide-react';
import type { ContentSource, GoogleTrendItem, YouTubeTrendItem } from '@/types';
import {
  fetchYouTubeTrends,
  fetchGoogleTrends,
  TREND_REGIONS,
  YOUTUBE_CATEGORIES,
  setYouTubeApiKey,
  type YouTubeTrendError,
} from '@/lib/trendsService';

interface TrendRadarProps {
  onAddIdea?: (data: {
    title: string;
    source: ContentSource;
    category: string;
    research_text: string | null;
  }) => void;
  onAddIdeaFromTrend?: (data: {
    title: string;
    source: ContentSource;
    category: string;
    research_text: string | null;
  }) => void;
  onNavigateSettings?: () => void;
  existingTitles?: Set<string>;
}

type SubTab = 'youtube' | 'google';

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(0)}K`;
  }
  return num.toLocaleString('id-ID');
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} hari lalu`;
}

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

export default function TrendRadar({
  onAddIdea,
  onAddIdeaFromTrend,
  onNavigateSettings,
  existingTitles,
}: TrendRadarProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('youtube');
  const [selectedRegion, setSelectedRegion] = useState<string>('ID');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const triggerAddIdea = useCallback(
    (data: {
      title: string;
      source: ContentSource;
      category: string;
      research_text: string | null;
    }) => {
      if (onAddIdeaFromTrend) {
        onAddIdeaFromTrend(data);
      } else if (onAddIdea) {
        onAddIdea(data);
      }
    },
    [onAddIdeaFromTrend, onAddIdea]
  );

  // YouTube state
  const [ytItems, setYtItems] = useState<YouTubeTrendItem[]>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState<YouTubeTrendError | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);

  // Google Trends state
  const [gtItems, setGtItems] = useState<GoogleTrendItem[]>([]);
  const [gtLoading, setGtLoading] = useState(false);
  const [gtError, setGtError] = useState<string | null>(null);

  // Track added items for visual feedback
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Load YouTube Trends
  const loadYouTube = useCallback(async (force = false) => {
    setYtLoading(true);
    setYtError(null);
    try {
      const res = await fetchYouTubeTrends({
        regionCode: selectedRegion,
        categoryId: selectedCategory,
        forceRefresh: force,
      });
      if (res.error) {
        setYtError(res.error);
        setYtItems([]);
      } else {
        setYtItems(res.items);
      }
    } catch (err) {
      setYtError({
        code: 'NETWORK_ERROR',
        message: 'Gagal memuat tren YouTube.',
        details: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setYtLoading(false);
    }
  }, [selectedRegion, selectedCategory]);

  // Load Google Trends
  const loadGoogle = useCallback(async (force = false) => {
    setGtLoading(true);
    setGtError(null);
    try {
      const res = await fetchGoogleTrends({
        regionCode: selectedRegion,
        forceRefresh: force,
      });
      if (res.error) {
        setGtError(res.error);
        setGtItems([]);
      } else {
        setGtItems(res.items);
      }
    } catch (err) {
      setGtError(err instanceof Error ? err.message : 'Gagal memuat tren Google.');
    } finally {
      setGtLoading(false);
    }
  }, [selectedRegion]);

  useEffect(() => {
    if (activeSubTab === 'youtube') {
      loadYouTube(false);
    } else {
      loadGoogle(false);
    }
  }, [activeSubTab, loadYouTube, loadGoogle]);

  const handleRefresh = () => {
    if (activeSubTab === 'youtube') {
      loadYouTube(true);
    } else {
      loadGoogle(true);
    }
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    setYouTubeApiKey(apiKeyInput.trim());
    setApiKeySaved(true);
    setTimeout(() => {
      setApiKeySaved(false);
      loadYouTube(true);
    }, 1000);
  };

  const handleAddYouTubeIdea = (item: YouTubeTrendItem) => {
    // Determine appropriate pillar
    let pillar = 'Internet & Social Media Culture';
    if (selectedCategory === '28') {
      pillar = 'AI & Technology Impact';
    } else if (selectedCategory === '20') {
      pillar = 'Gaming & Digital Entertainment';
    } else if (selectedCategory === '24') {
      pillar = 'Modern Life & Digital Psychology';
    } else if (selectedCategory === '27') {
      pillar = 'Modern Life & Digital Psychology';
    } else {
      pillar = detectPillarFromKeywords(`${item.title} ${item.description}`);
    }

    const context = `[YouTube Trends (${selectedRegion})]\nChannel: ${item.channelTitle}\nViews: ${item.viewCount.toLocaleString('id-ID')}\nURL: ${item.videoUrl}\n\nDeskripsi:\n${item.description.slice(0, 500)}`;

    triggerAddIdea({
      title: item.title,
      source: 'YouTube Trends',
      category: pillar,
      research_text: context,
    });

    setAddedIds((prev) => new Set(prev).add(item.id));
  };

  const handleAddGoogleIdea = (item: GoogleTrendItem) => {
    const pillar = detectPillarFromKeywords(`${item.title} ${item.newsTitle || ''}`);
    const context = `[Google Trends (${selectedRegion})]\nVolume Pencarian: ${item.approxTraffic}\nTrend URL: ${item.trendUrl}${item.newsTitle ? `\n\nBerita Pemicu:\n"${item.newsTitle}" (${item.newsSource || 'Media'}) - ${item.newsUrl || ''}` : ''}`;

    triggerAddIdea({
      title: item.title,
      source: 'Google Trends',
      category: pillar,
      research_text: context,
    });

    setAddedIds((prev) => new Set(prev).add(item.id));
  };

  const isLoading = activeSubTab === 'youtube' ? ytLoading : gtLoading;

  return (
    <main className="main-content">
      {/* Hero Section */}
      <section className="hero">
        <div>
          <p className="eyebrow">Intelijen Topik Viral Real-Time</p>
          <h1>Radar Tren</h1>
          <p className="subtitle">
            Pantau video YouTube yang sedang naik daun dan lonjakan pencarian harian Google untuk bahan riset ide konten Zeinity.
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            {isLoading ? 'Menyegarkan…' : 'Segarkan Data'}
          </button>
        </div>
      </section>

      {/* Sub-Tab Navigation & Controls Bar */}
      <section className="pipeline-panel glass" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          }}
        >
          {/* Sub-Tabs */}
          <div className="tabs" role="tablist" style={{ margin: 0 }}>
            <button
              className={`tab ${activeSubTab === 'youtube' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveSubTab('youtube')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Flame size={15} style={{ color: '#ff4d4d' }} /> YouTube Trends
            </button>
            <button
              className={`tab ${activeSubTab === 'google' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveSubTab('google')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <TrendingUp size={15} style={{ color: '#38bdf8' }} /> Google Trends
            </button>
          </div>

          {/* Controls: Region & Category */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe size={14} style={{ color: 'var(--muted)' }} />
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                style={{
                  background: 'rgba(13, 21, 38, 0.8)',
                  color: '#e2edff',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: '0.82rem',
                }}
                aria-label="Pilih Region Tren"
              >
                {TREND_REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {activeSubTab === 'youtube' && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  background: 'rgba(13, 21, 38, 0.8)',
                  color: '#e2edff',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: '0.82rem',
                }}
                aria-label="Pilih Kategori YouTube"
              >
                {YOUTUBE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: '20px' }}>
          {/* ==================== YOUTUBE VIEW ==================== */}
          {activeSubTab === 'youtube' && (
            <>
              {ytLoading && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                  <Loader2 size={36} className="spin" style={{ color: '#ff4d4d', margin: '0 auto 14px' }} />
                  <p style={{ fontSize: '0.92rem' }}>Mengambil data video terpopuler dari YouTube...</p>
                </div>
              )}

              {!ytLoading && ytError && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 10,
                    padding: 24,
                    maxWidth: 680,
                    margin: '20px auto',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.18)',
                        padding: 10,
                        borderRadius: 8,
                        color: '#f87171',
                        flexShrink: 0,
                      }}
                    >
                      <AlertCircle size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 6px', color: '#fca5a5', fontSize: '1.05rem' }}>
                        {ytError.message}
                      </h3>
                      <p style={{ margin: '0 0 16px', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.5 }}>
                        {ytError.details ||
                          'YouTube Data API memerlukan API Key gratis untuk membaca daftar video paling populer.'}
                      </p>

                      {ytError.code === 'NO_API_KEY' && (
                        <form onSubmit={handleSaveApiKey} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                          <input
                            type="password"
                            placeholder="Tempel YouTube API Key di sini (AIzaSy...)"
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            style={{
                              flex: 1,
                              background: 'rgba(15, 23, 42, 0.8)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#fff',
                              borderRadius: 6,
                              padding: '8px 12px',
                              fontSize: '0.85rem',
                            }}
                          />
                          <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
                          >
                            {apiKeySaved ? <Check size={16} /> : <Key size={16} />}
                            {apiKeySaved ? 'Tersimpan!' : 'Simpan Key'}
                          </button>
                        </form>
                      )}

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <a
                          href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <ExternalLink size={13} /> Panduan Buat API Key Gratis
                        </a>
                        <button
                          type="button"
                          className="small-btn"
                          onClick={() => setActiveSubTab('google')}
                          style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                        >
                          Lihat Google Trends (Tanpa API Key) →
                        </button>
                        {onNavigateSettings && (
                          <button
                            type="button"
                            className="small-btn"
                            onClick={onNavigateSettings}
                          >
                            Buka Settings
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!ytLoading && !ytError && ytItems.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                  Tidak ada video tren ditemukan untuk filter ini. Coba segarkan atau pilih kategori lain.
                </div>
              )}

              {!ytLoading && !ytError && ytItems.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 18,
                  }}
                >
                  {ytItems.map((item, idx) => {
                    const isAdded =
                      addedIds.has(item.id) ||
                      Boolean(existingTitles && existingTitles.has(item.title.toLowerCase().trim()));
                    return (
                      <article
                        key={item.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 10,
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'transform 0.2s ease, border-color 0.2s ease',
                        }}
                      >
                        {/* Thumbnail with Rank Badge */}
                        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#0a101f' }}>
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title}
                              loading="lazy"
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--muted)',
                              }}
                            >
                              No Thumbnail
                            </div>
                          )}
                          <span
                            style={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
                              background: 'rgba(0, 0, 0, 0.75)',
                              color: '#fff',
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: 4,
                              backdropFilter: 'blur(4px)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                            }}
                          >
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Video Info */}
                        <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <h3
                            style={{
                              margin: '0 0 6px',
                              fontSize: '0.92rem',
                              lineHeight: 1.4,
                              color: '#e2edff',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              minHeight: '2.6em',
                            }}
                            title={item.title}
                          >
                            {item.title}
                          </h3>

                          <p
                            style={{
                              margin: '0 0 10px',
                              fontSize: '0.78rem',
                              color: '#94a3b8',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.channelTitle}
                          </p>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.74rem',
                              color: '#64748b',
                              marginBottom: 14,
                            }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Eye size={13} /> {formatNumber(item.viewCount)} tayangan
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Calendar size={13} /> {formatRelativeTime(item.publishedAt)}
                            </span>
                          </div>

                          {/* Actions */}
                          <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                            <a
                              href={item.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary"
                              style={{
                                flex: 1,
                                fontSize: '0.78rem',
                                padding: '6px 10px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 5,
                              }}
                            >
                              <ExternalLink size={13} /> Sumber
                            </a>
                            <button
                              type="button"
                              className={isAdded ? 'btn btn-secondary' : 'btn btn-primary'}
                              onClick={() => handleAddYouTubeIdea(item)}
                              disabled={isAdded}
                              style={{
                                flex: 1.3,
                                fontSize: '0.78rem',
                                padding: '6px 10px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 5,
                                background: isAdded ? 'rgba(34, 197, 94, 0.15)' : undefined,
                                color: isAdded ? '#4ade80' : undefined,
                                borderColor: isAdded ? 'rgba(34, 197, 94, 0.35)' : undefined,
                              }}
                            >
                              {isAdded ? <Check size={13} /> : <Zap size={13} />}
                              {isAdded ? 'Tersimpan' : '+ Tambah Ide'}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ==================== GOOGLE TRENDS VIEW ==================== */}
          {activeSubTab === 'google' && (
            <>
              {/* Info banner confirming no API key needed */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: 8,
                  padding: '10px 16px',
                  marginBottom: 16,
                  fontSize: '0.82rem',
                  color: '#bae6fd',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={15} style={{ color: '#38bdf8', flexShrink: 0 }} />
                  <span>
                    <strong>Google Trends Siap Pakai:</strong> Tidak memerlukan API Key. Data disinkronkan otomatis secara real-time dari protokol feed pencarian publik Google.
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Publik &amp; Gratis
                </span>
              </div>

              {gtLoading && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                  <Loader2 size={36} className="spin" style={{ color: '#38bdf8', margin: '0 auto 14px' }} />
                  <p style={{ fontSize: '0.92rem' }}>Mengambil topik pencarian Google Trends harian...</p>
                </div>
              )}

              {!gtLoading && gtError && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 10,
                    padding: 20,
                    maxWidth: 600,
                    margin: '20px auto',
                    textAlign: 'center',
                  }}
                >
                  <AlertCircle size={28} style={{ color: '#f87171', margin: '0 auto 10px' }} />
                  <h3 style={{ margin: '0 0 6px', color: '#fca5a5' }}>Gagal Mengambil Google Trends</h3>
                  <p style={{ margin: '0 0 14px', color: '#cbd5e1', fontSize: '0.85rem' }}>{gtError}</p>
                  <button type="button" className="btn btn-secondary" onClick={() => loadGoogle(true)}>
                    Coba Lagi
                  </button>
                </div>
              )}

              {!gtLoading && !gtError && gtItems.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                  Tidak ada lonjakan tren Google yang ditemukan untuk wilayah ini.
                </div>
              )}

              {!gtLoading && !gtError && gtItems.length > 0 && (
                <div style={{ display: 'grid', gap: 12 }}>
                  {gtItems.map((item, idx) => {
                    const isAdded =
                      addedIds.has(item.id) ||
                      Boolean(existingTitles && existingTitles.has(item.title.toLowerCase().trim()));
                    return (
                      <article
                        key={item.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.025)',
                          border: '1px solid rgba(255, 255, 255, 0.07)',
                          borderRadius: 10,
                          padding: '14px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          flexWrap: 'wrap',
                          transition: 'background 0.2s ease',
                        }}
                      >
                        {/* Rank Badge */}
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            flexShrink: 0,
                          }}
                        >
                          #{idx + 1}
                        </div>

                        {/* Title & Metadata */}
                        <div style={{ flex: 1, minWidth: 260 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#f1f5f9' }}>{item.title}</h3>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 8px',
                                borderRadius: 12,
                                background: 'rgba(249, 115, 22, 0.15)',
                                color: '#fb923c',
                                border: '1px solid rgba(249, 115, 22, 0.3)',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                              }}
                            >
                              🔥 {item.approxTraffic}
                            </span>
                            {item.pubDate && (
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                {formatRelativeTime(item.pubDate)}
                              </span>
                            )}
                          </div>

                          {/* News Trigger Context */}
                          {item.newsTitle && (
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
                              <strong style={{ color: '#cbd5e1' }}>Berita Terkait:</strong>{' '}
                              {item.newsUrl ? (
                                <a
                                  href={item.newsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#38bdf8', textDecoration: 'none' }}
                                >
                                  "{item.newsTitle}"
                                </a>
                              ) : (
                                `"${item.newsTitle}"`
                              )}
                              {item.newsSource && (
                                <span style={{ color: '#64748b', marginLeft: 6 }}>— {item.newsSource}</span>
                              )}
                            </p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <a
                            href={item.trendUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{
                              fontSize: '0.78rem',
                              padding: '6px 12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                            title="Buka topik di Google Trends"
                          >
                            <ExternalLink size={13} /> Eksplor
                          </a>
                          <button
                            type="button"
                            className={isAdded ? 'btn btn-secondary' : 'btn btn-primary'}
                            onClick={() => handleAddGoogleIdea(item)}
                            disabled={isAdded}
                            style={{
                              fontSize: '0.78rem',
                              padding: '6px 12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              background: isAdded ? 'rgba(34, 197, 94, 0.15)' : undefined,
                              color: isAdded ? '#4ade80' : undefined,
                              borderColor: isAdded ? 'rgba(34, 197, 94, 0.35)' : undefined,
                            }}
                          >
                            {isAdded ? <Check size={13} /> : <Zap size={13} />}
                            {isAdded ? 'Tersimpan' : '+ Tambah Ide'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
