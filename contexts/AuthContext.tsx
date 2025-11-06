'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface UserCredits {
  credits: number;
  total_used: number;
  plan: 'free' | 'pro' | 'enterprise';
}

interface AuthContextType {
  user: User | null;
  credits: UserCredits | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadCredits(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadCredits(session.user.id);
      } else {
        setCredits(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadCredits = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('credits, total_used, plan')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading credits:', error);
        return;
      }

      if (data) {
        setCredits(data);
      } else {
        // Initialize credits if doesn't exist
        const { data: newCredits } = await supabase
          .from('user_credits')
          .insert({ user_id: userId, credits: 100, plan: 'free' })
          .select()
          .single();
        if (newCredits) {
          setCredits(newCredits);
        }
      }
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCredits(null);
  };

  const refreshCredits = async () => {
    if (user) {
      await loadCredits(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        credits,
        loading,
        signIn,
        signUp,
        signOut,
        refreshCredits,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

