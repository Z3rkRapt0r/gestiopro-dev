
import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: 'admin' | 'employee';
  department: string | null;
  hire_date: string | null;
  employee_code: string | null;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Ref per sapere se il componente è montato
  const mounted = useRef(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('[useAuth] Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[useAuth] Error fetching profile:', error);
        toast({
          title: "Errore nel caricamento del profilo",
          description: error.message,
          variant: "destructive",
        });
        setProfile(null);
        return;
      }

      if (!data) {
        console.log('[useAuth] No profile found for user:', userId);
        setProfile(null);
        return;
      }

      const typedProfile: Profile = {
        ...data,
        role: data.role as 'admin' | 'employee'
      };
      setProfile(typedProfile);
      console.log('[useAuth] Profile set successfully:', typedProfile);
    } catch (error) {
      console.error('[useAuth] Error fetching user profile:', error);
      setProfile(null);
      toast({
        title: "Errore nel caricamento del profilo",
        description: "Si è verificato un errore durante il caricamento del profilo",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    mounted.current = true;
    console.log('[useAuth] useEffect started. Mounted ref:', mounted.current);

    // Setup auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        console.log('[useAuth] onAuthStateChange fired. Event:', _event, 'Session User ID:', newSession?.user?.id);
        if (!mounted.current) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        setLoading(true);
        if (newSession?.user) {
          // Defer fetchUserProfile to avoid possible state update issues inside callback
          setTimeout(async () => {
            if (!mounted.current) return;
            await fetchUserProfile(newSession.user!.id);
            if (mounted.current) setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Initial session check
    const initializeAuth = async () => {
      console.log('[useAuth] initializeAuth started.');
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[useAuth] Error getting session:', error);
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        console.log('[useAuth] Initial session check:', currentSession?.user?.id);
        if (!mounted.current) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          setLoading(true);
          await fetchUserProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('[useAuth] Error initializing auth:', error);
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
        console.log('[useAuth] initializeAuth finally: setting loading to false.');
      }
      console.log('[useAuth] initializeAuth promise resolved.');
    };

    initializeAuth();

    console.log('[useAuth] Subscribed to onAuthStateChange.');

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };

  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Errore di accesso",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Accesso effettuato",
          description: "Benvenuto nel sistema!",
        });
      }
      if (error) setLoading(false);
      return { error };
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        title: "Errore di accesso",
        description: error.message || "Si è verificato un errore imprevisto.",
        variant: "destructive",
      });
      setLoading(false);
      return { error };
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      // Clear local state first to prevent UI flickering
      setUser(null);
      setProfile(null);
      setSession(null);

      // Attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      // Even if there's an error (like session missing), we still consider it a successful logout
      // since the local state has been cleared
      if (error) {
        console.warn('[useAuth] Warning during sign out (but continuing):', error.message);
        // Only show error if it's not about missing session
        if (!error.message.includes('session') && !error.message.includes('Session')) {
          toast({
            title: "Avviso",
            description: "Disconnessione completata localmente",
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Disconnesso",
          description: "Alla prossima!",
        });
      }
    } catch (e: any) {
      console.error('[useAuth] Exception during sign out process:', e);
      // Clear state anyway since we want to log out regardless
      setUser(null);
      setProfile(null);
      setSession(null);
      
      toast({
        title: "Disconnesso",
        description: "Disconnessione completata",
      });
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
