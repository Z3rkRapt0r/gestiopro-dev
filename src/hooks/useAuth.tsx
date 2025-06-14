import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
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

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Errore nel caricamento del profilo",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (!data) {
        console.log('No profile found for user:', userId);
        // Se il profilo non esiste, potrebbe essere un nuovo utente
        // Creiamo un profilo di default
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: user?.email || null, // user might not be set here yet if called directly
            role: 'employee',
            is_active: true
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          toast({
            title: "Errore nella creazione del profilo",
            description: createError.message,
            variant: "destructive",
          });
          return;
        }

        console.log('Created new profile:', newProfile);
        const typedNewProfile: Profile = { // Renamed to avoid conflict
          ...newProfile,
          role: newProfile.role as 'admin' | 'employee'
        };
        setProfile(typedNewProfile);
        return;
      }

      console.log('Profile data received:', data);

      // Ensure role is properly typed
      const typedProfile: Profile = { // Renamed to avoid conflict
        ...data,
        role: data.role as 'admin' | 'employee'
      };
      
      setProfile(typedProfile);
      console.log('Profile set successfully:', typedProfile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast({
        title: "Errore nel caricamento del profilo",
        description: "Si è verificato un errore durante il caricamento del profilo",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile after successful authentication or state change
          await fetchUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession(); // Renamed to currentSession
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        console.log('Initial session check:', currentSession?.user?.id);
        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Removed user from dependency array as fetchUserProfile now uses session.user.id

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
        // onAuthStateChange will handle setting user, profile, session
        // and fetching profile. It will also set loading to false.
        toast({
          title: "Accesso effettuato",
          description: "Benvenuto nel sistema!",
        });
      }
      // setLoading(false) will be handled by onAuthStateChange if successful,
      // or here if error
      if(error) setLoading(false);
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out from Supabase:', error);
        toast({
          title: "Errore di disconnessione",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Disconnesso",
          description: "Alla prossima!",
        });
        // Successful Supabase sign out. onAuthStateChange will be triggered.
      }
    } catch (e: any) {
      console.error('Exception during sign out process:', e);
      toast({
        title: "Errore imprevisto durante la disconnessione",
        description: e.message || "Si è verificato un errore sconosciuto.",
        variant: "destructive",
      });
    } finally {
      // Ensure local state is cleared regardless of Supabase call outcome.
      // onAuthStateChange will also handle this, but this provides immediate local feedback.
      setUser(null);
      setProfile(null);
      setSession(null);
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
