'use client';

import Sidebar from '@/components/Sidebar';
import AIAssistant from '@/components/AIAssistant';
import GlobalSearch from '@/components/GlobalSearch';
import CookieConsent from '@/components/CookieConsent';
import InteractiveCanvas from '@/components/InteractiveCanvas';
import { useState, createContext, useContext } from 'react';

const SidebarContext = createContext<{ isCollapsed: boolean; setIsCollapsed: (value: boolean) => void } | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    return { isCollapsed: false, setIsCollapsed: () => {} };
  }
  return context;
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 relative">
        <InteractiveCanvas />
        <Sidebar />
        <div 
          className="relative z-10 transition-all duration-300" 
          id="main-content"
          style={{ paddingLeft: isCollapsed ? '4rem' : '16rem' }}
        >
          <main className="py-6 px-4 sm:px-6 lg:px-8 relative z-10">{children}</main>
        </div>
        <AIAssistant />
        <GlobalSearch />
        <CookieConsent />
      </div>
    </SidebarContext.Provider>
  );
}

