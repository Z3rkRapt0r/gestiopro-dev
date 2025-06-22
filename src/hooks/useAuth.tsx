
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
    console.log('[useAuth] useEffect started.');

    // Setup auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[useAuth] onAuthStateChange fired. Event:', event, 'Session User ID:', newSession?.user?.id);
        if (!mounted.current) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchUserProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
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
          await fetchUserProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('[useAuth] Error initializing auth:', error);
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
      console.log('[useAuth] initializeAuth completed.');
    };

    initializeAuth();

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
        setLoading(false);
      } else {
        toast({
          title: "Accesso effettuato",
          description: "Benvenuto nel sistema!",
        });
        // Non settare loading a false qui, verrà gestito dall'auth state change
      }
      
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
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.warn('[useAuth] Warning during sign out:', error.message);
      }
      
      // Lo stato verrà pulito automaticamente dall'auth state change listener
      toast({
        title: "Disconnesso",
        description: "Alla prossima!",
      });
    } catch (e: any) {
      console.error('[useAuth] Exception during sign out process:', e);
      toast({
        title: "Disconnesso",
        description: "Disconnessione completata",
      });
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
