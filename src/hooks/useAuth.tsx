import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react'; // Added useRef
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
  const mounted = useRef(true); // Use useRef to track mounted state

  const fetchUserProfile = async (userId: string) => {
    console.log('[Auth] fetchUserProfile started for userId:', userId);
    if (!mounted.current) {
      console.log('[Auth] fetchUserProfile aborted, component unmounted for userId:', userId);
      return;
    }
    try {
      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!mounted.current) return;

      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Errore nel caricamento del profilo",
          description: error.message,
          variant: "destructive",
        });
        setProfile(null); // Ensure profile is null on error
        return; 
      }

      if (!data) {
        console.log('No profile found for user:', userId);
        // Attempt to get current user's email for new profile
        const authUserResponse = await supabase.auth.getUser();
        if (!mounted.current) return;

        const userEmail = authUserResponse.data.user?.email ?? null;

        const { data: newProfileData, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: userEmail,
            role: 'employee',
            is_active: true
          })
          .select()
          .single();
        
        if (!mounted.current) return;

        if (createError) {
          console.error('Error creating profile:', createError);
          toast({
            title: "Errore nella creazione del profilo",
            description: createError.message,
            variant: "destructive",
          });
          setProfile(null); // Ensure profile is null on error
          return;
        }

        console.log('Created new profile:', newProfileData);
        if (newProfileData) { 
          const typedNewProfile: Profile = {
            ...newProfileData,
            role: newProfileData.role as 'admin' | 'employee'
          };
          setProfile(typedNewProfile);
        } else {
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
      if (mounted.current) {
        toast({
          title: "Errore nel caricamento del profilo",
          description: "Si è verificato un errore durante il caricamento del profilo",
          variant: "destructive",
        });
        setProfile(null); // Ensure profile is null on error
      }
    } finally {
      console.log('[Auth] fetchUserProfile finished for userId:', userId);
      // Loading state related to profile fetching is handled by the callers (onAuthStateChange, initializeAuth)
    }
  };

  useEffect(() => {
    mounted.current = true; // Set mounted to true when component mounts
    console.log('[Auth] useEffect started. Mounted ref:', mounted.current);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => { 
        if (!mounted.current) {
          console.log('[Auth] onAuthStateChange fired, but component unmounted (ref).');
          return;
        }
        console.log('[Auth] onAuthStateChange fired. Event:', event, 'Session User ID:', currentSession?.user?.id);
        
        setUser(currentSession?.user ?? null);
        setSession(currentSession); 

        try {
          if (currentSession?.user) {
            await fetchUserProfile(currentSession.user.id);
          } else {
            setProfile(null);
          }
        } catch (e) {
          console.error("[Auth] Error during profile processing in onAuthStateChange:", e);
          if (mounted.current) {
            setProfile(null);
          }
        } finally {
          if (mounted.current) {
             console.log('[Auth] onAuthStateChange finally: setting loading to false.');
             setLoading(false);
          }
        }
      }
    );
    console.log('[Auth] Subscribed to onAuthStateChange.');

    const initializeAuth = async () => {
      console.log('[Auth] initializeAuth started.');
      if (!mounted.current) {
        console.log('[Auth] initializeAuth aborted, component unmounted (ref).');
        setLoading(false); // Ensure loading is set to false if unmounted early
        return;
      }
      setLoading(true); // Set loading true at the beginning of initialization
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession(); 

        if (!mounted.current) {
            console.log('[Auth] initializeAuth aborted after getSession, component unmounted (ref).');
            return; // setLoading will be handled in finally
        }

        if (error) {
          console.error('[Auth] Error getting session:', error);
          setUser(null);
          setProfile(null);
          setSession(null);
          return; // setLoading will be handled in finally
        }

        console.log('[Auth] Initial session check:', initialSession?.user?.id);
        setUser(initialSession?.user ?? null);
        setSession(initialSession); 

        if (initialSession?.user) {
          await fetchUserProfile(initialSession.user.id);
        } else {
          setProfile(null); 
        }
      } catch (error) {
        console.error('[Auth] Error in initializeAuth (outer catch):', error);
        if (mounted.current) {
          setUser(null);
          setProfile(null);
          setSession(null);
        }
      } finally {
        if (mounted.current) {
          console.log('[Auth] initializeAuth finally: setting loading to false.');
          setLoading(false);
        } else {
          console.log('[Auth] initializeAuth finally: component was unmounted, not setting loading.');
        }
      }
    };

    initializeAuth().then(() => {
      if (mounted.current) console.log('[Auth] initializeAuth promise resolved.');
    }).catch(err => {
      console.error('[Auth] initializeAuth promise rejected:', err);
      if (mounted.current) {
        setLoading(false);
      }
    });

    return () => {
      console.log('[Auth] useEffect cleanup. Unsubscribing. Setting mounted.current to false.');
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []); 

  const signIn = async (email: string, password: string) => {
    if (!mounted.current) return { error: { message: 'Component unmounted' }};
    setLoading(true);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!mounted.current && !error) { 
        // If unmounted and signIn was successful, onAuthStateChange might not fire or its effects might be lost.
        // It's tricky, but for now, let onAuthStateChange handle it if still mounted.
        // If unmounted, a successful signIn might mean the user navigates away, so local state changes might be irrelevant.
        console.log('[Auth] SignIn successful but component unmounted during the process.');
        // setLoading(false) will be handled by onAuthStateChange if it still runs, or needs to be ensured if it doesn't.
        // For now, let's assume onAuthStateChange handles it.
      }


      if (error) {
        if (mounted.current) {
          toast({
            title: "Errore di accesso",
            description: error.message,
            variant: "destructive",
          });
          setLoading(false); 
        }
      } else {
        if (mounted.current) {
          toast({
            title: "Accesso effettuato",
            description: "Benvenuto nel sistema!",
          });
          // setLoading will be handled by onAuthStateChange
        }
      }
      return { error };
    } catch (error: any) {
      console.error('Sign in error (outer catch):', error);
      if (mounted.current) {
        toast({
          title: "Errore di accesso",
          description: error.message || "Si è verificato un errore imprevisto.",
          variant: "destructive",
        });
        setLoading(false);
      }
      return { error };
    }
    // No finally setLoading(false) here for the signIn function itself, 
    // as onAuthStateChange is the primary driver for loading state post-auth event.
  };

  const signOut = async () => {
    if (!mounted.current) {
        console.log('[Auth] signOut called but component unmounted.');
        return;
    }
    // setLoading(true); // Optional: can make UI feel more responsive during sign-out
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out from Supabase:', error);
        if (mounted.current) {
          toast({
            title: "Errore di disconnessione",
            description: error.message,
            variant: "destructive",
          });
          // If sign out fails, onAuthStateChange might not fire as expected.
          // We might not want to clear local state if Supabase signout failed.
          // However, loading should be false.
          setLoading(false); 
        }
      } else {
         if (mounted.current) {
            toast({
              title: "Disconnesso",
              description: "Alla prossima!",
            });
            // onAuthStateChange will handle clearing user, profile, session and setting loading state.
            // If we want immediate feedback and not wait for onAuthStateChange:
            // setUser(null);
            // setProfile(null);
            // setSession(null);
            // setLoading(false); // If not relying on onAuthStateChange for this.
         }
      }
    } catch (e: any) {
      console.error('Exception during sign out process:', e);
      if (mounted.current) {
        toast({
          title: "Errore imprevisto durante la disconnessione",
          description: e.message || "Si è verificato un errore sconosciuto.",
          variant: "destructive",
        });
        // Clear local state on exception as well
        setUser(null);
        setProfile(null);
        setSession(null);
        setLoading(false);
      }
    } 
    // No finally setLoading(false) here as onAuthStateChange is the source of truth for loading post-signout.
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
