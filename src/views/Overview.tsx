import { Lightbulb, Clock, FileText, CheckCircle, Plus, Upload, Bot } from 'lucide-react';
import type { ContentItem } from '@/types';
import { formatDate } from '@/lib/date';

interface OverviewProps {
  items: ContentItem[];
  onAddIdea: () => void;
  onImportFile: () => void;
  onNavigate: (view: 'ideas' | 'research' | 'scripts' | 'published' | 'analytics') => void;
  onViewScript?: (item: ContentItem) => void;
  onViewPublished?: (item: ContentItem) => void;
  onEditIdea?: (item: ContentItem) => void;
}

export default function Overview({
  items,
  onAddIdea,
  onImportFile,
  onNavigate,
  onViewScript,
  onViewPublished,
  onEditIdea,
}: OverviewProps) {
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
    return (nowMs - t) <= sevenDaysMs && (nowMs - t) >= 0;
  }).length;

  const ideasToday = items.filter((i) => {
    if (!i.created_at) return false;
    const t = new Date(i.created_at).getTime();
    return (nowMs - t) <= oneDayMs && (nowMs - t) >= 0;
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
