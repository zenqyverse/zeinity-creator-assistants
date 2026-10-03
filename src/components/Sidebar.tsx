import {
  LayoutDashboard,
  Lightbulb,
  Sparkles,
  FileText,
  CheckCircle,
  FolderOpen,
  BarChart3,
  Settings,
  X,
  Flame,
  Rss,
  Terminal as TerminalIcon,
  Bot,
} from 'lucide-react';
import type { ViewKey } from '@/types';
import { useTerminal } from './Terminal';
import zeinityLogo from '@/assets/zeinity-logo.png';

interface SidebarProps {
  open: boolean;
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
  onClose: () => void;
  activeProvider: string;
  providers: { name: string; state: string; keyMask: string }[];
  isBotConfigured?: boolean;
}

const navItems: { key: ViewKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'ideas', label: 'Content Ideas', icon: Lightbulb },
  { key: 'research', label: 'AI Research', icon: Sparkles },
  { key: 'scripts', label: 'Scripts', icon: FileText },
  { key: 'published', label: 'Published', icon: CheckCircle },
  { key: 'trends', label: 'Radar Tren', icon: Flame },
  { key: 'rss', label: 'RSS Reader', icon: Rss },
  { key: 'files', label: 'File Manager', icon: FolderOpen },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({
  open,
  activeView,
  onNavigate,
  onClose,
  activeProvider,
  providers,
  isBotConfigured = false,
}: SidebarProps) {
  const { isOpen: isTerminalOpen, openTerminal, closeTerminal, status: terminalStatus } = useTerminal();

  return (
    <>
      <div
        className={`sidebar-backdrop ${open ? 'sidebar-open' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar glass ${open ? 'sidebar-open' : ''}`} aria-label="Navigasi utama">
        <div className="sidebar-header">
          <div className="brand">
            <img src={zeinityLogo} alt="Zeinity Logo" className="brand-mark" />
            <strong className="brand-name">ZEINITY</strong>
          </div>
          <button className="icon-btn sidebar-close-btn" type="button" aria-label="Tutup navigasi" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <nav className="nav-list" aria-label="Menu dashboard">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={`nav-item ${activeView === item.key ? 'active' : ''}`}
                type="button"
                aria-current={activeView === item.key ? 'page' : undefined}
                onClick={() => onNavigate(item.key)}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Account Profile in Drawer */}
        <div className="sidebar-user-card" aria-label="Profil Pengguna">
          <div className="avatar user-avatar" role="img" aria-label="Profil Pengguna: Zeinity Admin">
            ZA
          </div>
          <div className="sidebar-user-info">
            <strong className="sidebar-user-name">Zeinity Admin</strong>
            <span className="sidebar-user-role">Sesi Lokal Aktif</span>
          </div>
        </div>

        {/* Mobile / Drawer System Utilities: Terminal & Bot Telegram */}
        <section className="sidebar-system-tools" aria-label="Alat & Status Sistem">
          <div className="sidebar-tools-header">
            <span>SISTEM & KONSOL</span>
          </div>

          <button
            type="button"
            className={`sidebar-tool-item ${isTerminalOpen ? 'active' : ''}`}
            onClick={() => {
              if (isTerminalOpen) {
                closeTerminal();
              } else {
                openTerminal();
              }
              onClose();
            }}
            aria-label="Alihkan Log Terminal Aktivitas"
          >
            <div className="sidebar-tool-left">
              <TerminalIcon size={16} />
              <span>Log Terminal Aktivitas</span>
            </div>
            {terminalStatus === 'LIVE' ? (
              <span className="sidebar-tool-status live">
                <span className="dot" /> LIVE
              </span>
            ) : (
              <span className="sidebar-tool-status">
                {isTerminalOpen ? 'Aktif' : 'Buka'}
              </span>
            )}
          </button>

          <button
            type="button"
            className="sidebar-tool-item"
            onClick={() => {
              onNavigate('settings');
              onClose();
            }}
            aria-label={`Status Bot Telegram: ${isBotConfigured ? 'Terhubung Online' : 'Belum Dikonfigurasi'}`}
          >
            <div className="sidebar-tool-left">
              <Bot size={16} />
              <span>Bot Telegram</span>
            </div>
            <span className={`sidebar-tool-status ${isBotConfigured ? 'online' : 'offline'}`}>
              <span className="dot" />
              {isBotConfigured ? 'Online' : 'Belum Setup'}
            </span>
          </button>
        </section>

        <section className="provider-panel" aria-labelledby="provider-title">
          <h3 id="provider-title" title={`Active: ${activeProvider}`}>AI Provider Gateway</h3>
          {providers.map((p) => (
            <div key={p.name} className="provider">
              <div className="provider-line">
                <span>{p.name}</span>
                <span className={`provider-state ${p.state === 'Active' ? '' : 'available'}`}>
                  {p.state}
                </span>
              </div>
              <div className="key-mask">{p.keyMask}</div>
            </div>
          ))}
          <p className="provider-note">Keys stored securely in Settings</p>
        </section>
      </aside>
    </>
  );
}
