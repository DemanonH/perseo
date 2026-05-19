'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken } from '@/lib/api';
import { useTheme } from '@/components/ThemeProvider';

/* ── Icons ─────────────────────────────────────── */
const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);
const IconInbox = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconCampaigns = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l19-9-9 19-2-8-8-2z" />
  </svg>
);
const IconLeads = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconTemplates = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const IconWhatsApp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l1.08-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z" />
  </svg>
);
const IconSheets = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" />
  </svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconBilling = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const IconLogout = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IconSun = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const IconMoon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

/* ── Nav data ──────────────────────────────────── */
const navMain = [
  { href: '/dashboard',        label: 'Dashboard',     Icon: IconDashboard },
  { href: '/inbox',            label: 'Inbox',         Icon: IconInbox },
  { href: '/campaigns',        label: 'Campañas',      Icon: IconCampaigns },
  { href: '/leads',            label: 'Leads',         Icon: IconLeads },
];
const navTools = [
  { href: '/templates',        label: 'Templates',     Icon: IconTemplates },
  { href: '/connect-whatsapp', label: 'WhatsApp',      Icon: IconWhatsApp },
  { href: '/sheets',           label: 'Google Sheets', Icon: IconSheets },
];
const navConfig = [
  { href: '/settings',         label: 'Ajustes',       Icon: IconSettings },
];

function NavGroup({ label, items, pathname }: { label?: string; items: typeof navMain; pathname: string }) {
  return (
    <div className="mb-1">
      {label && (
        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest select-none"
          style={{ color: 'var(--text-5)' }}>
          {label}
        </p>
      )}
      {items.map(({ href, label: itemLabel, Icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
        return (
          <Link key={href} href={href}
            className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium group"
            style={{
              backgroundColor: active ? 'var(--gold-text)' : 'transparent',
              color: active ? 'var(--gold)' : 'var(--text-3)',
            }}
          >
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                style={{ backgroundColor: 'var(--gold)' }} />
            )}
            <span style={{ color: active ? 'var(--gold)' : 'var(--text-4)' }}>
              <Icon />
            </span>
            <span className="leading-none">{itemLabel}</span>
          </Link>
        );
      })}
    </div>
  );
}

/* ── Theme toggle ─────────────────────────────── */
function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={toggle}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all"
      style={{ color: 'var(--text-3)' }}
    >
      <span style={{ color: 'var(--text-4)' }}>
        {isDark ? <IconSun /> : <IconMoon />}
      </span>
      {isDark ? 'Modo claro' : 'Modo oscuro'}

      {/* Toggle pill */}
      <span className="ml-auto flex items-center">
        <span
          className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
          style={{ backgroundColor: isDark ? 'var(--border-md)' : 'var(--gold)' }}
        >
          <span
            className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
            style={{ transform: isDark ? 'translateX(2px)' : 'translateX(18px)' }}
          />
        </span>
      </span>
    </button>
  );
}

/* ── Sidebar ──────────────────────────────────── */
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  return (
    <aside
      className="w-60 min-h-screen flex flex-col shrink-0"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div className="px-4 pt-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--gold)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold leading-none tracking-tight" style={{ color: 'var(--text-1)' }}>Perseo</p>
            <p className="text-[10px] mt-0.5 leading-none" style={{ color: 'var(--text-4)' }}>Lead CRM</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-4 overflow-y-auto">
        <NavGroup items={navMain} pathname={pathname} />
        <NavGroup label="Herramientas" items={navTools} pathname={pathname} />
        <NavGroup label="Cuenta" items={navConfig} pathname={pathname} />
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 space-y-0.5" style={{ borderTop: '1px solid var(--border)' }}>
        <ThemeToggle />
        <Link href="/billing"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium"
          style={{ color: 'var(--gold)' }}
        >
          <span style={{ opacity: 0.6 }}><IconBilling /></span>
          Actualizar plan
        </Link>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium"
          style={{ color: 'var(--text-4)' }}
        >
          <IconLogout />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
