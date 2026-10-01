import { useState, useMemo, useEffect } from 'react';
import { Plus, Upload, Filter, Pencil, Trash2, Zap, FileText, Image, ExternalLink, Loader2, Bot, Flame, TrendingUp, Rss } from 'lucide-react';
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
}

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
}: ContentTableProps) {
  const { showAlert } = useAlert();

  const isScriptsView = title.toLowerCase().includes('script');
  const isPublishedView = title.toLowerCase().includes('publish');
  const isResearchView = title.toLowerCase().includes('research');

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
        { key: 'production', label: 'All Scripts' },
        { key: 'Scripting', label: 'Scripting' },
        { key: 'Thumbnailing', label: 'Thumbnailing' },
        { key: 'Telegram', label: 'Telegram' },
        { key: 'Web', label: 'Web' },
        { key: 'YouTube Trends', label: 'YouTube' },
        { key: 'Google Trends', label: 'Google' },
        { key: 'RSS', label: 'RSS' },
      ];
    }
    if (isResearchView) {
      return [
        { key: 'validation', label: 'Needs Validation' },
        { key: 'Researching', label: 'In Research' },
        { key: 'all', label: 'All Items' },
        { key: 'Telegram', label: 'Telegram' },
        { key: 'Web', label: 'Web' },
        { key: 'YouTube Trends', label: 'YouTube' },
        { key: 'Google Trends', label: 'Google' },
        { key: 'RSS', label: 'RSS' },
      ];
    }
    return [
      { key: 'all', label: 'All Ideas' },
      { key: 'Telegram', label: 'Telegram' },
      { key: 'Web', label: 'Web' },
      { key: 'YouTube Trends', label: 'YouTube' },
      { key: 'Google Trends', label: 'Google' },
      { key: 'RSS', label: 'RSS' },
      { key: 'validation', label: 'Needs Validation' },
      { key: 'production', label: 'In Production' },
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

  // Sync activeTab and reset filters when defaultTab or title changes (e.g. view switching)
  useEffect(() => {
    setActiveTab(defaultTab);
    setStatusFilter('');
    setCategoryFilter('');
  }, [defaultTab, title]);

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
      if (activeTab === 'all') {
        tabMatch = true;
      } else if (activeTab === 'validation') {
        tabMatch = item.status === 'Idea' || item.status === 'Validating' || item.status === 'Researching';
      } else if (activeTab === 'production') {
        tabMatch = (['Researching', 'Scripting', 'Thumbnailing'] as ContentStatus[]).includes(item.status);
      } else if (activeTab === 'Scripting' || activeTab === 'Thumbnailing' || activeTab === 'Researching' || activeTab === 'Idea' || activeTab === 'Published') {
        tabMatch = item.status === activeTab;
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
        <span style={{ color: '#f9d777', fontSize: '.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
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

  const handleTitleClick = (item: ContentItem) => {
    if (item.status === 'Published') {
      onViewPublished(item);
    } else if (item.status === 'Researching' || item.status === 'Scripting' || item.status === 'Thumbnailing') {
      onViewScript(item);
    } else {
      onEdit(item);
    }
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
          <div className="tabs" role="tablist" aria-label="Filter ide">
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
                cursor: (categoryFilter || statusFilter || searchQuery.trim()) ? 'pointer' : 'default',
                color: (categoryFilter || statusFilter || searchQuery.trim()) ? 'var(--cyan)' : undefined,
                borderColor: (categoryFilter || statusFilter || searchQuery.trim()) ? 'var(--cyan)' : undefined,
              }}
              title={(categoryFilter || statusFilter || searchQuery.trim()) ? 'Klik untuk mereset filter' : 'Filter aktif'}
            >
              <Filter size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
              {(categoryFilter || statusFilter || searchQuery.trim()) ? 'Reset Filter' : 'Filter'}
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
            <table>
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
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '24px 0' }}>
                        <span>{emptyMessage}</span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleResetFilters}
                          style={{ fontSize: '0.82rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <Filter size={13} /> Reset Filter
                        </button>
                      </div>
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
                            className="row-action default"
                            type="button"
                            onClick={() => onEdit(item)}
                            title="Edit Ide"
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
          )}
        </div>
      </section>
    </main>
  );
}
