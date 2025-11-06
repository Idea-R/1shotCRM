'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Workflow, CheckSquare, Settings, Briefcase, LogOut, User, ChevronLeft, ChevronRight, Music, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AudioCanvasMode from '@/components/AudioCanvasMode';
import { useSidebar } from '@/components/MainLayout';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Pipeline', href: '/pipeline', icon: Briefcase },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, credits, signOut } = useAuth();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showAudioMode, setShowAudioMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadAvatar();
    }
  }, [user]);

  const loadAvatar = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase.storage
        .from('avatars')
        .getPublicUrl(`${user.id}/avatar.png`);
      
      // Check if image exists by trying to load it
      const img = new Image();
      img.onload = () => setAvatarUrl(data.publicUrl);
      img.onerror = () => setAvatarUrl(null);
      img.src = data.publicUrl + '?t=' + Date.now();
    } catch (error) {
      console.error('Error loading avatar:', error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    try {
      const { error } = await supabase.storage
        .from('avatars')
        .upload(`${user.id}/avatar.png`, file, {
          upsert: true,
          contentType: file.type,
        });

      if (error) throw error;
      
      await loadAvatar();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <>
      <div className={cn(
        "hidden md:flex md:flex-col md:fixed md:inset-y-0 transition-all duration-300 z-30 pointer-events-auto",
        isCollapsed ? "md:w-16" : "md:w-64"
      )}>
        <div className="flex flex-col flex-grow border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 pt-5">
          <div className="flex items-center flex-shrink-0 px-4 mb-8">
            <Workflow className="w-8 h-8 text-blue-600" />
            {!isCollapsed && (
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">1shotCRM</span>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "ml-auto p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                isCollapsed && "mx-auto"
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </div>
          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon
                      className={cn(
                        'flex-shrink-0 h-5 w-5',
                        isCollapsed ? 'mx-auto' : 'mr-3',
                        isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                      )}
                    />
                    {!isCollapsed && item.name}
                  </Link>
                );
              })}
            </nav>
            
            {/* Fun button - Audio Canvas Mode */}
            <div className="px-2 pb-2">
              <button
                onClick={() => setShowAudioMode(true)}
                className="w-full flex items-center px-3 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                title={isCollapsed ? "Audio Canvas" : undefined}
              >
                <Music className={cn("flex-shrink-0 h-5 w-5", isCollapsed ? "mx-auto" : "mr-3")} />
                {!isCollapsed && "Audio Canvas"}
              </button>
            </div>
            
            {/* User section */}
            <div className="px-2 pb-4 border-t border-gray-200 dark:border-gray-800 pt-4">
              {user ? (
                <>
                  <div className="px-3 py-2 mb-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center mb-1">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="w-8 h-8 rounded-full mr-2 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => fileInputRef.current?.click()}
                        />
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center mr-2 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                          title="Upload avatar"
                        >
                          <ImageIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </button>
                      )}
                      {!isCollapsed && (
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                          {user.email}
                        </span>
                      )}
                    </div>
                    {credits && !isCollapsed && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {credits.credits} AI credits ({credits.plan})
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <button
                    onClick={handleSignOut}
                    className={cn(
                      "w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors",
                      isCollapsed && "justify-center"
                    )}
                    title={isCollapsed ? "Sign Out" : undefined}
                  >
                    <LogOut className={cn("flex-shrink-0 h-4 w-4", isCollapsed ? "" : "mr-2")} />
                    {!isCollapsed && "Sign Out"}
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className={cn(
                    "flex items-center px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors",
                    isCollapsed && "justify-center"
                  )}
                  title={isCollapsed ? "Sign In" : undefined}
                >
                  <User className={cn("flex-shrink-0 h-4 w-4", isCollapsed ? "" : "mr-2")} />
                  {!isCollapsed && "Sign In / Sign Up"}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {showAudioMode && (
        <AudioCanvasMode onClose={() => setShowAudioMode(false)} />
      )}
    </>
  );
}

