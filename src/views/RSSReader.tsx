import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Rss,
  Bookmark,
  ExternalLink,
  Zap,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  Clock,
  Layers,
  Settings2,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Pencil,
  Save,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import {
  CONTENT_PILLARS,
  type ContentPillar,
  type ContentSource,
  type RSSItem,
  type RSSSource,
} from '@/types';
import {
  getRssSources,
  loadMultipleSourceItems,
  loadSourceItems,
  markItemAsRead,
  markItemAsUnread,
  toggleBookmarkItem,
  getBookmarkedItems,
  addRssSource,
  deleteRssSource,
  toggleRssSourceActive,
  updateRssSource,
  clearFeedCache,
  fetchOpenGraphImage,
} from '@/lib/rssService';
import { useAlert } from '@/components/AlertModal';

interface RSSReaderProps {
  onAddIdea?: (data: {
    title: string;
    source: ContentSource;
    category: string;
    research_text: string | null;
  }) => void;
  onAddIdeaFromRSS?: (data: {
    title: string;
    source: ContentSource;
    category: string;
    research_text: string | null;
  }) => void;
  existingTitles?: Set<string>;
}

type CategoryTab = 'media' | 'tech' | 'forum' | 'custom';
type StatusTab = 'all' | 'unread' | 'bookmarked';

const CATEGORY_TABS: { key: CategoryTab; label: string }[] = [
  { key: 'media', label: '📰 Media & Berita' },
  { key: 'tech', label: '🤖 Blog Teknologi & AI' },
  { key: 'forum', label: '💬 Forum & Komunitas' },
  { key: 'custom', label: '⭐ Koleksi Saya' },
];

function estimateReadingTime(text: string): string {
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 40));
  return `~${mins} mnt baca`;
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

