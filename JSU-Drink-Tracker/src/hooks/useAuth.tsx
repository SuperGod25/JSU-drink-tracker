import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: 'volunteer' | 'administrator' | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'volunteer' | 'administrator' | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user role when session changes
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const signIn = async (username: string, password: string) => {
    // First, find the user's email by username
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      const error = { message: 'Invalid username or password' };
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (error) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    // Auto-create user profile if it doesn't exist but user is authenticated
    if (data.user) {
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (!existingProfile) {
        // Create user profile as volunteer by default
        await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            username: username,
            email: profile.email,
            role: 'volunteer'
          });

        // Create user role
        await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: 'volunteer'
          });
      }
    }

    return { error };
  };

  const signUp = async (email: string, username: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          username: username
        }
      }
    });

    if (error) return { error };

    // Create user profile
    if (data.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          username: username,
          email: email,
          role: 'volunteer'
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }

      // Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          role: 'volunteer'
        });

      if (roleError) {
        console.error('Error creating role:', roleError);
      }
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserRole(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userRole,
      loading,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};