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
  first_login?: boolean | null; // Opzionale finché la migrazione non è eseguita
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
  const initializationComplete = useRef(false);
  const profileFetchCache = useRef<{ [key: string]: Profile }>({});
  const profileFetchInProgress = useRef<{ [key: string]: boolean }>({});

  const fetchUserProfile = async (userId: string) => {
    try {
      // Evita richieste multiple per lo stesso utente
      if (profileFetchInProgress.current[userId]) {
        console.log('[useAuth] Profile fetch already in progress for user:', userId);
        return;
      }

      // Usa la cache per evitare richieste duplicate
      if (profileFetchCache.current[userId]) {
        console.log('[useAuth] Using cached profile for user:', userId);
        setProfile(profileFetchCache.current[userId]);
        return;
      }

      profileFetchInProgress.current[userId] = true;
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
      
      // Salva in cache e imposta il profilo
      profileFetchCache.current[userId] = typedProfile;
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
    } finally {
      profileFetchInProgress.current[userId] = false;
    }
  };

  // Gestisce la visibilità della pagina per ottimizzare le performance
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !loading) {
        console.log('[useAuth] Page became visible, scheduling session check...');
        clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: currentSession }, error }) => {
            if (!error && currentSession?.user && !profile) {
              console.log('[useAuth] Refreshing profile on page visibility change');
              fetchUserProfile(currentSession.user.id);
            }
          });
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(visibilityTimeout);
    };
  }, [user, loading, profile]);

  useEffect(() => {
    let isSubscribed = true;
    console.log('[useAuth] Starting auth initialization');

    const initializeAuth = async () => {
      try {
        console.log('[useAuth] Getting initial session...');
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[useAuth] Error getting initial session:', error);
        }
        
        if (!isSubscribed) return;
        
        console.log('[useAuth] Initial session found:', initialSession?.user?.id || 'No session');
        
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        if (initialSession?.user) {
          await fetchUserProfile(initialSession.user.id);
        } else {
          setProfile(null);
        }
        
        initializationComplete.current = true;
        setLoading(false);
        console.log('[useAuth] Initialization complete');
      } catch (error) {
        console.error('[useAuth] Error during initialization:', error);
        if (isSubscribed) {
          setSession(null);
          setUser(null);
          setProfile(null);
          initializationComplete.current = true;
          setLoading(false);
        }
      }
    };

    // Set up auth state change listener con debouncing migliorato
    let authTimeout: NodeJS.Timeout;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[useAuth] Auth state change:', event, newSession?.user?.id || 'No session');
        
        // Ignora eventi durante l'inizializzazione
        if (!initializationComplete.current) {
          console.log('[useAuth] Ignoring auth event during initialization');
          return;
        }
        
        if (!isSubscribed) return;

        // Debounce più lungo per evitare aggiornamenti multipli rapidi
        clearTimeout(authTimeout);
        
        authTimeout = setTimeout(async () => {
          setSession(newSession);
          setUser(newSession?.user ?? null);

          if (newSession?.user) {
            await fetchUserProfile(newSession.user.id);
          } else {
            setProfile(null);
            // Pulisci la cache quando l'utente si disconnette
            profileFetchCache.current = {};
            profileFetchInProgress.current = {};
          }
          
          if (loading) {
            setLoading(false);
          }
        }, 300);
      }
    );

    // Avvia l'inizializzazione
    initializeAuth();

    return () => {
      isSubscribed = false;
      clearTimeout(authTimeout);
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
      console.log('[useAuth] Starting sign out process');
      
      // Clear local state immediately
      setUser(null);
      setProfile(null);
      setSession(null);
      profileFetchCache.current = {};
      profileFetchInProgress.current = {};
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.warn('[useAuth] Warning during sign out:', error.message);
      }
      
      console.log('[useAuth] Sign out completed successfully');
      
      toast({
        title: "Disconnesso",
        description: "Alla prossima!",
      });
    } catch (e: any) {
      console.error('[useAuth] Exception during sign out process:', e);
      // Clear state even on error
      setUser(null);
      setProfile(null);
      setSession(null);
      profileFetchCache.current = {};
      profileFetchInProgress.current = {};
      
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
