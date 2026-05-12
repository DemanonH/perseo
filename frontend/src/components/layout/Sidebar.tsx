'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken } from '@/lib/api';

const links = [
  { href: '/dashboard',        label: 'Dashboard',       icon: '◈' },
  { href: '/campaigns',        label: 'Campañas',        icon: '◎' },
  { href: '/leads',            label: 'Leads',           icon: '◉' },
  { href: '/connect-whatsapp', label: 'WhatsApp',        icon: '◍' },
  { href: '/sheets',           label: 'Google Sheets',   icon: '◫' },
  { href: '/settings',         label: 'Ajustes',         icon: '◌' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  return (
    <aside className="w-56 min-h-screen bg-[#0d0d0d] border-r border-white/5 flex flex-col shrink-0">
      <div className="px-5 py-7">
        <Link href="/dashboard">
          <span className="text-xl font-bold text-[#F5A623] tracking-tight">Perseo</span>
        </Link>
        <p className="text-[10px] text-white/25 mt-1 leading-tight">Tu base de datos de leads,<br />en automático.</p>
      </div>

      <nav className="flex-1 px-2">
        {links.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-[#F5A623]/10 text-[#F5A623]'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <span className="text-sm opacity-80">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 pb-5 pt-3 border-t border-white/5">
        <Link href="/billing"
          className="flex items-center gap-2 text-xs text-[#F5A623]/60 hover:text-[#F5A623] transition-colors mb-3">
          <span>✦</span> Actualizar plan
        </Link>
        <button onClick={handleLogout} className="w-full text-left text-xs text-white/25 hover:text-white/50 transition-colors">
          Cerrar sesión →
        </button>
      </div>
    </aside>
  );
}
