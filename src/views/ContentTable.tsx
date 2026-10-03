import { useState, useMemo, useEffect } from 'react';
import { Plus, Upload, Filter, Pencil, Trash2, Zap, FileText, Image, ExternalLink, Loader2, Bot, Flame, TrendingUp, Rss, Lightbulb, Sparkles } from 'lucide-react';
import {
  CONTENT_PILLARS,
  CONTENT_STATUSES,
  type ContentItem,
  type ContentStatus,
  normalizeContentPillar,
} from '@/types';
import { useAlert } from '@/components/AlertModal';
import { formatDate } from '@/lib/date';

interface ContentTableProps {
  items: ContentItem[];
  loading: boolean;
  searchQuery: string;
  onResetSearch?: () => void;
  onAddIdea: () => void;
  onImportFile?: () => void;
  importButtonLabel?: string;
  addIdeaButtonLabel?: string;
  onValidate: (item: ContentItem) => void;
  onViewScript: (item: ContentItem) => void;
  onViewPublished: (item: ContentItem) => void;
  onEdit: (item: ContentItem) => void;
  onDelete: (item: ContentItem) => void;
  onStatusChange?: (item: ContentItem, newStatus: ContentStatus) => void;
  validatingId: string | null;
  title: string;
  eyebrow: string;
  subtitle: string;
  defaultTab?: string;
  viewType?: ContentTableViewType;
}

export type ContentTableViewType = 'ideas' | 'research' | 'scripts' | 'published';

// 5 Pilar Konten Resmi Zeinity (tersinkronisasi dari types.ts)
// 1. Internet & Social Media Culture
// 2. AI & Technology Impact
// 3. Digital Economy & Creator Economy
// 4. Gaming & Digital Entertainment
// 5. Modern Life & Digital Psychology
const categories = CONTENT_PILLARS;

const statuses: readonly ContentStatus[] = CONTENT_STATUSES;

