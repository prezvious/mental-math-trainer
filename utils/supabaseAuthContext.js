import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from 'utils/supabaseClient.js';

const SupabaseAuthContext = createContext({
  client: null,
  isConfigured: false,
  isLoading: true,
  session: null,
  user: null,
  signOut: async () => ({ error: null })
});

export function SupabaseAuthProvider({ children }) {
  const client = useMemo(() => getSupabaseClient(), []);
  const isConfigured = isSupabaseConfigured();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(isConfigured);

  useEffect(() => {
    if (!client) {
      setIsLoading(false);
      return undefined;
    }

    let isMounted = true;

    client.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }
      setSession(data.session ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [client]);

  const signOut = async () => {
    if (!client) {
      return { error: new Error('Supabase is not configured.') };
    }
    const { error } = await client.auth.signOut();
    if (!error) {
      setSession(null);
    }
    return { error };
  };

  const value = useMemo(
    () => ({
      client,
      isConfigured,
      isLoading,
      session,
      user: session?.user ?? null,
      signOut
    }),
    [client, isConfigured, isLoading, session]
  );

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  return useContext(SupabaseAuthContext);
}
