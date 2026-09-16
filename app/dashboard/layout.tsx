import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function DashboardLayout({children}:{children:React.ReactNode}) {
  return <div className="appShell">
    <aside className="sidebar">
      <Link href="/dashboard" className="brand">UTMeuFy</Link>
      <ThemeToggle />
      <nav>
        <Link href="/dashboard">Visão geral</Link>
        <Link href="/dashboard/eventos">Eventos</Link>
        <Link href="/dashboard/rastreamento">Rastreamento</Link>
        <Link href="/dashboard/integracoes">Integrações</Link>
      </nav>
      <form action="/api/auth/logout" method="post"><button className="sideLogout">Sair</button></form>
    </aside>
    <section className="appContent">{children}</section>
  </div>;
}
