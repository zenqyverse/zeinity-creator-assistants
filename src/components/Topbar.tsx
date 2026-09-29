import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Menu,
  Search,
  Terminal as TerminalIcon,
  Bot,
  ChevronDown,
  Check,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { useTerminal } from './Terminal';
import type { AIProvider, NineRouterCatalog } from '@/types';
import { getProviderLabel } from '@/lib/gemini';
import zeinityLogo from '@/assets/zeinity-logo.png';

interface TopbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onMenuClick: () => void;
  isGatewayOnline?: boolean;
  activeProvider?: AIProvider | string;
  searchPlaceholder?: string;
  isSearchable?: boolean;
  /** Bot Telegram terkonfigurasi dan token tersimpan di localStorage */
  isBotConfigured?: boolean;
  settings?: Record<string, string>;
  onSelectProvider?: (provider: AIProvider) => void;
  onSaveSetting?: (key: string, value: string) => Promise<boolean> | void;
  onNavigateSettings?: () => void;
}

export default function Topbar({
  searchQuery,
  onSearchChange,
  onMenuClick,
  isGatewayOnline = true,
  activeProvider = 'custom',
  searchPlaceholder,
  isSearchable,
  isBotConfigured = false,
  settings = {},
  onSelectProvider,
  onSaveSetting,
  onNavigateSettings,
}: TopbarProps) {
  const { isOpen, openTerminal, closeTerminal, status } = useTerminal();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [dropdownOpen]);

  const providerLabel = getProviderLabel((activeProvider || 'custom') as AIProvider);

  const isComboMode = settings.custom_gateway_model_mode !== 'direct';
  const activeModelName = isComboMode
    ? (settings.custom_gateway_model_version || 'Creator-Combo')
    : (settings.custom_gateway_direct_model || 'groq/llama-3.3-70b-versatile');

  const [cachedCatalog, setCachedCatalog] = useState<NineRouterCatalog | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('zeinity_9router_catalog');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.combos)) return parsed;
      }
    } catch { /* ignore */ }
    return null;
  });

  // Re-read catalog whenever dropdown opens
  useEffect(() => {
    if (dropdownOpen && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('zeinity_9router_catalog');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.combos)) setCachedCatalog(parsed);
        }
      } catch { /* ignore */ }
    }
  }, [dropdownOpen]);

  const defaultCombos = useMemo(() => [
    { id: 'Creator-Combo', label: 'Creator-Combo', desc: '3-Tier Auto-Fallback', badge: 'Default' },
    { id: 'Jarvis_Creator', label: 'Jarvis_Creator', desc: 'Content Creator', badge: 'Creator' },
    { id: 'Jarvis_Standard', label: 'Jarvis_Standard', desc: 'Balanced Performance', badge: 'Standard' },
    { id: 'Jarvis_Analyst', label: 'Jarvis_Analyst', desc: 'Deep Reasoning', badge: 'Analyst' },
    { id: 'Jarvis_Fast', label: 'Jarvis_Fast', desc: 'Low Latency', badge: 'Fast' },
  ], []);

  const comboOptions = useMemo(() => {
    if (!cachedCatalog || !Array.isArray(cachedCatalog.combos) || cachedCatalog.combos.length === 0) {
      return defaultCombos;
    }
    const list = cachedCatalog.combos.map((id) => {
      const existing = defaultCombos.find((c) => c.id === id);
      return (
        existing || {
          id,
          label: id,
          desc: id === 'Creator-Combo' ? '3-Tier Auto-Fallback' : '9Router Combo Preset',
          badge: id === 'Creator-Combo' ? 'Default' : 'Combo',
        }
      );
    });
    if (isComboMode && activeModelName && !list.some((c) => c.id === activeModelName)) {
      list.unshift({
        id: activeModelName,
        label: activeModelName,
        desc: 'Model Terpilih',
        badge: 'Aktif',
      });
    }
    return list;
  }, [cachedCatalog, defaultCombos, isComboMode, activeModelName]);

  const defaultDirects = useMemo(() => [
    { id: 'groq/llama-3.3-70b-versatile', label: 'Llama 3.3 70B', desc: 'Groq Cloud High Speed', badge: 'Groq' },
    { id: 'google/gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash', desc: 'Google Cloud Free/Paid', badge: 'Gemini' },
    { id: 'openrouter/auto', label: 'OpenRouter Auto', desc: 'Best Free Available Router', badge: 'OpenRouter' },
    { id: 'ollama/llama3', label: 'Llama 3 8B', desc: 'Ollama 100% Offline Local', badge: 'Ollama' },
  ], []);

  const directOptions = useMemo(() => {
    if (
      !cachedCatalog ||
      !cachedCatalog.directModels ||
      Object.keys(cachedCatalog.directModels).length === 0
    ) {
      return defaultDirects;
    }
    const list: Array<{ id: string; label: string; desc: string; badge: string }> = [];
    for (const [vendor, models] of Object.entries(cachedCatalog.directModels)) {
      for (const m of models) {
        const shortName = m.includes('/') ? m.split('/').slice(1).join('/') : m;
        list.push({
          id: m,
          label: shortName,
          desc: m,
          badge: vendor,
        });
      }
    }
    if (!isComboMode && activeModelName && !list.some((d) => d.id === activeModelName)) {
      const shortName = activeModelName.includes('/')
        ? activeModelName.split('/').slice(1).join('/')
        : activeModelName;
      list.unshift({
        id: activeModelName,
        label: shortName,
        desc: activeModelName,
        badge: 'Aktif',
      });
    }
    return list.length > 0 ? list : defaultDirects;
  }, [cachedCatalog, defaultDirects, isComboMode, activeModelName]);

  return (
    <header className="topbar glass">
      <button className="icon-btn" type="button" aria-label="Buka navigasi" onClick={onMenuClick}>
        <Menu size={19} />
      </button>

      <div className="brand">
        <img src={zeinityLogo} alt="Zeinity Logo" className="brand-mark" />
        <strong className="brand-name">ZEINITY</strong>
        <span className="brand-divider" />
        <span className="product-label">Creator Assistant</span>
      </div>

      <div className="search-box">
        <Search size={17} />
        <input
          type="search"
          placeholder={searchPlaceholder || "Cari ide, judul, atau sumber…"}
          aria-label={searchPlaceholder || "Cari ide, judul, atau sumber"}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onSearchChange('');
            }
          }}
          title={isSearchable === false ? "Ketik pencarian untuk langsung membuka tabel ide konten" : undefined}
        />
      </div>

      {/* QUICK PROVIDER SELECTOR PILL & DROPDOWN */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          type="button"
          className="quick-provider-pill"
          onClick={() => setDropdownOpen((v) => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '5px 12px',
            borderRadius: 10,
            background: 'rgba(79, 232, 255, 0.08)',
            border: '1px solid rgba(79, 232, 255, 0.3)',
            color: '#e2edff',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title={
            !isGatewayOnline
              ? (activeProvider === 'ollama' || activeProvider === 'custom'
                  ? `${providerLabel}: Endpoint belum terhubung atau offline. Pastikan 9Router aktif (9router start).`
                  : `${providerLabel}: API Key belum diisi. Klik untuk mengganti provider.`)
              : `9Router Gateway aktif & online (${activeModelName}). ${providerLabel} mode ${isComboMode ? 'Combo Presets' : 'Model Spesifik'}. Klik untuk 1-klik ganti model.`
          }
        >
          <span
            className="online-dot"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isGatewayOnline ? 'var(--green)' : 'var(--red, #ef4444)',
              boxShadow: isGatewayOnline ? '0 0 8px var(--green)' : '0 0 8px var(--red, #ef4444)',
              display: 'inline-block',
            }}
          />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Zap size={14} style={{ color: 'var(--cyan)' }} />
            <strong>{activeModelName}</strong>
            <span
              style={{
                fontSize: '0.62rem',
                padding: '1px 5px',
                borderRadius: 4,
                background: isComboMode ? 'rgba(79, 232, 255, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                color: isComboMode ? 'var(--cyan)' : 'var(--purple, #a855f7)',
                fontWeight: 700,
              }}
            >
              {isComboMode ? 'ROUTER' : 'DIRECT'}
            </span>
            <span
              style={{
                fontSize: '0.66rem',
                color: isGatewayOnline ? 'var(--green)' : 'var(--red, #ef4444)',
                fontWeight: 700,
                marginLeft: 2,
              }}
            >
              {isGatewayOnline ? 'ONLINE 🟢' : 'OFFLINE 🔴'}
            </span>
          </span>
          <ChevronDown
            size={13}
            style={{
              opacity: 0.7,
              transform: dropdownOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          />
        </button>

        {dropdownOpen && (
          <div
            className="glass"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 320,
              borderRadius: 14,
              padding: 12,
              background: 'rgba(10, 20, 48, 0.96)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(79, 232, 255, 0.35)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65)',
              zIndex: 70,
            }}
          >
            <div
              style={{
                padding: '4px 8px 8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--muted)',
                letterSpacing: '0.5px',
                borderBottom: '1px solid rgba(149, 195, 255, 0.12)',
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>9ROUTER AI GATEWAY</span>
              <span style={{ color: isGatewayOnline ? 'var(--green)' : 'var(--red, #ef4444)', fontSize: '0.68rem', fontWeight: 700 }}>
                {isGatewayOnline ? 'PORT 20128 ONLINE 🟢' : 'OFFLINE 🔴'}
              </span>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => {
                  onSaveSetting?.('custom_gateway_model_mode', 'combo');
                  onSaveSetting?.('active_provider', 'custom');
                }}
                style={{
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: isComboMode ? '1px solid var(--cyan)' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: isComboMode ? 'rgba(79, 232, 255, 0.15)' : 'transparent',
                  color: isComboMode ? 'var(--cyan)' : 'var(--muted)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                ⚡ Combo Presets
              </button>
              <button
                type="button"
                onClick={() => {
                  onSaveSetting?.('custom_gateway_model_mode', 'direct');
                  onSaveSetting?.('active_provider', 'custom');
                }}
                style={{
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: !isComboMode ? '1px solid var(--purple, #a855f7)' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: !isComboMode ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                  color: !isComboMode ? 'var(--purple, #a855f7)' : 'var(--muted)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                🎯 Model Spesifik
              </button>
            </div>

            {/* Models List for 1-Click Switch */}
            <div style={{ display: 'grid', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
              {(isComboMode ? comboOptions : directOptions).map((opt) => {
                const isSelected = activeModelName === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      if (isComboMode) {
                        onSaveSetting?.('custom_gateway_model_mode', 'combo');
                        onSaveSetting?.('custom_gateway_model_version', opt.id);
                      } else {
                        onSaveSetting?.('custom_gateway_model_mode', 'direct');
                        onSaveSetting?.('custom_gateway_direct_model', opt.id);
                      }
                      onSaveSetting?.('active_provider', 'custom');
                      setDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: isSelected
                        ? '1px solid rgba(79, 232, 255, 0.4)'
                        : '1px solid transparent',
                      background: isSelected
                        ? 'rgba(79, 232, 255, 0.12)'
                        : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <Zap
                        size={14}
                        style={{ color: isSelected ? 'var(--cyan)' : 'var(--muted)', flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? 'var(--cyan)' : '#e2edff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {opt.label}
                        </div>
                        <div
                          style={{
                            fontSize: '0.66rem',
                            color: 'var(--muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {opt.desc}
                        </div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {isSelected ? (
                        <Check size={14} style={{ color: 'var(--cyan)' }} />
                      ) : (
                        <span
                          style={{
                            fontSize: '0.64rem',
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: 'rgba(255, 255, 255, 0.06)',
                            color: 'var(--muted)',
                            fontWeight: 600,
                          }}
                        >
                          {opt.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: '1px solid rgba(149, 195, 255, 0.12)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingLeft: 6,
                paddingRight: 6,
              }}
            >
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                100% 9Router Gateway
              </span>
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onNavigateSettings?.();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--cyan)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 4px',
                }}
              >
                <span>Buka Settings AI</span>
                <ExternalLink size={11} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        className={`bot-status-dot${isBotConfigured ? ' online' : ''}`}
        title={
          isBotConfigured
            ? 'Bot Telegram terhubung — token tersimpan & terverifikasi'
            : 'Bot Telegram belum dikonfigurasi — buka Settings untuk memasukkan token'
        }
        aria-label={
          isBotConfigured
            ? 'Status bot Telegram: online'
            : 'Status bot Telegram: belum dikonfigurasi'
        }
      >
        <span className="dot" />
        <Bot size={11} />
        {isBotConfigured ? 'Bot' : 'Bot —'}
      </div>

      <button
        className="icon-btn"
        type="button"
        aria-label="Alihkan Log Aktivitas"
        onClick={() => (isOpen ? closeTerminal() : openTerminal())}
        title={isOpen ? 'Tutup Log Aktivitas' : 'Buka Log Aktivitas'}
        style={{
          position: 'relative',
          width: 34,
          height: 34,
          color: isOpen ? 'var(--cyan)' : 'inherit',
          borderColor: isOpen ? 'rgba(79, 232, 255, 0.4)' : undefined,
          background: isOpen ? 'rgba(79, 232, 255, 0.1)' : undefined,
        }}
      >
        <TerminalIcon size={16} />
        {status === 'LIVE' && (
          <span
            style={{
              position: 'absolute',
              top: 5,
              right: 5,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--green)',
              boxShadow: '0 0 6px var(--green)',
            }}
          />
        )}
      </button>

      <div
        className="avatar user-avatar"
        role="img"
        tabIndex={0}
        title="Akun: Zeinity Admin (Sesi Lokal)"
        aria-label="Profil Pengguna: Zeinity Admin"
      >
        ZA
      </div>
    </header>
  );
}
