import { Menu, Search, Terminal as TerminalIcon, Bot } from 'lucide-react';
import { useTerminal } from './Terminal';

interface TopbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onMenuClick: () => void;
  isGatewayOnline?: boolean;
  activeProvider?: 'gemini' | 'openrouter' | 'ollama' | string;
  searchPlaceholder?: string;
  isSearchable?: boolean;
  /** Bot Telegram terkonfigurasi dan token tersimpan di localStorage */
  isBotConfigured?: boolean;
}

export default function Topbar({
  searchQuery,
  onSearchChange,
  onMenuClick,
  isGatewayOnline = true,
  activeProvider = 'gemini',
  searchPlaceholder,
  isSearchable,
  isBotConfigured = false,
}: TopbarProps) {
  const { isOpen, openTerminal, closeTerminal, status } = useTerminal();

  const providerLabel =
    activeProvider === 'openrouter'
      ? 'OpenRouter'
      : activeProvider === 'ollama'
      ? 'Ollama'
      : activeProvider === 'gemini'
      ? 'Gemini'
      : activeProvider ? (activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1)) : 'Gemini';

  const statusText = isGatewayOnline
    ? `AI Gateway (${providerLabel}) online`
    : activeProvider === 'ollama'
    ? 'Ollama offline (Endpoint belum terhubung)'
    : `${providerLabel} offline (API Key belum diisi)`;

  return (
    <header className="topbar glass">
      <button className="icon-btn" type="button" aria-label="Buka navigasi" onClick={onMenuClick}>
        <Menu size={19} />
      </button>
      <div className="brand">
        <span className="brand-mark" />
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
      <div className="gateway-status" style={{ color: isGatewayOnline ? '#b9fbd9' : '#fde68a' }}>
        <span
          className="online-dot"
          style={isGatewayOnline ? undefined : { background: 'var(--amber)', boxShadow: '0 0 12px var(--amber)' }}
        />
        {statusText}
      </div>
      <div
        className={`bot-status-dot${isBotConfigured ? ' online' : ''}`}
        title={isBotConfigured ? 'Bot Telegram terhubung — token tersimpan & terverifikasi' : 'Bot Telegram belum dikonfigurasi — buka Settings untuk memasukkan token'}
        aria-label={isBotConfigured ? 'Status bot Telegram: online' : 'Status bot Telegram: belum dikonfigurasi'}
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
