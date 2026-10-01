import { useState, useCallback, useRef, useEffect } from 'react';
import type { ContentItem, ContentSource, ContentStatus, ViewKey, AIProvider } from '@/types';
import { useContent } from '@/hooks/useContent';
import { useSettings, setChannelIdentity, getChannelIdentity, parseFallbackChain } from '@/hooks/useSettings';
import { useFiles, isChannelIdentityFile } from '@/hooks/useFiles';
import { extractDocxText, extractTextFromFile } from '@/lib/docx';
import { useAlert, parseAIError } from '@/components/AlertModal';
import {
  generateResearchBriefPrompt,
  getProviderLabel,
  resolveTargetModelForTask,
  normalizeGatewayEndpoint,
  type ProviderConfig,
} from '@/lib/gemini';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import Toast from '@/components/Toast';
import AddIdeaModal from '@/components/AddIdeaModal';
import ImportModal from '@/components/ImportModal';
import BulkImportModal from '@/components/BulkImportModal';
import Overview from '@/views/Overview';
import ContentTable from '@/views/ContentTable';
import Settings from '@/views/Settings';
import FileManager from '@/views/FileManager';
import Analytics from '@/views/Analytics';
import TrendRadar from '@/views/TrendRadar';
import RSSReader from '@/views/RSSReader';
import { Loader2 } from 'lucide-react';
import ScriptDetail from '@/views/ScriptDetail';
import PublishedDetail from '@/views/PublishedDetail';
import { useTerminal } from '@/components/Terminal';
import {
  getInitialNavigation,
  syncNavigation,
  parseHash,
  STORAGE_KEY_CACHED_SCRIPT,
  STORAGE_KEY_CACHED_PUBLISHED,
  STORAGE_KEY_SCRIPT_ID,
  STORAGE_KEY_PUBLISHED_ID,
} from '@/lib/navigation';

const getProviderConfig = (settings: Record<string, string>): ProviderConfig => {
  const activeProvider = (settings.active_provider || 'custom') as AIProvider;
  const isDirect = settings.custom_gateway_model_mode === 'direct';
  const customModel = isDirect
    ? (settings.custom_gateway_direct_model || 'groq/llama-3.3-70b-versatile')
    : (settings.custom_gateway_model_version || 'Creator-Combo');

  return {
    provider: activeProvider,
    apiKey: activeProvider === 'gemini'
      ? settings.gemini_api_key
      : activeProvider === 'openrouter'
      ? settings.openrouter_api_key
      : activeProvider === 'custom'
      ? settings.custom_gateway_api_key
      : undefined,
    modelVersion: activeProvider === 'custom'
      ? customModel
      : activeProvider === 'gemini'
      ? settings.gemini_model_version
      : activeProvider === 'openrouter'
      ? settings.openrouter_model_version
      : settings.ollama_model_version,
    modelMode: isDirect ? 'direct' : 'combo',
    ollamaEndpoint: settings.ollama_endpoint,
    customEndpoint: settings.custom_gateway_endpoint || 'http://localhost:20128/v1',
    timeoutSeconds: Number(settings.ai_request_timeout || 90),
    autoSwitchEnabled: settings.auto_switch_enabled !== 'false',
    fallbackChain: parseFallbackChain(settings.fallback_provider_order),
    allSettings: settings,
  };
};

