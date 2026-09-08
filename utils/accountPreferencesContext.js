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
  readGuestAccountPreferencesWithThemeRollout,
  sanitizeAccountPreferences,
  USER_PREFERENCES_COLUMNS,
  USER_PREFERENCES_TABLE,
  writeGuestAccountPreferences
} from './accountPreferences.js';
import {
  getAccountPreferencesRevision,
  shouldApplyAccountPreferencesRow,
  subscribeToAccountPreferenceChanges
} from './accountPreferenceSync.js';
import { useSupabaseAuth } from './supabaseAuthContext.js';

const defaultPreferences = createDefaultAccountPreferences();

const AccountPreferencesContext = createContext({
  themeKey: defaultPreferences.themeKey,
  displayMode: defaultPreferences.displayMode,
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
  const latestPreferencesRevisionRef = useRef(0);
  const pendingPreferencesRef = useRef(null);
  const flushPromiseRef = useRef(null);

  useEffect(() => {
    latestPreferencesRef.current = preferences;
  }, [preferences]);

  const applySyncedPreferences = useCallback((row) => {
    if (
      !shouldApplyAccountPreferencesRow(
        row,
        latestPreferencesRevisionRef.current
      )
    ) {
      return false;
    }

    const nextPreferences = sanitizeAccountPreferences(row || {});
    latestPreferencesRevisionRef.current = getAccountPreferencesRevision(row);
    latestPreferencesRef.current = nextPreferences;
    setPreferences(nextPreferences);
    return true;
  }, []);

  useEffect(() => {
    let isMounted = true;

    pendingPreferencesRef.current = null;
    flushPromiseRef.current = null;
    latestPreferencesRevisionRef.current = 0;

    if (isAuthLoading) {
      setIsLoadingPreferences(true);
      return () => {
        isMounted = false;
      };
    }

    if (!client || !userId) {
      const guestPreferences = readGuestAccountPreferencesWithThemeRollout();
      latestPreferencesRef.current = guestPreferences;
      setPreferences(guestPreferences);
      setIsLoadingPreferences(false);
      return () => {
        isMounted = false;
      };
    }

    setIsLoadingPreferences(true);

    const unsubscribeFromPreferenceChanges =
      subscribeToAccountPreferenceChanges(client, userId, (incomingRow) => {
        if (!isMounted) {
          return;
        }

        applySyncedPreferences(incomingRow);
      });

    const loadPreferences = async () => {
      const { data, error } = await client
        .from(USER_PREFERENCES_TABLE)
        .select(USER_PREFERENCES_COLUMNS)
        .eq('user_id', userId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error('Failed to load account preferences.', error);
        if (latestPreferencesRevisionRef.current === 0) {
          const defaultPreferences = createDefaultAccountPreferences();
          latestPreferencesRef.current = defaultPreferences;
          setPreferences(defaultPreferences);
        }
        setIsLoadingPreferences(false);
        return;
      }

      if (data) {
        applySyncedPreferences(data);
        setIsLoadingPreferences(false);
        return;
      }

      const guestPreferences = readGuestAccountPreferencesWithThemeRollout();
      const guestRow = buildUserPreferencesRow(userId, guestPreferences);
      const { data: createdRow, error: createError } = await client
        .from(USER_PREFERENCES_TABLE)
        .upsert(guestRow, { onConflict: 'user_id' })
        .select(USER_PREFERENCES_COLUMNS)
        .single();

      if (!isMounted) {
        return;
      }

      if (createError) {
        console.error('Failed to create account preferences.', createError);
        latestPreferencesRevisionRef.current =
          getAccountPreferencesRevision(guestRow);
        latestPreferencesRef.current = guestPreferences;
        setPreferences(guestPreferences);
        setIsLoadingPreferences(false);
        return;
      }

      applySyncedPreferences(createdRow || guestRow);
      setIsLoadingPreferences(false);
    };

    void loadPreferences();

    return () => {
      isMounted = false;
      unsubscribeFromPreferenceChanges();
    };
  }, [applySyncedPreferences, client, isAuthLoading, userId]);

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
          .upsert(snapshot, {
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
        writeGuestAccountPreferences(nextPreferences);
        return { error: null };
      }

      const nextRow = buildUserPreferencesRow(userId, nextPreferences);
      latestPreferencesRevisionRef.current = Math.max(
        latestPreferencesRevisionRef.current,
        getAccountPreferencesRevision(nextRow)
      );
      pendingPreferencesRef.current = nextRow;

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
      displayMode: preferences.displayMode,
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
