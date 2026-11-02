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
  interfaceStyle: defaultPreferences.interfaceStyle,
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
  const latestPreferencesRevisionRef = useRef(0n);
  const saveScopeRef = useRef(null);

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

    latestPreferencesRevisionRef.current = getAccountPreferencesRevision(row);
    const scope = saveScopeRef.current;
    if (!scope) return false;
    scope.serverRow = row;
    if (scope.pending || scope.inFlight) return true;

    const nextPreferences = sanitizeAccountPreferences(row || {});
    latestPreferencesRef.current = nextPreferences;
    setPreferences(nextPreferences);
    return true;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const scope = { userId, client, pending: null, promise: null, inFlight: false, serverRow: null };
    saveScopeRef.current = scope;
    latestPreferencesRevisionRef.current = 0n;
    const cancelScope = () => {
      isMounted = false;
      if (saveScopeRef.current === scope) saveScopeRef.current = null;
    };

    if (isAuthLoading) {
      setIsLoadingPreferences(true);
      return cancelScope;
    }

    if (!client || !userId) {
      const guestPreferences = readGuestAccountPreferencesWithThemeRollout();
      latestPreferencesRef.current = guestPreferences;
      setPreferences(guestPreferences);
      setIsLoadingPreferences(false);
      return cancelScope;
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
        if (latestPreferencesRevisionRef.current === 0n) {
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

      if (latestPreferencesRevisionRef.current > 0n) {
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
      cancelScope();
      unsubscribeFromPreferenceChanges();
    };
  }, [applySyncedPreferences, client, isAuthLoading, userId]);

  const flushPendingPreferences = useCallback(async () => {
    if (!client || !userId) {
      return;
    }

    const scope = saveScopeRef.current;
    if (!scope || scope.userId !== userId || scope.client !== client) return;
    if (scope.promise) {
      return scope.promise;
    }

    scope.promise = (async () => {
      while (saveScopeRef.current === scope && scope.pending) {
        const snapshot = scope.pending;
        scope.pending = null;
        scope.inFlight = true;

        const { data, error } = await client
          .from(USER_PREFERENCES_TABLE)
          .upsert(snapshot, {
            onConflict: 'user_id'
          })
          .select(USER_PREFERENCES_COLUMNS)
          .single();

        scope.inFlight = false;
        if (saveScopeRef.current !== scope) return;
        if (error) {
          scope.pending = scope.pending || snapshot;
          throw error;
        }
        if (data) applySyncedPreferences(data);
        if (!scope.pending && scope.serverRow) applySyncedPreferences(scope.serverRow);
      }
    })().finally(() => {
      scope.inFlight = false;
      scope.promise = null;
    });

    return scope.promise;
  }, [applySyncedPreferences, client, userId]);

  const upsertPreferences = useCallback(
    async (patch = {}) => {
      const scope = saveScopeRef.current;
      if (!scope || scope.userId !== userId || scope.client !== client) {
        return { error: new Error('The account changed before preferences could be saved.') };
      }
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
      scope.pending = nextRow;

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
      interfaceStyle: preferences.interfaceStyle,
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
