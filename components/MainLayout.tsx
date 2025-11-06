import Sidebar from '@/components/Sidebar';
import AIAssistant from '@/components/AIAssistant';
import GlobalSearch from '@/components/GlobalSearch';
import CookieConsent from '@/components/CookieConsent';
import InteractiveCanvas from '@/components/InteractiveCanvas';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 relative">
      <InteractiveCanvas />
      <Sidebar />
      <div className="md:pl-64 relative z-10 transition-all duration-300" id="main-content">
        <main className="py-6 px-4 sm:px-6 lg:px-8 relative z-10">{children}</main>
      </div>
      <AIAssistant />
      <GlobalSearch />
      <CookieConsent />
    </div>
  );
}