export default function App() {
  const { showError, showWarning } = useAlert();
  const { startActivity, addLog, finishActivity, errorActivity, closeTerminal } = useTerminal();
  const [initialNav] = useState(() => getInitialNavigation());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewKey>(initialNav.view);
  const [searchQuery, setSearchQuery] = useState('');
  const [addIdeaOpen, setAddIdeaOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastShow, setToastShow] = useState(false);

  // Validation state
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detail views & persistent navigation
  const [scriptItem, setScriptItem] = useState<ContentItem | null>(initialNav.cachedScriptItem);
  const [publishedItem, setPublishedItem] = useState<ContentItem | null>(initialNav.cachedPublishedItem);
  const [pendingScriptId, setPendingScriptId] = useState<string | null>(initialNav.pendingScriptId);
  const [pendingPublishedId, setPendingPublishedId] = useState<string | null>(initialNav.pendingPublishedId);
  const [editItem, setEditItem] = useState<ContentItem | null>(null);

  // Data hooks
  const { items, loading, addIdea, bulkAddIdeas, updateItem, deleteItem, setOnNewTelegramIdea } = useContent();
  const { settings, upsertSetting, deleteSetting, resetTelegramToken } = useSettings();
  const { files, loading: filesLoading, addFile, deleteFile } = useFiles();

  const showToast = useCallback((message: string) => {
    setToastMsg(message);
    setToastShow(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 2800);
  }, []);

  // 9Router Gateway Online probe
  const [isNineRouterOnline, setIsNineRouterOnline] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const probeGateway = async () => {
      try {
        const ep = normalizeGatewayEndpoint(settings.custom_gateway_endpoint);
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 4500);
        const headers: Record<string, string> = {};
        if (settings.custom_gateway_api_key?.trim()) {
          headers.Authorization = `Bearer ${settings.custom_gateway_api_key.trim()}`;
        }
        const res = await fetch(`${ep}/models`, {
          headers,
          signal: controller.signal,
        });
        clearTimeout(t);
        if (isMounted) setIsNineRouterOnline(res.ok);
      } catch {
        if (isMounted) setIsNineRouterOnline(false);
      }
    };
    probeGateway();
    const interval = setInterval(probeGateway, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [settings.custom_gateway_endpoint, settings.custom_gateway_api_key]);

  // Daftarkan callback untuk notifikasi realtime ide baru dari Telegram Bot
  useEffect(() => {
    setOnNewTelegramIdea((count: number) => {
      showToast(`${count} ide baru baru saja masuk dari Telegram 🤖`);
    });
    return () => {
      setOnNewTelegramIdea(undefined);
    };
  }, [setOnNewTelegramIdea, showToast]);

  // Synchronize active navigation to URL hash and localStorage
  useEffect(() => {
    syncNavigation(activeView, scriptItem, publishedItem);
  }, [activeView, scriptItem, publishedItem]);

  // Resolve pending script or published item from live items once loaded
  useEffect(() => {
    if (pendingScriptId && items.length > 0) {
      const found = items.find((i) => i.id === pendingScriptId);
      if (found) {
        setScriptItem(found);
      } else if (!loading) {
        setPendingScriptId(null);
        showToast('Naskah tidak ditemukan');
      }
    }
    if (pendingPublishedId && items.length > 0) {
      const found = items.find((i) => i.id === pendingPublishedId);
      if (found) {
        setPublishedItem(found);
      } else if (!loading) {
        setPendingPublishedId(null);
        showToast('Konten published tidak ditemukan');
      }
    }
  }, [items, loading, pendingScriptId, pendingPublishedId, showToast]);

  // Support browser Back and Forward buttons (popstate / hashchange)
  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHash(window.location.hash);
      if (parsed) {
        setActiveView(parsed.view);
        if (parsed.scriptId) {
          const found = items.find((i) => i.id === parsed.scriptId);
          if (found) {
            setScriptItem(found);
            setPendingScriptId(null);
          } else {
            setPendingScriptId(parsed.scriptId);
          }
          setPublishedItem(null);
          setPendingPublishedId(null);
        } else if (parsed.publishedId) {
          const found = items.find((i) => i.id === parsed.publishedId);
          if (found) {
            setPublishedItem(found);
            setPendingPublishedId(null);
          } else {
            setPendingPublishedId(parsed.publishedId);
          }
          setScriptItem(null);
          setPendingScriptId(null);
        } else {
          setScriptItem(null);
          setPublishedItem(null);
          setPendingScriptId(null);
          setPendingPublishedId(null);
        }
      } else if (!window.location.hash || window.location.hash === '#/') {
        setActiveView('overview');
        setScriptItem(null);
        setPublishedItem(null);
        setPendingScriptId(null);
        setPendingPublishedId(null);
      }
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [items]);

  const handleNavigate = (view: ViewKey) => {
    setActiveView(view);
    setScriptItem(null);
    setPublishedItem(null);
    setPendingScriptId(null);
    setPendingPublishedId(null);
    setSidebarOpen(false);
  };

  const handleViewScript = (item: ContentItem) => {
    const freshItem = items.find((i) => i.id === item.id) || item;
    setScriptItem(freshItem);
    setPendingScriptId(freshItem.id);
    setPublishedItem(null);
    setPendingPublishedId(null);
  };

  const handleViewPublished = (item: ContentItem) => {
    setPublishedItem(item);
    setPendingPublishedId(item.id);
    setScriptItem(null);
    setPendingScriptId(null);
  };

  const handleBackFromScript = () => {
    setScriptItem(null);
    setPendingScriptId(null);
  };

  const handleBackFromPublished = () => {
    setPublishedItem(null);
    setPendingPublishedId(null);
  };

  const handleUpdateItem = async (
    id: string,
    updates: Partial<ContentItem>,
    options?: { silent?: boolean; immediate?: boolean }
  ): Promise<ContentItem> => {
    const res = await updateItem(id, updates, options);
    if (!options?.silent) {
      if (scriptItem && scriptItem.id === id) {
        const updated = { ...scriptItem, ...updates, ...res };
        setScriptItem(updated);
        try {
          localStorage.setItem(STORAGE_KEY_CACHED_SCRIPT, JSON.stringify(updated));
        } catch {
          /* ignore localStorage quota errors */
        }
      }
      const isTargetPublished = (publishedItem && publishedItem.id === id) || pendingPublishedId === id;
      if (isTargetPublished) {
        const baseItem = (publishedItem && publishedItem.id === id) ? publishedItem : (items.find((i) => i.id === id) || res);
        const updated = { ...baseItem, ...updates, ...res };
        if (updates.status && updates.status !== 'Published') {
          // Jika status diubah/direvert dari Published ke alur produksi, transisikan ke ScriptDetail
          const targetView: ViewKey = (updates.status === 'Researching' || updates.status === 'Idea' || updates.status === 'Validating') ? 'research' : 'scripts';
          setActiveView(targetView);
          setPublishedItem(null);
          setPendingPublishedId(null);
          setScriptItem(updated);
          setPendingScriptId(updated.id);
          try {
            localStorage.removeItem(STORAGE_KEY_PUBLISHED_ID);
            localStorage.removeItem(STORAGE_KEY_CACHED_PUBLISHED);
            localStorage.setItem(STORAGE_KEY_SCRIPT_ID, updated.id);
            localStorage.setItem(STORAGE_KEY_CACHED_SCRIPT, JSON.stringify(updated));
            window.location.hash = `#/script/${updated.id}`;
          } catch {
            /* ignore localStorage quota errors */
          }
        } else {
          setPublishedItem(updated);
          try {
            localStorage.setItem(STORAGE_KEY_CACHED_PUBLISHED, JSON.stringify(updated));
          } catch {
            /* ignore localStorage quota errors */
          }
        }
      }
    } else {
      // Pembaruan senyap: perbarui cache localStorage tanpa memicu re-render root App.tsx
      try {
        const cached = localStorage.getItem(STORAGE_KEY_CACHED_SCRIPT);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.id === id) {
            localStorage.setItem(STORAGE_KEY_CACHED_SCRIPT, JSON.stringify({ ...parsed, ...updates, ...res }));
          }
        }
      } catch {
        // ignore
      }
    }
    return res;
  };

  const handleAddIdea = async (data: {
    title: string;
    source: ContentSource;
    category: string;
    research_text: string | null;
    status?: ContentStatus;
    telegram_message_id?: number | null;
    telegram_chat_id?: string | null;
    telegram_sender_username?: string | null;
  }) => {
    try {
      startActivity('Idea Management Log', editItem ? `Memperbarui ide: "${data.title.slice(0, 35)}..."` : `Mendaftarkan ide baru: "${data.title.slice(0, 35)}..."`);
      addLog(`Menetapkan pilar kategori: ${data.category || 'Umum'}...`, 50);
      if (editItem) {
        await handleUpdateItem(editItem.id, data);
        finishActivity('Ide berhasil diperbarui dan disimpan!');
        showToast('Ide berhasil diperbarui');
      } else {
        await addIdea(data);
        finishActivity('Ide baru berhasil disimpan ke database!');
        if (activeView === 'scripts' || activeView === 'published') {
          showToast('Ide berhasil ditambahkan (lihat di tab Content Ideas)');
        } else {
          showToast('Ide berhasil disimpan');
        }
      }
      setAddIdeaOpen(false);
      setEditItem(null);
    } catch (err: unknown) {
      console.error('Add/Update idea error:', err);
      const errMsg = err instanceof Error ? err.message : (editItem ? 'Gagal memperbarui ide' : 'Gagal menyimpan ide');
      errorActivity(errMsg);
      showError('Gagal Menyimpan Ide', errMsg);
    }
  };

  const handleBulkImportIdeas = async (newIdeas: Array<{
    title: string;
    source: ContentSource;
    category: string;
    research_text: string | null;
  }>) => {
    try {
      startActivity('Bulk Import Log', `Mengimpor ${newIdeas.length} ide konten ke pipeline...`);
      const added = await bulkAddIdeas(newIdeas);
      finishActivity(`Berhasil mengimpor ${added.length} ide ke pipeline!`);
      showToast(`Berhasil mengimpor ${added.length} ide ke pipeline!`);
    } catch (err: unknown) {
      console.error('Bulk add error:', err);
      const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan saat menambahkan ide ke database.';
      errorActivity(errMsg);
      showError('Gagal Import Ide Masal', errMsg);
    }
  };

  const handleTableStatusChange = async (item: ContentItem, newStatus: ContentStatus) => {
    try {
      startActivity('Pipeline Status Log', `Mengubah status ide "${item.title.slice(0, 30)}..." ke ${newStatus}...`);
      await handleUpdateItem(item.id, { status: newStatus });
      finishActivity(`Status berhasil diperbarui menjadi ${newStatus}!`);
      showToast(`Status diubah ke ${newStatus}`);
    } catch (err: unknown) {
      console.error('Update status error:', err);
      const errMsg = err instanceof Error ? err.message : 'Gagal mengubah status item.';
      showError('Gagal Mengubah Status', errMsg);
    }
  };

  const handleImportFile = async (file: File) => {
    setImportLoading(true);
    startActivity('File Extraction Log', `Membaca berkas "${file.name}"...`);
    try {
      const fileType = file.name.split('.').pop()?.toLowerCase() || 'txt';
      addLog(`Mengekstrak isi dokumen berformat .${fileType.toUpperCase()}...`, 40);
      let extractedText = '';

      if (fileType === 'docx') {
        extractedText = await extractDocxText(file);
      } else if (['txt', 'md', 'csv', 'json'].includes(fileType)) {
        extractedText = (await file.text()).trim();
      } else {
        const extraction = await extractTextFromFile(file);
        extractedText = extraction.text;
      }

      const charCount = extractedText.length;
      const isIdentity = isChannelIdentityFile(file.name);
      addLog(`Menyimpan berkas (${(file.size / 1024).toFixed(1)} KB) dan sinkronisasi ke Supabase...`, 75);

      await addFile({
        filename: file.name,
        file_path: `/public/uploads/${file.name}`,
        file_type: fileType,
        extracted_text: extractedText,
      });

      if (isIdentity && extractedText) {
        setChannelIdentity(extractedText);
        await upsertSetting('channel_identity', extractedText);
        finishActivity(`Identitas channel Zeinity berhasil diperbarui (${charCount.toLocaleString('id-ID')} karakter)!`);
        showToast(`Identitas channel Zeinity berhasil diperbarui (${charCount.toLocaleString('id-ID')} karakter)`);
      } else if (charCount === 0) {
        addLog('Peringatan: Berkas tidak memiliki teks yang dapat diekstrak.', 100);
        showWarning(
          'Peringatan: Berkas Kosong',
          `Berkas "${file.name}" tidak memiliki teks yang dapat diekstrak oleh sistem.`,
          {
            solution: 'Pastikan berkas bukan dokumen kosong atau hasil scan gambar tanpa OCR teks.',
          }
        );
      } else {
        finishActivity(`Ekstraksi berkas selesai (${charCount.toLocaleString('id-ID')} karakter)!`);
        showToast(`File "${file.name}" berhasil diekstrak (${charCount.toLocaleString('id-ID')} karakter)`);
      }

      setImportOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengunggah file';
      errorActivity(`Gagal mengekstrak berkas: ${message}`);
      showError('Gagal Mengimpor Dokumen', message, {
        solution: 'Harap pastikan format berkas didukung (.docx, .txt, .md, atau .csv) dan tidak korup.',
      });
    } finally {
      setImportLoading(false);
    }
  };

  const handleDelete = async (item: ContentItem) => {
    try {
      startActivity('Idea Management Log', `Menghapus ide: "${item.title.slice(0, 35)}..."`);
      await deleteItem(item.id);
      finishActivity('Ide berhasil dihapus dari database.');
      showToast('Ide dihapus');
    } catch (err: unknown) {
      console.error('Delete item error:', err);
      const errMsg = err instanceof Error ? err.message : 'Gagal menghapus ide dari database.';
      errorActivity(errMsg);
      showError('Gagal Menghapus Ide', errMsg);
    }
  };

  const handleValidate = useCallback(async (item: ContentItem) => {
    if (validatingId) return;
    setValidatingId(item.id);
    await updateItem(item.id, { status: 'Validating', ai_output: 'Membuat Research Brief...' });

    const providerConfig = getProviderConfig(settings);
    const targetConfig = resolveTargetModelForTask('script', providerConfig);
    const providerLabel = targetConfig.modelVersion || getProviderLabel(targetConfig.provider);

    startActivity('AI Validation Log', `Menghubungkan ke ${providerLabel} untuk membuat Research Brief...`);

    try {
      const identityText = getChannelIdentity();

      addLog('Menyusun prompt berdasarkan identitas channel & 10 Narrative Assets...', 60);

      const promptRes = await generateResearchBriefPrompt(
        targetConfig,
        item.title,
        item.category || 'Umum',
        identityText,
        item.research_text
      );

      finishActivity('Research Brief berhasil dibuat!');

      setTimeout(async () => {
        await updateItem(item.id, {
          status: 'Researching',
          research_brief_prompt: promptRes,
          ai_output: 'Research Brief siap. Silakan salin ke AI eksternal untuk riset mendalam.',
        });
        setValidatingId(null);
        showToast('Research Brief AI selesai dibuat');
      }, 800);
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : 'Gagal memvalidasi ide.';
      const parsed = parseAIError(err);
      errorActivity('Error: ' + rawMessage);
      setValidatingId(null);
      await updateItem(item.id, { status: 'Idea', ai_output: '-' });
      showError(parsed.title, parsed.message, {
        technicalDetails: parsed.technicalDetails,
        solution: parsed.solution,
        diagnostics: parsed.diagnostics,
        actionButton: {
          label: 'Buka Settings AI',
          onClick: () => handleNavigate('settings'),
        },
      });
    }
  }, [validatingId, updateItem, showToast, settings, showError, startActivity, addLog, finishActivity, errorActivity]);

  // Close sidebar on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setAddIdeaOpen(false);
        setImportOpen(false);
        setBulkImportOpen(false);
        closeTerminal();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [closeTerminal]);

  const providers = [
    { name: 'Google Gemini', state: settings.active_provider === 'gemini' ? 'Active' : 'Available', keyMask: settings.gemini_api_key ? `AIza••••••••••${settings.gemini_api_key.slice(-3)}` : 'Not configured' },
    { name: 'OpenRouter / Groq-Llama', state: settings.active_provider === 'openrouter' ? 'Active' : 'Available', keyMask: settings.openrouter_api_key ? `sk-or-••••••••••••` : 'Not configured' },
    { name: '9Router / Custom Gateway', state: settings.active_provider === 'custom' ? 'Active' : 'Available', keyMask: settings.custom_gateway_endpoint || 'http://localhost:20128/v1' },
    { name: 'Ollama Local', state: settings.active_provider === 'ollama' ? 'Active' : 'Available', keyMask: settings.ollama_endpoint || 'http://localhost:11434' },
  ];

  const renderView = () => {
    const activeScriptItem = items.find((i) => i.id === scriptItem?.id) || scriptItem;
    const activePublishedItem = items.find((i) => i.id === publishedItem?.id) || publishedItem;

    if (pendingScriptId && !activeScriptItem && loading) {
      return (
        <main className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
          <Loader2 size={36} className="spin" style={{ color: 'var(--cyan)', marginBottom: 16 }} />
          <h3 style={{ color: '#e2edff', marginBottom: 8 }}>Memuat Workspace...</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Mengambil data konten dari database...</p>
        </main>
      );
    }

    const providerConfig = getProviderConfig(settings);

    if (activeScriptItem) {
      return (
        <ScriptDetail 
          key={activeScriptItem.id}
          item={activeScriptItem} 
          onBack={handleBackFromScript} 
          onUpdate={handleUpdateItem}
          providerConfig={providerConfig}
          identityText={getChannelIdentity()}
          onNavigateSettings={() => handleNavigate('settings')}
        />
      );
    }
    if (activePublishedItem) {
      return (
        <PublishedDetail 
          key={activePublishedItem.id}
          item={activePublishedItem} 
          onBack={handleBackFromPublished} 
          onUpdate={handleUpdateItem}
          providerConfig={providerConfig}
          onNavigateSettings={() => handleNavigate('settings')}
          onRevertToScript={(revertedItem) => {
            const targetView: ViewKey = (revertedItem.status === 'Researching' || revertedItem.status === 'Idea' || revertedItem.status === 'Validating') ? 'research' : 'scripts';
            setActiveView(targetView);
            setPublishedItem(null);
            setPendingPublishedId(null);
            setScriptItem(revertedItem);
            setPendingScriptId(revertedItem.id);
            try {
              localStorage.removeItem(STORAGE_KEY_PUBLISHED_ID);
              localStorage.removeItem(STORAGE_KEY_CACHED_PUBLISHED);
              localStorage.setItem(STORAGE_KEY_SCRIPT_ID, revertedItem.id);
              localStorage.setItem(STORAGE_KEY_CACHED_SCRIPT, JSON.stringify(revertedItem));
              window.location.hash = `#/script/${revertedItem.id}`;
            } catch {
              /* ignore localStorage quota errors */
            }
          }}
        />
      );
    }

    switch (activeView) {
      case 'overview':
        return (
          <Overview
            items={items}
            onAddIdea={() => setAddIdeaOpen(true)}
            onImportFile={() => setBulkImportOpen(true)}
            onNavigate={(v) => handleNavigate(v)}
            onViewScript={handleViewScript}
            onViewPublished={handleViewPublished}
            onEditIdea={(item) => { setEditItem(item); setAddIdeaOpen(true); }}
            onAddIdeaFromTrend={async (data) => {
              await handleAddIdea(data);
              showToast(`Ide "${data.title.slice(0, 32)}..." berhasil ditambahkan dari ${data.source}!`);
            }}
          />
        );
      case 'trends':
        return (
          <TrendRadar
            onAddIdeaFromTrend={async (data) => {
              await handleAddIdea(data);
              showToast(`Ide "${data.title.slice(0, 32)}..." berhasil ditambahkan dari ${data.source}!`);
            }}
            onNavigateSettings={() => handleNavigate('settings')}
            existingTitles={new Set(items.map((i) => i.title.toLowerCase().trim()))}
          />
        );
      case 'rss':
        return (
          <RSSReader
            onAddIdeaFromRSS={async (data) => {
              await handleAddIdea(data);
              showToast(`Ide "${data.title.slice(0, 32)}..." berhasil ditambahkan dari RSS!`);
            }}
            existingTitles={new Set(items.map((i) => i.title.toLowerCase().trim()))}
          />
        );
      case 'ideas':
        return (
          <ContentTable
            key="ideas"
            items={items}
            loading={loading}
            searchQuery={searchQuery}
            onResetSearch={() => setSearchQuery('')}
            onAddIdea={() => setAddIdeaOpen(true)}
            onImportFile={() => setBulkImportOpen(true)}
            importButtonLabel="Import Ide Masal (CSV/TXT)"
            onValidate={handleValidate}
            onViewScript={handleViewScript}
            onViewPublished={handleViewPublished}
            onEdit={(item) => { setEditItem(item); setAddIdeaOpen(true); }}
            onDelete={handleDelete}
            onStatusChange={handleTableStatusChange}
            validatingId={validatingId}
            title="Content Ideas"
            eyebrow="Pipeline Konten"
            subtitle="Semua ide dari Web dan Telegram, siap divalidasi dengan AI."
          />
        );
      case 'research':
        return (
          <ContentTable
            key="research"
            items={items.filter((i) => i.status === 'Idea' || i.status === 'Validating' || i.status === 'Researching')}
            loading={loading}
            searchQuery={searchQuery}
            onResetSearch={() => setSearchQuery('')}
            onAddIdea={() => setAddIdeaOpen(true)}
            onImportFile={() => setBulkImportOpen(true)}
            importButtonLabel="Import Ide Masal (CSV/TXT)"
            onValidate={handleValidate}
            onViewScript={handleViewScript}
            onViewPublished={handleViewPublished}
            onEdit={(item) => { setEditItem(item); setAddIdeaOpen(true); }}
            onDelete={handleDelete}
            onStatusChange={handleTableStatusChange}
            validatingId={validatingId}
            title="AI Research"
            eyebrow="Validasi & Riset AI"
            subtitle="Ide yang sedang divalidasi atau dalam proses riset AI."
            defaultTab="validation"
          />
        );
      case 'scripts':
        return (
          <ContentTable
            key="scripts"
            items={items.filter((i) => i.status === 'Scripting' || i.status === 'Thumbnailing')}
            loading={loading}
            searchQuery={searchQuery}
            onResetSearch={() => setSearchQuery('')}
            onAddIdea={() => setAddIdeaOpen(true)}
            addIdeaButtonLabel="+ Tambah Ide Baru"
            onValidate={handleValidate}
            onViewScript={handleViewScript}
            onViewPublished={handleViewPublished}
            onEdit={(item) => { setEditItem(item); setAddIdeaOpen(true); }}
            onDelete={handleDelete}
            onStatusChange={handleTableStatusChange}
            validatingId={validatingId}
            title="Scripts"
            eyebrow="Script Editor"
            subtitle="Script semi-matang dari AI, siap untuk direvisi dan diproduksi."
            defaultTab="production"
          />
        );
      case 'published':
        return (
          <ContentTable
            key="published"
            items={items.filter((i) => i.status === 'Published')}
            loading={loading}
            searchQuery={searchQuery}
            onResetSearch={() => setSearchQuery('')}
            onAddIdea={() => setAddIdeaOpen(true)}
            onValidate={handleValidate}
            onViewScript={handleViewScript}
            onViewPublished={handleViewPublished}
            onEdit={(item) => { setEditItem(item); setAddIdeaOpen(true); }}
            onDelete={handleDelete}
            onStatusChange={handleTableStatusChange}
            validatingId={validatingId}
            title="Published"
            eyebrow="Konten Live"
            subtitle="Konten yang telah dipublikasi dan performanya dipantau."
          />
        );
      case 'files':
        return (
          <FileManager
            files={files}
            loading={filesLoading}
            onImportFile={() => setImportOpen(true)}
            onDelete={async (id) => {
              const ok = await deleteFile(id);
              if (ok) {
                showToast('File berhasil dihapus');
              } else {
                showError('Gagal Menghapus File', 'Sistem tidak dapat menghapus berkas dari database.');
              }
            }}
          />
        );
      case 'analytics':
        return <Analytics items={items} />;
      case 'settings':
        return (
          <Settings
            settings={settings}
            onSave={upsertSetting}
            onDelete={deleteSetting}
            onResetTelegramToken={resetTelegramToken}
            onShowToast={showToast}
          />
        );
      default:
        return null;
    }
  };

  const isTableActive = ['ideas', 'research', 'scripts', 'published'].includes(activeView) && !scriptItem && !publishedItem;

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
  };

  return (
    <>
      <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Sidebar
          open={sidebarOpen}
          activeView={activeView}
          onNavigate={handleNavigate}
          onClose={() => setSidebarOpen(false)}
          activeProvider={settings.active_provider || 'gemini'}
          providers={providers}
        />
        <Topbar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onMenuClick={() => setSidebarOpen(true)}
          activeProvider={settings.active_provider || 'gemini'}
          searchPlaceholder={isTableActive ? "Cari ide, judul, atau sumber…" : "Cari ide (ketik untuk cari di tabel)…"}
          isSearchable={isTableActive}
          isGatewayOnline={(() => {
            const provider = settings.active_provider || 'custom';
            if (provider === 'custom') return isNineRouterOnline && Boolean(settings.custom_gateway_endpoint?.trim());
            if (provider === 'gemini') return Boolean(settings.gemini_api_key?.trim());
            if (provider === 'openrouter') return Boolean(settings.openrouter_api_key?.trim());
            if (provider === 'ollama') return Boolean(settings.ollama_endpoint?.trim());
            return false;
          })()}
          isBotConfigured={Boolean(settings.telegram_token?.trim())}
          settings={settings}
          onSelectProvider={(p) => {
            upsertSetting('active_provider', p);
            showToast(`Provider AI aktif dialihkan ke ${getProviderLabel(p)}`);
          }}
          onSaveSetting={(k, v) => upsertSetting(k, v)}
          onNavigateSettings={() => handleNavigate('settings')}
        />
        {renderView()}
      </div>
      <AddIdeaModal
        open={addIdeaOpen}
        onClose={() => { setAddIdeaOpen(false); setEditItem(null); }}
        onAdd={handleAddIdea}
        initialData={editItem ? {
          title: editItem.title,
          source: editItem.source,
          category: editItem.category || 'Internet & Social Media Culture',
          research_text: editItem.research_text,
          status: editItem.status,
          telegram_message_id: editItem.telegram_message_id,
          telegram_chat_id: editItem.telegram_chat_id,
          telegram_sender_username: editItem.telegram_sender_username,
        } : undefined}
      />
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImportFile}
        existingFiles={files}
        isProcessing={importLoading}
      />
      <BulkImportModal
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onImport={handleBulkImportIdeas}
      />
      <Toast message={toastMsg} show={toastShow} />
    </>
  );
}