export default function RSSReader({ onAddIdea, onAddIdeaFromRSS, existingTitles }: RSSReaderProps) {
  const { showWarning, showError, showSuccess } = useAlert();

  // Navigation & filter state
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('media');
  const [selectedPillar, setSelectedPillar] = useState<string>('all');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Progressive disclosure: show 25 articles initially, add 10 per click
  const [visibleCount, setVisibleCount] = useState(25);

  // Sources and items state
  const [sources, setSources] = useState<RSSSource[]>([]);
  const [items, setItems] = useState<RSSItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Ref to track which categories have already been fetched (avoids re-fetching on tab revisit)
  const fetchedCategories = useRef<Set<CategoryTab>>(new Set());

  // Bookmarks & added ideas tracking
  const [bookmarkedList, setBookmarkedList] = useState<RSSItem[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Manage Feeds Modal
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedTitle, setNewFeedTitle] = useState('');
  const [newFeedCategory, setNewFeedCategory] = useState<CategoryTab>('custom');
  const [newFeedPillar, setNewFeedPillar] = useState<ContentPillar>('AI & Technology Impact');
  const [addFeedLoading, setAddFeedLoading] = useState(false);

  // Edit source state
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editCategory, setEditCategory] = useState<CategoryTab>('media');
  const [editPillar, setEditPillar] = useState<ContentPillar>('AI & Technology Impact');
  const [editLoading, setEditLoading] = useState(false);

  // Close Manage Feeds modal on Escape
  useEffect(() => {
    if (!manageModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.querySelector('.alert-modal-layer')) return;
        e.preventDefault();
        e.stopPropagation();
        setManageModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [manageModalOpen]);

  // Load sources on mount
  useEffect(() => {
    let mounted = true;
    const fetchSources = async () => {
      const loaded = await getRssSources();
      if (mounted) {
        setSources(loaded);
        setBookmarkedList(getBookmarkedItems());
      }
    };
    fetchSources();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch articles only for the given category (lazy per category)
  const fetchCategoryArticles = useCallback(
    async (category: CategoryTab, force = false) => {
      if (sources.length === 0) return;
      // Skip if already fetched (cache hit) and not forcing a refresh
      if (!force && fetchedCategories.current.has(category)) return;

      const categorySources = sources.filter((s) => s.category === category && s.is_active);
      // Mark as fetched even if no active sources to avoid endless retries
      fetchedCategories.current.add(category);
      if (categorySources.length === 0) return;

      setLoading(true);
      try {
        const res = await loadMultipleSourceItems(categorySources, force);
        setItems((prev) => {
          // Remove stale items belonging to this category's sources, then merge
          const categorySourceIds = new Set(categorySources.map((s) => s.id));
          const otherItems = prev.filter((i) => !categorySourceIds.has(i.source_id));
          const merged = [...otherItems, ...res.items];
          // Re-sort by pubDate descending
          merged.sort((a, b) => {
            const timeA = new Date(a.pubDate).getTime() || 0;
            const timeB = new Date(b.pubDate).getTime() || 0;
            return timeB - timeA;
          });
          return merged;
        });
        setErrors((prev) => ({ ...prev, ...res.errors }));
      } catch (err) {
        console.error('Failed to load RSS articles for category:', category, err);
      } finally {
        setLoading(false);
      }
    },
    [sources]
  );

  // Manual refresh: invalidate all caches, fetch all active sources, and give clear user feedback
  const fetchArticles = useCallback(
    async (force = false) => {
      if (!force) {
        await fetchCategoryArticles(activeCategory, false);
        return;
      }

      const activeSources = sources.filter((s) => s.is_active);
      if (activeSources.length === 0) {
        showWarning('Tidak Ada Feed Aktif', 'Aktifkan atau tambahkan sumber feed di menu Kelola Sumber.');
        return;
      }

      setLoading(true);
      clearFeedCache();
      fetchedCategories.current.clear();

      try {
        const res = await loadMultipleSourceItems(activeSources, true);
        setItems(() => {
          const sorted = [...res.items].sort((a, b) => {
            const timeA = new Date(a.pubDate).getTime() || 0;
            const timeB = new Date(b.pubDate).getTime() || 0;
            return timeB - timeA;
          });
          return sorted;
        });
        setErrors(res.errors);

        // Mark all categories with sources as fetched
        for (const s of activeSources) {
          fetchedCategories.current.add(s.category as CategoryTab);
        }

        const errorCount = Object.keys(res.errors).length;
        if (errorCount > 0) {
          showWarning(
            'Sinkronisasi Selesai Sebagian',
            `Berhasil memuat ${res.items.length} artikel. Namun terdapat ${errorCount} sumber feed yang gagal diakses. Periksa menu "Kelola Sumber Feed" untuk melihat detail.`
          );
        } else {
          showSuccess(
            'Sinkronisasi Sukses',
            `Berhasil menyinkronkan ${res.items.length} artikel dari ${activeSources.length} sumber feed aktif.`
          );
        }
      } catch (err) {
        showError('Sinkronisasi Gagal', err instanceof Error ? err.message : 'Gagal menyinkronkan feed.');
      } finally {
        setLoading(false);
      }
    },
    [activeCategory, fetchCategoryArticles, sources, showWarning, showSuccess, showError]
  );

  // Fetch active category when sources first become available
  useEffect(() => {
    if (sources.length > 0) {
      fetchCategoryArticles(activeCategory, false);
    }
    // Only run when sources change; activeCategory already covered by the next effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources]);

  // Fetch category articles when user switches to a new tab
  useEffect(() => {
    if (sources.length > 0) {
      fetchCategoryArticles(activeCategory, false);
    }
  }, [activeCategory, fetchCategoryArticles, sources.length]);

  // Handle Mark Read
  const handleItemClick = (item: RSSItem) => {
    markItemAsRead(item.id);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isRead: true } : i))
    );
  };

  // Handle Toggle Read / Unread Status
  const handleToggleRead = (item: RSSItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextReadStatus = !item.isRead;
    if (nextReadStatus) {
      markItemAsRead(item.id);
    } else {
      markItemAsUnread(item.id);
    }
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isRead: nextReadStatus } : i))
    );
  };

  // Handle Toggle Bookmark
  const handleToggleBookmark = (item: RSSItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const isNowBookmarked = toggleBookmarkItem(item);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isBookmarked: isNowBookmarked } : i))
    );
    setBookmarkedList(getBookmarkedItems());
  };

  // Handle Add to Content Pipeline
  const handleAddIdea = (item: RSSItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const context = `[RSS Feed: ${item.source_name}]\nArtikel: ${item.title}\nLink: ${item.link}\nTanggal: ${item.pubDate}\n\nRingkasan:\n${item.contentSnippet}`;

    const ideaData = {
      title: item.title,
      source: 'RSS' as ContentSource,
      category: item.pillar || 'AI & Technology Impact',
      research_text: context,
    };

    if (onAddIdeaFromRSS) {
      onAddIdeaFromRSS(ideaData);
    } else if (onAddIdea) {
      onAddIdea(ideaData);
    }

    setAddedIds((prev) => new Set(prev).add(item.id));
    handleItemClick(item);
  };

  // Manage Feeds: Add new feed
  const handleAddNewFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl.trim() || !newFeedTitle.trim()) {
      showWarning(
        'Form Belum Lengkap',
        'Harap isi Judul Sumber dan URL Feed RSS yang valid.'
      );
      return;
    }

    try {
      new URL(newFeedUrl.trim());
    } catch {
      showWarning('URL Tidak Valid', 'Pastikan URL feed diawali dengan http:// atau https://');
      return;
    }

    setAddFeedLoading(true);
    try {
      const created = await addRssSource({
        title: newFeedTitle.trim(),
        url: newFeedUrl.trim(),
        category: newFeedCategory,
        pillar: newFeedPillar,
        is_active: true,
      });

      setSources((prev) => [created, ...prev]);
      setActiveCategory(created.category);
      setSelectedPillar('all');
      setNewFeedUrl('');
      setNewFeedTitle('');
      setNewFeedCategory('custom');
      setNewFeedPillar('AI & Technology Impact');
      setManageModalOpen(false);

      // Immediately fetch items from this new feed!
      try {
        const newFeedItems = await loadSourceItems(created, true);
        if (newFeedItems.length > 0) {
          setItems((prev) => {
            const merged = [...newFeedItems, ...prev.filter((i) => i.source_id !== created.id)];
            merged.sort((a, b) => {
              const timeA = new Date(a.pubDate).getTime() || 0;
              const timeB = new Date(b.pubDate).getTime() || 0;
              return timeB - timeA;
            });
            return merged;
          });
          setErrors((prev) => {
            const next = { ...prev };
            delete next[created.id];
            return next;
          });
          fetchedCategories.current.add(created.category);

          const catName =
            created.category === 'media'
              ? 'Media & Berita'
              : created.category === 'tech'
              ? 'Blog Teknologi & AI'
              : created.category === 'forum'
              ? 'Forum & Komunitas'
              : 'Koleksi Saya';

          showSuccess(
            'Feed Berhasil Ditambahkan',
            `Berhasil memuat ${newFeedItems.length} artikel dari "${created.title}". Kategori aktif dialihkan ke "${catName}".`
          );
        } else {
          showWarning(
            'Feed Ditambahkan Tanpa Artikel',
            `Feed "${created.title}" berhasil disimpan, namun tidak ditemukan artikel di dalam XML feed tersebut.`
          );
        }
      } catch (fetchErr) {
        const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        setErrors((prev) => ({ ...prev, [created.id]: errMsg }));
        showWarning(
          'Feed Tersimpan, Namun Gagal Dimuat',
          `Feed "${created.title}" telah disimpan, namun aplikasi gagal mengambil data artikel (${errMsg}). Pastikan URL tersebut adalah feed XML RSS/Atom yang valid, bukan halaman web HTML biasa.`
        );
      }
    } catch (err) {
      showError(
        'Gagal Menambahkan Feed',
        err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan feed baru.'
      );
    } finally {
      setAddFeedLoading(false);
    }
  };

  // Manage Feeds: Toggle active
  const handleToggleSourceActive = async (source: RSSSource) => {
    const updatedStatus = !source.is_active;
    await toggleRssSourceActive(source.id, updatedStatus);
    setSources((prev) =>
      prev.map((s) => (s.id === source.id ? { ...s, is_active: updatedStatus } : s))
    );
  };

  // Manage Feeds: Delete source (all feeds deletable)
  const handleDeleteSource = async (id: string) => {
    await deleteRssSource(id);
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  // Manage Feeds: Start editing a source
  const handleStartEdit = (source: RSSSource) => {
    setEditingSourceId(source.id);
    setEditTitle(source.title);
    setEditUrl(source.url);
    setEditCategory(source.category as CategoryTab);
    setEditPillar((source.pillar as ContentPillar) || 'AI & Technology Impact');
  };

  // Manage Feeds: Cancel editing
  const handleCancelEdit = () => {
    setEditingSourceId(null);
  };

  // Manage Feeds: Save edits
  const handleSaveEdit = async (id: string) => {
    const trimmedTitle = editTitle.trim();
    const trimmedUrl = editUrl.trim();
    if (!trimmedTitle || !trimmedUrl) return;
    try {
      new URL(trimmedUrl);
    } catch {
      showWarning('URL Tidak Valid', 'Pastikan URL feed diawali dengan http:// atau https://');
      return;
    }
    setEditLoading(true);
    try {
      const patch = { title: trimmedTitle, url: trimmedUrl, category: editCategory, pillar: editPillar };
      await updateRssSource(id, patch);
      setSources((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      setEditingSourceId(null);
    } catch (err) {
      showError('Gagal Menyimpan', err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setEditLoading(false);
    }
  };

  // Filtering articles
  const filteredItems = useMemo(() => {
    let pool = statusTab === 'bookmarked' ? bookmarkedList : items;

    // Filter by category (Level 1)
    if (statusTab !== 'bookmarked') {
      const categorySources = new Set(
        sources.filter((s) => s.category === activeCategory).map((s) => s.id)
      );
      pool = pool.filter((item) => categorySources.has(item.source_id));
    }

    // Filter by Pillar (Level 2)
    if (selectedPillar !== 'all') {
      pool = pool.filter((item) => item.pillar === selectedPillar);
    }

    // Filter by Status Tab (unread)
    if (statusTab === 'unread') {
      pool = pool.filter((item) => !item.isRead);
    }

    // Search query filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      pool = pool.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.contentSnippet.toLowerCase().includes(q) ||
          item.source_name.toLowerCase().includes(q)
      );
    }

    return pool;
  }, [items, bookmarkedList, sources, activeCategory, selectedPillar, statusTab, searchQuery]);

  // Reset visibleCount to 25 whenever the user changes category, pillar, or status filter
  useEffect(() => {
    setVisibleCount(25);
  }, [activeCategory, selectedPillar, statusTab]);

  // Slice for progressive disclosure
  const displayedItems = filteredItems.slice(0, visibleCount);

  // Background OpenGraph image enrichment for items without XML thumbnails (e.g. Gamebrott / minimalist feeds)
  useEffect(() => {
    const missingThumbnails = displayedItems.filter((i) => !i.thumbnail && i.link);
    if (missingThumbnails.length === 0) return;

    let active = true;

    const enrichThumbnails = async () => {
      const batchSize = 3;
      for (let i = 0; i < missingThumbnails.length; i += batchSize) {
        if (!active) break;
        const batch = missingThumbnails.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(async (item) => {
            const ogImage = await fetchOpenGraphImage(item.link);
            if (active && ogImage) {
              setItems((prev) =>
                prev.map((it) => (it.id === item.id ? { ...it, thumbnail: ogImage } : it))
              );
            }
          })
        );
      }
    };

    enrichThumbnails();

    return () => {
      active = false;
    };
  }, [displayedItems]);

  const unreadCount = useMemo(() => {
    return items.filter((i) => !i.isRead).length;
  }, [items]);

  return (
    <main className="main-content">
      {/* Hero Section */}
      <section className="hero">
        <div>
          <p className="eyebrow">Agregator Berita & Riset Konten</p>
          <h1>RSS Reader Studio</h1>
          <p className="subtitle">
            Kurasi artikel berita, blog AI/teknologi, dan forum global yang terpetakan ke 5 Pilar Konten Zeinity.
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setManageModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Settings2 size={16} /> Kelola Sumber Feed ({sources.length})
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => fetchArticles(true)}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            {loading ? 'Menyinkronkan…' : 'Sinkronkan Feed'}
          </button>
        </div>
      </section>

      {/* Main Panel */}
      <section className="pipeline-panel glass" style={{ marginBottom: 24 }}>
        {/* Level 1 Navigation Tabs: Category */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            padding: '12px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div className="tabs" role="tablist" style={{ margin: 0 }}>
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`tab ${activeCategory === tab.key && statusTab !== 'bookmarked' ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  setActiveCategory(tab.key);
                  if (statusTab === 'bookmarked') setStatusTab('all');
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status Switcher (Semua / Belum Dibaca / Disimpan) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button
              className={`small-btn ${statusTab === 'all' ? 'active' : ''}`}
              type="button"
              onClick={() => setStatusTab('all')}
              style={{
                borderColor: statusTab === 'all' ? 'var(--cyan)' : undefined,
                color: statusTab === 'all' ? 'var(--cyan)' : undefined,
              }}
            >
              Semua
            </button>
            <button
              className={`small-btn ${statusTab === 'unread' ? 'active' : ''}`}
              type="button"
              onClick={() => setStatusTab('unread')}
              style={{
                borderColor: statusTab === 'unread' ? '#fb923c' : undefined,
                color: statusTab === 'unread' ? '#fb923c' : undefined,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              Belum Dibaca
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#ea580c',
                    color: '#fff',
                    padding: '1px 6px',
                    borderRadius: 10,
                    fontSize: '0.68rem',
                    fontWeight: 700,
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              className={`small-btn ${statusTab === 'bookmarked' ? 'active' : ''}`}
              type="button"
              onClick={() => setStatusTab('bookmarked')}
              style={{
                borderColor: statusTab === 'bookmarked' ? '#facc15' : undefined,
                color: statusTab === 'bookmarked' ? '#facc15' : undefined,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Bookmark size={12} /> Disimpan ({bookmarkedList.length})
            </button>
            <button
              className="small-btn"
              type="button"
              onClick={() => setManageModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
              title="Kelola Sumber Feed"
            >
              <Settings2 size={12} /> Kelola Sumber
            </button>
          </div>
        </div>

        {/* Level 2 Filter Pills: 5 Pilar Zeinity & Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            padding: '12px 18px',
            background: 'rgba(0, 0, 0, 0.15)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Pilar Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--muted)', marginRight: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Layers size={13} /> Pilar:
            </span>
            <button
              className={`small-btn ${selectedPillar === 'all' ? 'active' : ''}`}
              type="button"
              onClick={() => setSelectedPillar('all')}
              style={{
                fontSize: '0.74rem',
                padding: '4px 10px',
                borderColor: selectedPillar === 'all' ? 'var(--cyan)' : undefined,
                color: selectedPillar === 'all' ? 'var(--cyan)' : undefined,
              }}
            >
              Semua Pilar
            </button>
            {CONTENT_PILLARS.map((p) => (
              <button
                key={p}
                className={`small-btn ${selectedPillar === p ? 'active' : ''}`}
                type="button"
                onClick={() => setSelectedPillar(p)}
                style={{
                  fontSize: '0.74rem',
                  padding: '4px 10px',
                  borderColor: selectedPillar === p ? 'var(--cyan)' : undefined,
                  color: selectedPillar === p ? 'var(--cyan)' : undefined,
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative', width: 220 }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
              }}
            />
            <input
              type="text"
              placeholder="Cari artikel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 10px 5px 30px',
                fontSize: '0.78rem',
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 6,
                color: '#fff',
              }}
            />
          </div>
        </div>

        {/* Article Cards Grid */}
        <div style={{ padding: 20 }}>
          {/* Active Category Errors Banner */}
          {Object.entries(errors).filter(([srcId]) =>
            sources.some((s) => s.id === srcId && s.category === activeCategory && s.is_active)
          ).length > 0 && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#fca5a5' }}>
                <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                <span>
                  Ada sumber feed di kategori ini yang gagal dimuat. Periksa URL atau koneksi di menu{' '}
                  <strong>Kelola Sumber</strong>.
                </span>
              </div>
              <button
                type="button"
                className="small-btn"
                onClick={() => setManageModalOpen(true)}
                style={{ fontSize: '0.72rem', padding: '3px 8px', color: '#fca5a5', borderColor: '#ef4444' }}
              >
                Periksa Sumber
              </button>
            </div>
          )}

          {loading && items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              <Loader2 size={36} className="spin" style={{ color: 'var(--cyan)', margin: '0 auto 14px' }} />
              <p style={{ fontSize: '0.92rem' }}>Memuat feed berita dan blog teknologi...</p>
            </div>
          )}

          {!loading && filteredItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--muted)' }}>
              <Rss size={36} style={{ color: 'rgba(255, 255, 255, 0.2)', margin: '0 auto 12px' }} />
              {activeCategory === 'custom' && sources.filter((s) => s.category === 'custom').length === 0 ? (
                <>
                  <h3 style={{ color: '#e2edff', margin: '0 0 6px', fontSize: '1rem' }}>Belum Ada Feed di Koleksi Saya</h3>
                  <p style={{ fontSize: '0.85rem', marginBottom: 16 }}>
                    Tambahkan URL RSS atau Atom favorit Anda untuk mulai memantau artikel secara khusus di tab ini.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setManageModalOpen(true)}
                    style={{ fontSize: '0.8rem', padding: '6px 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Plus size={14} /> + Tambah Sumber Feed Baru
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '0.92rem', marginBottom: 6 }}>
                    Tidak ada artikel yang cocok dengan kriteria filter saat ini.
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setSelectedPillar('all');
                      setStatusTab('all');
                      setSearchQuery('');
                    }}
                    style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  >
                    Reset Filter
                  </button>
                </>
              )}
            </div>
          )}

          {filteredItems.length > 0 && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
                  gap: 16,
                }}
              >
                {displayedItems.map((item) => {
                  const isAdded =
                    addedIds.has(item.id) ||
                    Boolean(existingTitles && existingTitles.has(item.title.toLowerCase().trim()));
                  return (
                  <article
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    style={{
                      background: item.isRead
                        ? 'rgba(255, 255, 255, 0.015)'
                        : 'rgba(255, 255, 255, 0.04)',
                      border: item.isRead
                        ? '1px solid rgba(255, 255, 255, 0.05)'
                        : '1px solid rgba(79, 232, 255, 0.18)',
                      borderRadius: 10,
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s ease, transform 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    {/* Top Row: Source badge & Bookmark */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            background: 'rgba(249, 115, 22, 0.15)',
                            color: '#fb923c',
                            border: '1px solid rgba(249, 115, 22, 0.3)',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 12,
                          }}
                        >
                          {item.source_name}
                        </span>

                        {item.pillar && (
                          <span
                            style={{
                              background: 'rgba(79, 232, 255, 0.08)',
                              color: '#94eaff',
                              border: '1px solid rgba(79, 232, 255, 0.2)',
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: 12,
                            }}
                          >
                            {item.pillar}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        aria-label="Simpan ke Bookmark"
                        onClick={(e) => handleToggleBookmark(item, e)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: item.isBookmarked ? '#facc15' : 'var(--muted)',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title={item.isBookmarked ? 'Hapus dari bookmark' : 'Simpan artikel'}
                      >
                        <Bookmark
                          size={16}
                          fill={item.isBookmarked ? '#facc15' : 'none'}
                        />
                      </button>
                    </div>

                    {/* Article Thumbnail Preview */}
                    {item.thumbnail && (
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: 120,
                          borderRadius: 6,
                          overflow: 'hidden',
                          marginBottom: 10,
                          background: 'rgba(10, 16, 31, 0.6)',
                        }}
                      >
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </div>
                    )}

                    {/* Article Title */}
                    <h3
                      style={{
                        margin: '0 0 8px',
                        fontSize: '0.94rem',
                        fontWeight: item.isRead ? 500 : 700,
                        color: item.isRead ? '#94a3b8' : '#f1f5f9',
                        lineHeight: 1.4,
                      }}
                    >
                      {item.title}
                    </h3>

                    {/* Snippet */}
                    <p
                      style={{
                        margin: '0 0 14px',
                        fontSize: '0.8rem',
                        color: '#64748b',
                        lineHeight: 1.5,
                        flex: 1,
                      }}
                    >
                      {item.contentSnippet || 'Tidak ada pratinjau teks tersedia.'}
                    </p>

                    {/* Footer Info: Reading time, Date, Action buttons */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        fontSize: '0.75rem',
                        color: 'var(--muted)',
                        paddingTop: 10,
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        marginTop: 'auto',
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                          <Clock size={12} /> {estimateReadingTime(item.contentSnippet)}
                        </span>
                        <span style={{ opacity: 0.4 }}>•</span>
                        <span style={{ whiteSpace: 'nowrap' }}>{formatRelativeTime(item.pubDate)}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleRead(item, e)}
                          title={item.isRead ? 'Belum Dibaca (Klik untuk batalkan status baca)' : 'Tandai Dibaca (Klik untuk tandai sudah dibaca)'}
                          aria-label={item.isRead ? 'Belum Dibaca' : 'Tandai Dibaca'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28,
                            padding: 0,
                            borderRadius: 6,
                            background: item.isRead ? 'rgba(255, 255, 255, 0.04)' : 'rgba(79, 232, 255, 0.08)',
                            border: item.isRead ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(79, 232, 255, 0.25)',
                            color: item.isRead ? 'var(--muted)' : '#94eaff',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {item.isRead ? (
                            <RotateCcw size={12} />
                          ) : (
                            <Check size={13} />
                          )}
                        </button>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: '#94eaff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: '0.75rem',
                            textDecoration: 'none',
                            padding: '4px 8px',
                            borderRadius: 6,
                            background: 'rgba(79, 232, 255, 0.08)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          <ExternalLink size={12} /> Buka
                        </a>
                        <button
                          type="button"
                          className={isAdded ? 'btn btn-secondary' : 'btn btn-primary'}
                          onClick={(e) => handleAddIdea(item, e)}
                          disabled={isAdded}
                          style={{
                            fontSize: '0.74rem',
                            padding: '4px 10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            background: isAdded ? 'rgba(34, 197, 94, 0.15)' : undefined,
                            color: isAdded ? '#4ade80' : undefined,
                            borderColor: isAdded ? 'rgba(34, 197, 94, 0.35)' : undefined,
                          }}
                        >
                          {isAdded ? <Check size={12} /> : <Zap size={12} />}
                          {isAdded ? 'Ide Masuk' : '+ Ide'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
                })}
              </div>

              {/* Count label + Load More */}
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 10 }}>
                  Menampilkan {Math.min(visibleCount, filteredItems.length)} dari {filteredItems.length} artikel
                </p>
                {filteredItems.length > visibleCount && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={loading}
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <ChevronDown size={16} /> Muat 10 Artikel Lagi
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ==================== MANAGE SOURCES MODAL ==================== */}
      {manageModalOpen && (
        <div
          className="modal-layer open"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setManageModalOpen(false);
          }}
        >
          <div className="modal glass" style={{ maxWidth: 640 }}>
            <div className="modal-top">
              <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '1.15rem' }}>
                <Settings2 size={20} style={{ color: 'var(--cyan)' }} /> Kelola Sumber Feed RSS
              </h2>
              <button
                className="icon-btn"
                type="button"
                onClick={() => setManageModalOpen(false)}
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Add Feed Form */}
            <form onSubmit={handleAddNewFeed} style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 10px', color: '#e2edff', fontSize: '0.9rem' }}>Tambah Feed Baru</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                    Nama Sumber
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Verge AI / Android Police"
                    value={newFeedTitle}
                    onChange={(e) => setNewFeedTitle(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 6,
                      padding: '7px 10px',
                      color: '#fff',
                      fontSize: '0.82rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                    URL RSS / Atom
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/feed.xml"
                    value={newFeedUrl}
                    onChange={(e) => setNewFeedUrl(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 6,
                      padding: '7px 10px',
                      color: '#fff',
                      fontSize: '0.82rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                    Kategori Sumber
                  </label>
                  <select
                    value={newFeedCategory}
                    onChange={(e) => setNewFeedCategory(e.target.value as CategoryTab)}
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 6,
                      padding: '7px 10px',
                      color: '#fff',
                      fontSize: '0.82rem',
                    }}
                  >
                    <option value="media">Media & Berita</option>
                    <option value="tech">Blog Teknologi & AI</option>
                    <option value="forum">Forum & Komunitas</option>
                    <option value="custom">Koleksi Saya</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                    Pilar Zeinity
                  </label>
                  <select
                    value={newFeedPillar}
                    onChange={(e) => setNewFeedPillar(e.target.value as ContentPillar)}
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 6,
                      padding: '7px 10px',
                      color: '#fff',
                      fontSize: '0.82rem',
                    }}
                  >
                    {CONTENT_PILLARS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={addFeedLoading}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px',
                  fontSize: '0.82rem',
                }}
              >
                <Plus size={15} /> Tambahkan ke Sumber Aktif
              </button>
            </form>

            {/* List of Current Sources */}
            <h4 style={{ margin: '14px 0 10px', color: '#e2edff', fontSize: '0.9rem' }}>
              Daftar Feed Terdaftar ({sources.length})
            </h4>

            <div
              style={{
                maxHeight: 260,
                overflowY: 'auto',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 8,
                padding: '8px 12px',
                display: 'grid',
                gap: 8,
              }}
            >
              {sources.map((s) => {
                const hasError = errors[s.id];
                const isEditing = editingSourceId === s.id;
                const inputStyle = {
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 5,
                  padding: '5px 8px',
                  color: '#fff',
                  fontSize: '0.78rem',
                };
                return (
                  <div
                    key={s.id}
                    style={{
                      borderRadius: 6,
                      background: isEditing ? 'rgba(79, 232, 255, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                      border: isEditing ? '1px solid rgba(79,232,255,0.25)' : '1px solid transparent',
                      padding: '8px 10px',
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    {/* Summary row (always visible) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <strong style={{ fontSize: '0.84rem', color: '#f1f5f9' }}>{s.title}</strong>
                          {hasError ? (
                            <span
                              title={hasError}
                              style={{ color: '#f87171', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: 2 }}
                            >
                              <AlertCircle size={11} /> Gagal dimuat
                            </span>
                          ) : (
                            <span
                              style={{ color: s.is_active ? '#4ade80' : 'var(--muted)', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: 2 }}
                            >
                              <CheckCircle2 size={11} /> {s.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.url}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {/* Toggle Aktif/Nonaktif */}
                        <button
                          type="button"
                          className="small-btn"
                          onClick={() => handleToggleSourceActive(s)}
                          title={s.is_active ? 'Nonaktifkan feed ini' : 'Aktifkan feed ini'}
                          style={{
                            fontSize: '0.7rem',
                            padding: '3px 8px',
                            color: s.is_active ? 'var(--cyan)' : 'var(--muted)',
                            borderColor: s.is_active ? 'var(--cyan)' : undefined,
                          }}
                        >
                          {s.is_active ? 'Aktif' : 'Nonaktif'}
                        </button>

                        {/* Edit button */}
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => isEditing ? handleCancelEdit() : handleStartEdit(s)}
                          title={isEditing ? 'Batal edit' : 'Edit feed ini'}
                          style={{ color: isEditing ? 'var(--muted)' : 'var(--cyan)', padding: 4 }}
                        >
                          {isEditing ? <XCircle size={14} /> : <Pencil size={14} />}
                        </button>

                        {/* Delete button */}
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => handleDeleteSource(s.id)}
                          title="Hapus feed ini secara permanen"
                          style={{ color: '#f87171', padding: 4 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Inline edit form (only when editing this row) */}
                    {isEditing && (
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Nama Sumber</label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              style={inputStyle}
                              placeholder="Nama feed"
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>URL RSS / Atom</label>
                            <input
                              type="url"
                              value={editUrl}
                              onChange={(e) => setEditUrl(e.target.value)}
                              style={inputStyle}
                              placeholder="https://..."
                            />
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Kategori Sumber</label>
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value as CategoryTab)}
                              style={inputStyle}
                            >
                              <option value="media">Media &amp; Berita</option>
                              <option value="tech">Blog Teknologi &amp; AI</option>
                              <option value="forum">Forum &amp; Komunitas</option>
                              <option value="custom">Koleksi Saya</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Pilar Zeinity</label>
                            <select
                              value={editPillar}
                              onChange={(e) => setEditPillar(e.target.value as ContentPillar)}
                              style={inputStyle}
                            >
                              {CONTENT_PILLARS.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleCancelEdit}
                            style={{ fontSize: '0.75rem', padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <XCircle size={13} /> Batal
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={editLoading}
                            onClick={() => handleSaveEdit(s.id)}
                            style={{ fontSize: '0.75rem', padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            {editLoading ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
                            {editLoading ? 'Menyimpan…' : 'Simpan Perubahan'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