export default function ContentTable({
  items,
  loading,
  searchQuery,
  onResetSearch,
  onAddIdea,
  onImportFile,
  importButtonLabel,
  addIdeaButtonLabel,
  onValidate,
  onViewScript,
  onViewPublished,
  onEdit,
  onDelete,
  onStatusChange,
  validatingId,
  title,
  eyebrow,
  subtitle,
  defaultTab = 'all',
  viewType = 'ideas',
}: ContentTableProps) {
  const { showAlert } = useAlert();

  const isScriptsView = viewType === 'scripts';
  const isPublishedView = viewType === 'published';
  const isResearchView = viewType === 'research';

  const tabs = useMemo<{ key: string; label: string }[]>(() => {
    if (isPublishedView) {
      return [
        { key: 'all', label: 'All Published' },
        { key: 'Telegram', label: 'Telegram' },
        { key: 'Web', label: 'Web' },
        { key: 'YouTube Trends', label: 'YouTube' },
        { key: 'Google Trends', label: 'Google' },
        { key: 'RSS', label: 'RSS' },
      ];
    }
    if (isScriptsView) {
      return [
        { key: 'all', label: 'All Scripts' },
        { key: 'Telegram', label: 'Telegram' },
        { key: 'Web', label: 'Web' },
        { key: 'YouTube Trends', label: 'YouTube' },
        { key: 'Google Trends', label: 'Google' },
        { key: 'RSS', label: 'RSS' },
      ];
    }
    if (isResearchView) {
      return [
        { key: 'all', label: 'All Items' },
        { key: 'Telegram', label: 'Telegram' },
        { key: 'Web', label: 'Web' },
        { key: 'YouTube Trends', label: 'YouTube' },
        { key: 'Google Trends', label: 'Google' },
        { key: 'RSS', label: 'RSS' },
      ];
    }
    return [
      { key: 'all', label: 'Semua' },
      { key: 'Telegram', label: 'Telegram' },
      { key: 'Web', label: 'Web' },
      { key: 'YouTube Trends', label: 'YouTube' },
      { key: 'Google Trends', label: 'Google' },
      { key: 'RSS', label: 'RSS' },
    ];
  }, [isPublishedView, isScriptsView, isResearchView]);

  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const availableStatuses = useMemo(() => {
    if (isPublishedView) return ['Published'] as const;
    if (isScriptsView) return ['Scripting', 'Thumbnailing'] as const;
    if (isResearchView) return ['Idea', 'Validating', 'Researching'] as const;
    return statuses;
  }, [isPublishedView, isScriptsView, isResearchView]);

  // Sync activeTab and reset filters when defaultTab, viewType, or title changes (e.g. view switching)
  useEffect(() => {
    setActiveTab(defaultTab);
    setStatusFilter('');
    setCategoryFilter('');
  }, [defaultTab, viewType, title]);

  // Ensure activeTab is valid in the current tab list; fallback to first tab if not
  useEffect(() => {
    if (!tabs.some((t) => t.key === activeTab)) {
      setActiveTab(tabs[0]?.key || 'all');
    }
  }, [tabs, activeTab]);

  // Ensure statusFilter is valid within availableStatuses; reset if not to prevent data blackout
  useEffect(() => {
    if (statusFilter && !availableStatuses.includes(statusFilter as ContentStatus)) {
      setStatusFilter('');
    }
  }, [availableStatuses, statusFilter]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      let tabMatch = false;
      if (activeTab === 'all' || activeTab === 'production' || activeTab === 'validation') {
        tabMatch = true;
      } else {
        tabMatch = item.source === activeTab;
      }

      const queryMatch =
        !query ||
        Boolean(item.title && item.title.toLowerCase().includes(query)) ||
        Boolean(item.category && item.category.toLowerCase().includes(query)) ||
        Boolean(item.research_text && item.research_text.toLowerCase().includes(query)) ||
        Boolean(item.ai_output && item.ai_output.toLowerCase().includes(query)) ||
        Boolean(item.source && item.source.toLowerCase().includes(query));
      const catMatch =
        !categoryFilter ||
        normalizeContentPillar(item.category) === categoryFilter ||
        item.category === categoryFilter;
      const statusMatch = !statusFilter || item.status === statusFilter;
      return tabMatch && queryMatch && catMatch && statusMatch;
    });
  }, [items, activeTab, searchQuery, categoryFilter, statusFilter]);

  const recordLabel = useMemo(() => {
    if (isPublishedView) return 'konten live';
    if (isScriptsView) return 'draf naskah';
    if (isResearchView) return 'item riset';
    return 'ide aktif';
  }, [isPublishedView, isScriptsView, isResearchView]);

  const isAnyFilterActive = useMemo(() => {
    return Boolean(
      categoryFilter ||
      statusFilter ||
      searchQuery.trim() ||
      (activeTab !== (tabs[0]?.key || 'all') && activeTab !== 'all')
    );
  }, [categoryFilter, statusFilter, searchQuery, activeTab, tabs]);

  const emptyMessage = useMemo(() => {
    if (isPublishedView) return 'Tidak ada konten live yang cocok dengan filter saat ini.';
    if (isScriptsView) return 'Tidak ada draf naskah yang cocok dengan filter saat ini.';
    if (isResearchView) return 'Tidak ada item riset yang cocok dengan filter saat ini.';
    return 'Tidak ada ide yang cocok dengan filter saat ini.';
  }, [isPublishedView, isScriptsView, isResearchView]);

  const handleDeleteClick = (item: ContentItem) => {
    showAlert({
      title: 'Hapus Ide Konten?',
      message: `Apakah Anda yakin ingin menghapus ide "${item.title}"? Seluruh draf, riset, dan data terkait ide ini akan dihapus secara permanen.`,
      type: 'warning',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      onConfirm: () => {
        onDelete(item);
      },
    });
  };

  const handleResetFilters = () => {
    setCategoryFilter('');
    setStatusFilter('');
    setActiveTab(tabs[0]?.key || 'all');
    if (onResetSearch) {
      onResetSearch();
    }
  };

  const renderAction = (item: ContentItem) => {
    if (item.id === validatingId) {
      return (
        <span className="row-action validating-indicator" style={{ color: '#f9d777', fontSize: '.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Loader2 size={14} className="spinner" /> Memproses...
        </span>
      );
    }
    switch (item.status) {
      case 'Idea':
        return (
          <button
            className="row-action"
            type="button"
            onClick={() => onValidate(item)}
            title="Validasi Ide dengan AI"
            aria-label={`Validasi AI untuk ide: ${item.title}`}
          >
            <Zap size={14} /> Validasi AI
          </button>
        );
      case 'Validating':
        return (
          <button
            className="row-action"
            type="button"
            onClick={() => onValidate(item)}
            title="Lanjutkan / Ulangi Validasi AI"
            aria-label={`Lanjutkan Validasi AI untuk ide: ${item.title}`}
          >
            <Zap size={14} /> Validasi AI
          </button>
        );
      case 'Researching':
        return (
          <button
            className="row-action"
            type="button"
            onClick={() => onViewScript(item)}
            title="Buka Workspace"
            aria-label={`Buka workspace riset untuk ide: ${item.title}`}
          >
            <FileText size={14} /> Workspace
          </button>
        );
      case 'Scripting':
        return (
          <button
            className="row-action"
            type="button"
            onClick={() => onViewScript(item)}
            title="Lihat Naskah"
            aria-label={`Buka editor naskah untuk ide: ${item.title}`}
          >
            <FileText size={14} /> Script
          </button>
        );
      case 'Thumbnailing':
        return (
          <button
            className="row-action"
            type="button"
            onClick={() => onViewScript(item)}
            title="Buat Thumbnail"
            aria-label={`Buka generator thumbnail untuk ide: ${item.title}`}
          >
            <Image size={14} /> Thumbnail
          </button>
        );
      case 'Published':
        return (
          <button
            className="row-action"
            type="button"
            onClick={() => onViewPublished(item)}
            title="Buka Detail Terbit"
            aria-label={`Buka detail terbit: ${item.title}`}
          >
            <ExternalLink size={14} /> Buka
          </button>
        );
      default:
        return null;
    }
  };

  const getTitleDestinationIcon = (status: ContentStatus) => {
    switch (status) {
      case 'Published':
        return <ExternalLink size={13} className="title-nav-icon" aria-hidden="true" />;
      case 'Scripting':
      case 'Thumbnailing':
      case 'Researching':
        return <FileText size={13} className="title-nav-icon" aria-hidden="true" />;
      case 'Idea':
      case 'Validating':
      default:
        return <Lightbulb size={13} className="title-nav-icon" aria-hidden="true" />;
    }
  };

  const getTitleTooltip = (item: ContentItem) => {
    if (item.status === 'Published') {
      return `Buka detail publikasi: ${item.title}`;
    }
    if (item.status === 'Researching' || item.status === 'Scripting' || item.status === 'Thumbnailing') {
      return `Buka workspace & studio naskah: ${item.title}`;
    }
    return `Buka dan tinjau ide: ${item.title}`;
  };

  const handleTitleClick = (item: ContentItem) => {
    if (item.status === 'Published') {
      onViewPublished(item);
    } else if (item.status === 'Researching' || item.status === 'Scripting' || item.status === 'Thumbnailing') {
      onViewScript(item);
    } else {
      onEdit(item);
    }
  };

  const renderSourceBadge = (item: ContentItem) => {
    if (item.source === 'Telegram') {
      return item.telegram_message_id ? (
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
      );
    }
    if (item.source === 'YouTube Trends') {
      return (
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
      );
    }
    if (item.source === 'Google Trends') {
      return (
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
      );
    }
    if (item.source === 'RSS') {
      return (
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
      );
    }
    return <span className={`source ${item.source.toLowerCase()}`}>{item.source}</span>;
  };

  return (
    <main className="main-content">
      <section className="hero">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="subtitle">{subtitle}</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" type="button" onClick={onAddIdea}>
            <Plus size={18} /> {addIdeaButtonLabel || 'Tambah Ide'}
          </button>
          {onImportFile && !isScriptsView && !isPublishedView && (
            <button className="btn btn-secondary" type="button" onClick={onImportFile}>
              <Upload size={18} /> {importButtonLabel || 'Import Ide Masal (CSV/TXT)'}
            </button>
          )}
        </div>
      </section>

      <section className="pipeline-panel glass">
        <div className="filters">
          <div className="tabs" role="tablist" aria-label="Filter sumber konten">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="filter-controls">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter berdasarkan kategori"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter berdasarkan status"
            >
              <option value="">Semua Status</option>
              {availableStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              className="small-btn"
              type="button"
              onClick={handleResetFilters}
              style={{
                cursor: isAnyFilterActive ? 'pointer' : 'default',
                color: isAnyFilterActive ? 'var(--cyan)' : undefined,
                borderColor: isAnyFilterActive ? 'var(--cyan)' : undefined,
              }}
              title={isAnyFilterActive ? 'Klik untuk mereset filter' : 'Filter aktif'}
            >
              <Filter size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
              {isAnyFilterActive ? 'Reset Filter' : 'Filter'}
            </button>
          </div>
        </div>

        <div className="table-head">
          <h2>Pipeline Konten</h2>
          <span className="record-count">{filtered.length} {recordLabel}</span>
        </div>

        <div className="table-container table-scroll">
          {loading ? (
            <div className="empty-row">Memuat data…</div>
          ) : (
            <>
              <table className="desktop-table">
              <thead>
                <tr>
                  <th>Judul</th>
                  <th>Sumber</th>
                  <th>Kategori</th>
                  <th>Status</th>
                  <th>Dibuat</th>
                  <th>Output AI</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-row">
                      {items.length === 0 ? (
                        <div
                          className="zero-state-onboarding"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 14,
                            padding: '40px 16px',
                            textAlign: 'center',
                          }}
                        >
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: '50%',
                              background: 'rgba(79, 232, 255, 0.12)',
                              border: '1px solid rgba(79, 232, 255, 0.28)',
                              display: 'grid',
                              placeItems: 'center',
                              color: 'var(--cyan)',
                            }}
                          >
                            <Sparkles size={24} />
                          </div>
                          <div>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#edf6ff', fontWeight: 700 }}>
                              Selamat Datang di Zeinity Creator Assistant
                            </h4>
                            <p style={{ margin: 0, maxWidth: 480, color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.55 }}>
                              Belum ada ide konten yang terdaftar di workspace Anda. Mulai pipeline riset dan penulisan naskah dengan menambahkan ide pertama Anda.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={onAddIdea}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '10px 20px',
                              fontWeight: 700,
                              marginTop: 4,
                            }}
                          >
                            <Plus size={16} /> + Tambah Ide Pertama
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            padding: '24px 0',
                          }}
                        >
                          <span style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>{emptyMessage}</span>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleResetFilters}
                            style={{
                              fontSize: '0.82rem',
                              padding: '6px 14px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <Filter size={13} /> Reset Filter
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <button
                          type="button"
                          className="cell-title cell-title-btn"
                          onClick={() => handleTitleClick(item)}
                          title={getTitleTooltip(item)}
                          aria-label={getTitleTooltip(item)}
                        >
                          <span className="cell-title-inner">
                            {getTitleDestinationIcon(item.status)}
                            <span className="cell-title-text">{item.title}</span>
                          </span>
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {renderSourceBadge(item)}
                        </div>
                      </td>
                      <td>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>
                          {item.category || '—'}
                        </div>
                      </td>
                      <td>
                        {onStatusChange ? (
                          <select
                            className={`status-badge ${item.status.toLowerCase()}`}
                            value={item.status}
                            onChange={(e) => onStatusChange(item, e.target.value as ContentStatus)}
                            aria-label={`Ubah status ${item.title}`}
                            title="Klik untuk mengubah status pipeline secara langsung"
                            style={{
                              border: 'none',
                              outline: 'none',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontFamily: 'inherit',
                            }}
                          >
                            {(item.status === 'Validating'
                              ? (['Validating', ...statuses.filter((s) => s !== 'Validating')] as ContentStatus[])
                              : statuses.filter((s) => s !== 'Validating')
                            ).map((s) => (
                              <option key={s} value={s} style={{ background: '#0d1526', color: '#e2edff' }}>
                                {s}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`status-badge ${item.status.toLowerCase()}`}>{item.status}</span>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: '#a6b7cf', fontSize: '.76rem' }}>
                        {formatDate(item.created_at)}
                      </td>
                      <td>
                        <div className="cell-output" title={item.ai_output || '—'}>
                          {item.ai_output || '—'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {renderAction(item)}
                          <button
                            className="row-action edit-btn default"
                            type="button"
                            onClick={() => onEdit(item)}
                            title={`Edit metadata ide: ${item.title}`}
                            aria-label={`Edit ide: ${item.title}`}
                            style={{ padding: '6px' }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="row-action danger"
                            type="button"
                            onClick={() => handleDeleteClick(item)}
                            title="Hapus"
                            aria-label={`Hapus ide: ${item.title}`}
                            style={{ padding: '6px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Mobile Card List View (<= 640px) */}
            <div className="mobile-card-list" aria-label="Daftar Kartu Ide Mobile">
              {filtered.length === 0 ? (
                items.length === 0 ? (
                  <div
                    className="zero-state-onboarding"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 14,
                      padding: '40px 16px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'rgba(79, 232, 255, 0.12)',
                        border: '1px solid rgba(79, 232, 255, 0.28)',
                        display: 'grid',
                        placeItems: 'center',
                        color: 'var(--cyan)',
                      }}
                    >
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#edf6ff', fontWeight: 700 }}>
                        Selamat Datang di Zeinity Creator Assistant
                      </h4>
                      <p style={{ margin: 0, maxWidth: 480, color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.55 }}>
                        Belum ada ide konten yang terdaftar di workspace Anda. Mulai pipeline riset dan penulisan naskah dengan menambahkan ide pertama Anda.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={onAddIdea}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 20px',
                        fontWeight: 700,
                        marginTop: 4,
                      }}
                    >
                      <Plus size={16} /> + Tambah Ide Pertama
                    </button>
                  </div>
                ) : (
                  <div
                    className="mobile-empty-filter"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      padding: '24px 12px',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>{emptyMessage}</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleResetFilters}
                      style={{
                        fontSize: '0.82rem',
                        padding: '8px 16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        minHeight: 40,
                      }}
                    >
                      <Filter size={13} /> Reset Filter
                    </button>
                  </div>
                )
              ) : (
                filtered.map((item) => (
                  <article key={`mobile-card-${item.id}`} className="idea-mobile-card glass">
                    {/* Bagian Atas: Judul ide lengkap + badge sumber */}
                    <div className="mobile-card-top">
                      <div className="mobile-card-title-row">
                        <button
                          type="button"
                          className="cell-title cell-title-btn mobile-card-title-btn"
                          onClick={() => handleTitleClick(item)}
                          title={getTitleTooltip(item)}
                          aria-label={getTitleTooltip(item)}
                        >
                          <span className="cell-title-inner">
                            {getTitleDestinationIcon(item.status)}
                            <span className="cell-title-text">{item.title}</span>
                          </span>
                        </button>
                        <div className="mobile-card-source">
                          {renderSourceBadge(item)}
                        </div>
                      </div>
                    </div>

                    {/* Bagian Tengah: Badge status + Kategori / Tanggal + Output AI / Skor */}
                    <div className="mobile-card-middle">
                      <div className="mobile-card-meta-row">
                        <div className="mobile-card-status">
                          {onStatusChange ? (
                            <select
                              className={`status-badge ${item.status.toLowerCase()}`}
                              value={item.status}
                              onChange={(e) => onStatusChange(item, e.target.value as ContentStatus)}
                              aria-label={`Ubah status ${item.title}`}
                              title="Klik untuk mengubah status pipeline secara langsung"
                              style={{
                                border: 'none',
                                outline: 'none',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontFamily: 'inherit',
                              }}
                            >
                              {(item.status === 'Validating'
                                ? (['Validating', ...statuses.filter((s) => s !== 'Validating')] as ContentStatus[])
                                : statuses.filter((s) => s !== 'Validating')
                              ).map((s) => (
                                <option key={s} value={s} style={{ background: '#0d1526', color: '#e2edff' }}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className={`status-badge ${item.status.toLowerCase()}`}>{item.status}</span>
                          )}
                        </div>

                        {item.category && (
                          <span className="mobile-card-category" title={item.category}>
                            {item.category}
                          </span>
                        )}

                        <span className="mobile-card-date">
                          {formatDate(item.created_at)}
                        </span>
                      </div>

                      {item.script_hook_type && (
                        <div className="mobile-card-hook-badge" title={`Formula Hook: ${item.script_hook_type}`}>
                          <span className="hook-badge-label">🎯 Hook:</span>
                          <span className="hook-badge-text">{item.script_hook_type}</span>
                        </div>
                      )}

                      {item.ai_output && item.ai_output !== '—' && (
                        <div className="mobile-card-ai-output" title={item.ai_output}>
                          <Sparkles size={12} className="ai-sparkle-icon" />
                          <span className="ai-output-text">{item.ai_output}</span>
                        </div>
                      )}
                    </div>

                    {/* Bagian Bawah: Baris tombol aksi jari jempol (min 40-44px touch target) */}
                    <div className="mobile-card-actions">
                      <div className="mobile-card-primary-action">
                        {renderAction(item)}
                      </div>
                      <div className="mobile-card-secondary-actions">
                        <button
                          className="row-action edit-btn default"
                          type="button"
                          onClick={() => onEdit(item)}
                          title={`Edit metadata ide: ${item.title}`}
                          aria-label={`Edit ide: ${item.title}`}
                        >
                          <Pencil size={14} /> <span>Edit</span>
                        </button>
                        <button
                          className="row-action danger"
                          type="button"
                          onClick={() => handleDeleteClick(item)}
                          title="Hapus"
                          aria-label={`Hapus ide: ${item.title}`}
                        >
                          <Trash2 size={14} /> <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </>
        )}
        </div>
      </section>
    </main>
  );
}
