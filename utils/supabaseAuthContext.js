import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isAdminEmail, normalizeEmail } from 'utils/adminAccess.js';
import { getSupabaseClient, isSupabaseConfigured } from 'utils/supabaseClient.js';

function areSessionsEquivalent(previousSession, nextSession) {
  if (previousSession === nextSession) {
    return true;
  }

  if (!previousSession || !nextSession) {
    return previousSession === nextSession;
  }

  return (
    previousSession.access_token === nextSession.access_token &&
    previousSession.refresh_token === nextSession.refresh_token &&
    previousSession.expires_at === nextSession.expires_at &&
    previousSession.user?.id === nextSession.user?.id &&
    previousSession.user?.updated_at === nextSession.user?.updated_at
  );
}

const SupabaseAuthContext = createContext({
  client: null,
  isConfigured: false,
  isLoading: true,
  session: null,
  userEmail: '',
  user: null,
  isAdmin: false,
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

    client.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) {
          return;
        }

        setSession((previousSession) =>
          areSessionsEquivalent(previousSession, data.session ?? null)
            ? previousSession
            : (data.session ?? null)
        );
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setSession(null);
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      });

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession((previousSession) =>
        areSessionsEquivalent(previousSession, nextSession ?? null)
          ? previousSession
          : (nextSession ?? null)
      );
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
    () => {
      const userEmail = normalizeEmail(session?.user?.email ?? '');

      return {
        client,
        isConfigured,
        isLoading,
        session,
        userEmail,
        user: session?.user ?? null,
        isAdmin: isAdminEmail(userEmail),
        signOut
      };
    },
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
