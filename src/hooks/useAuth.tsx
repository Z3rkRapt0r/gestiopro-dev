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
    console.log('[Auth] fetchUserProfile started for userId:', userId);
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
        return; // Early return on error
      }

      if (!data) {
        console.log('No profile found for user:', userId);
        const { data: newProfileData, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            // Ensure user object exists and has email before accessing, or provide fallback
            email: supabase.auth.getUser() ? (await supabase.auth.getUser()).data.user?.email : null, 
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
          return; // Early return on error
        }

        console.log('Created new profile:', newProfileData);
        if (newProfileData) { // Check if newProfileData is not null
          const typedNewProfile: Profile = {
            ...newProfileData,
            role: newProfileData.role as 'admin' | 'employee'
          };
          setProfile(typedNewProfile);
        } else {
          // This case should ideally not be reached if insert().select().single() works
          console.error('New profile data is null after creation attempt.');
          setProfile(null);
        }
        return;
      }

      console.log('Profile data received:', data);
      const typedProfile: Profile = {
        ...data,
        role: data.role as 'admin' | 'employee'
      };
      
      setProfile(typedProfile);
      console.log('Profile set successfully:', typedProfile);
    } catch (error) {
      console.error('Error fetching user profile (outer catch):', error);
      toast({
        title: "Errore nel caricamento del profilo",
        description: "Si è verificato un errore durante il caricamento del profilo",
        variant: "destructive",
      });
    } finally {
      console.log('[Auth] fetchUserProfile finished for userId:', userId);
    }
  };

  useEffect(() => {
    let mounted = true;
    console.log('[Auth] useEffect started. Mounted:', mounted);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => { // Renamed session to currentSession to avoid conflict
        if (!mounted) {
          console.log('[Auth] onAuthStateChange fired, but component unmounted.');
          return;
        }
        console.log('[Auth] onAuthStateChange fired. Event:', event, 'Session User ID:', currentSession?.user?.id);
        
        setUser(currentSession?.user ?? null);
        setSession(currentSession); // Set session here

        try {
          if (currentSession?.user) {
            await fetchUserProfile(currentSession.user.id);
          } else {
            setProfile(null);
          }
        } catch (e) {
          console.error("[Auth] Error during profile processing in onAuthStateChange:", e);
          // Potentially set profile to null or handle error state
          setProfile(null);
        } finally {
          if (mounted) {
             console.log('[Auth] onAuthStateChange finally: setting loading to false.');
             setLoading(false);
          }
        }
      }
    );
    console.log('[Auth] Subscribed to onAuthStateChange.');

    const initializeAuth = async () => {
      console.log('[Auth] initializeAuth started.');
      try {
        // setLoading(true) explicitly here if needed, though it's already true initially
        const { data: { session: initialSession }, error } = await supabase.auth.getSession(); // Renamed currentSession to initialSession

        if (!mounted) return;

        if (error) {
          console.error('[Auth] Error getting session:', error);
          setUser(null);
          setProfile(null);
          setSession(null);
          // setLoading(false) will be handled in finally
          return;
        }

        console.log('[Auth] Initial session check:', initialSession?.user?.id);
        setUser(initialSession?.user ?? null);
        setSession(initialSession); // Set session here

        if (initialSession?.user) {
          await fetchUserProfile(initialSession.user.id);
        } else {
          setProfile(null); // Ensure profile is cleared if no user
        }
      } catch (error) {
        console.error('[Auth] Error in initializeAuth (outer catch):', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setSession(null);
        }
      } finally {
        if (mounted) {
          console.log('[Auth] initializeAuth finally: setting loading to false.');
          setLoading(false);
        }
      }
    };

    initializeAuth().then(() => {
      console.log('[Auth] initializeAuth promise resolved.');
    }).catch(err => {
      console.error('[Auth] initializeAuth promise rejected:', err);
      // Ensure loading is set to false even if initializeAuth() itself rejects
      // though the finally block within initializeAuth should handle it.
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      console.log('[Auth] useEffect cleanup. Unsubscribing. Setting mounted to false.');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array is correct here.

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // onAuthStateChange will handle setting user, profile, session and loading eventually.
      // However, for immediate feedback:
      if (error) {
        toast({
          title: "Errore di accesso",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false); // Explicitly set loading false on error
      } else {
        // No need to setLoading(false) here if onAuthStateChange handles it,
        // but if onAuthStateChange is slow, user might see loading briefly.
        // For now, rely on onAuthStateChange to set loading to false after profile fetch.
        toast({
          title: "Accesso effettuato",
          description: "Benvenuto nel sistema!",
        });
        // If we want to speed up perceived load after sign-in, we could optimistically set user/session
        // and then call fetchUserProfile, then setLoading(false). But onAuthStateChange should catch up.
      }
      return { error };
    } catch (error: any) {
      console.error('Sign in error (outer catch):', error);
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
    // setLoading(true); // Not strictly necessary here as onAuthStateChange will trigger loading changes
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out from Supabase:', error);
        toast({
          title: "Errore di disconnessione",
          description: error.message,
          variant: "destructive",
        });
        // If sign out fails at Supabase, onAuthStateChange might not fire as expected.
        // We should ensure local state is cleared and loading is false.
        if (mounted) { // Check mounted, though signOut usually called when mounted
          setUser(null);
          setProfile(null);
          setSession(null);
          setLoading(false); // Ensure loading is false
        }
      } else {
        toast({
          title: "Disconnesso",
          description: "Alla prossima!",
        });
        // onAuthStateChange will handle clearing user, profile, session and setting loading state.
      }
    } catch (e: any) {
      console.error('Exception during sign out process:', e);
      toast({
        title: "Errore imprevisto durante la disconnessione",
        description: e.message || "Si è verificato un errore sconosciuto.",
        variant: "destructive",
      });
      if (mounted) {
        setUser(null);
        setProfile(null);
        setSession(null);
        setLoading(false);
      }
    } 
    // No finally setLoading(false) here as onAuthStateChange is the source of truth for loading post-signout.
    // If onAuthStateChange doesn't fire or errors, the explicit sets above handle it.
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
