import './globals.css';
import Tracker from '@/components/Tracker';

export const metadata = { title: 'UTMeuFy', description: 'Tracking próprio para ofertas e Meta Ads' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR" data-site-id="main"><body><Tracker />{children}</body></html>;
}
