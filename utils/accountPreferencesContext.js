import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  buildUserPreferencesRow,
  createDefaultAccountPreferences,
  mergeAccountPreferences,
  sanitizeAccountPreferences,
  USER_PREFERENCES_COLUMNS,
  USER_PREFERENCES_TABLE
} from './accountPreferences.js';
import { useSupabaseAuth } from './supabaseAuthContext.js';

const defaultPreferences = createDefaultAccountPreferences();

const AccountPreferencesContext = createContext({
  themeKey: defaultPreferences.themeKey,
  trainerSettings: defaultPreferences.trainerSettings,
  isLoadingPreferences: false,
  upsertPreferences: async () => ({ error: null })
});

export function AccountPreferencesProvider({ children }) {
  const { client, user, isLoading: isAuthLoading } = useSupabaseAuth();
  const userId = user?.id ?? null;
  const [preferences, setPreferences] = useState(() =>
    createDefaultAccountPreferences()
  );
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const latestPreferencesRef = useRef(preferences);
  const pendingPreferencesRef = useRef(null);
  const flushPromiseRef = useRef(null);

  useEffect(() => {
    latestPreferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    let isMounted = true;

    pendingPreferencesRef.current = null;
    flushPromiseRef.current = null;

    if (isAuthLoading) {
      setIsLoadingPreferences(true);
      return () => {
        isMounted = false;
      };
    }

    if (!client || !userId) {
      const defaultPreferences = createDefaultAccountPreferences();
      latestPreferencesRef.current = defaultPreferences;
      setPreferences(defaultPreferences);
      setIsLoadingPreferences(false);
      return () => {
        isMounted = false;
      };
    }

    setIsLoadingPreferences(true);

    client
      .from(USER_PREFERENCES_TABLE)
      .select(USER_PREFERENCES_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          console.error('Failed to load account preferences.', error);
          const defaultPreferences = createDefaultAccountPreferences();
          latestPreferencesRef.current = defaultPreferences;
          setPreferences(defaultPreferences);
          setIsLoadingPreferences(false);
          return;
        }

        const nextPreferences = sanitizeAccountPreferences(data || {});
        latestPreferencesRef.current = nextPreferences;
        setPreferences(nextPreferences);
        setIsLoadingPreferences(false);
      });

    return () => {
      isMounted = false;
    };
  }, [client, isAuthLoading, userId]);

  const flushPendingPreferences = useCallback(async () => {
    if (!client || !userId) {
      return;
    }

    if (flushPromiseRef.current) {
      return flushPromiseRef.current;
    }

    flushPromiseRef.current = (async () => {
      while (pendingPreferencesRef.current) {
        const snapshot = pendingPreferencesRef.current;
        pendingPreferencesRef.current = null;

        const { error } = await client
          .from(USER_PREFERENCES_TABLE)
          .upsert(buildUserPreferencesRow(userId, snapshot), {
            onConflict: 'user_id'
          });

        if (error) {
          pendingPreferencesRef.current = snapshot;
          throw error;
        }
      }
    })().finally(() => {
      flushPromiseRef.current = null;
    });

    return flushPromiseRef.current;
  }, [client, userId]);

  const upsertPreferences = useCallback(
    async (patch = {}) => {
      const nextPreferences = mergeAccountPreferences(
        latestPreferencesRef.current,
        patch
      );

      latestPreferencesRef.current = nextPreferences;
      setPreferences(nextPreferences);

      if (!client || !userId) {
        return { error: null };
      }

      pendingPreferencesRef.current = nextPreferences;

      try {
        await flushPendingPreferences();
        return { error: null };
      } catch (error) {
        console.error('Failed to save account preferences.', error);
        return { error };
      }
    },
    [client, flushPendingPreferences, userId]
  );

  const value = useMemo(
    () => ({
      themeKey: preferences.themeKey,
      trainerSettings: preferences.trainerSettings,
      isLoadingPreferences,
      upsertPreferences
    }),
    [isLoadingPreferences, preferences, upsertPreferences]
  );

  return (
    <AccountPreferencesContext.Provider value={value}>
      {children}
    </AccountPreferencesContext.Provider>
  );
}

export function useAccountPreferences() {
  return useContext(AccountPreferencesContext);
}
