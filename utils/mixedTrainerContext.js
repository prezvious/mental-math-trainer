import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { DEFAULT_MIXED_SETTINGS, sanitizeMixedSettings } from './mixedDifficulty.js';
import {
  buildMixedPreferencesRow,
  MIXED_PREFERENCES_COLUMNS,
  MIXED_PREFERENCES_TABLE,
  readGuestMixedPreferences,
  sanitizeMixedPreferences,
  writeGuestMixedPreferences
} from './mixedTrainerPreferences.js';
import { useSupabaseAuth } from './supabaseAuthContext.js';

const MixedTrainerContext = createContext({
  mixedSettings: DEFAULT_MIXED_SETTINGS,
  isLoadingMixedSettings: false,
  upsertMixedSettings: async () => ({ error: null })
});

export function MixedTrainerProvider({ children }) {
  const { client, user, isLoading: isAuthLoading } = useSupabaseAuth();
  const userId = user?.id ?? null;
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_MIXED_SETTINGS }));
  const [isLoading, setIsLoading] = useState(true);
  const latestRef = useRef(settings);
  const saveScopeRef = useRef(null);

  useEffect(() => {
    latestRef.current = settings;
  }, [settings]);

  useEffect(() => {
    let isMounted = true;
    const scope = { userId, client, pending: null, promise: null };
    saveScopeRef.current = scope;
    const cancelScope = () => {
      isMounted = false;
      if (saveScopeRef.current === scope) saveScopeRef.current = null;
    };

    if (isAuthLoading) {
      setIsLoading(true);
      return cancelScope;
    }

    if (!client || !userId) {
      const guestSettings = readGuestMixedPreferences();
      latestRef.current = guestSettings;
      setSettings(guestSettings);
      setIsLoading(false);
      return cancelScope;
    }

    setIsLoading(true);

    client
      .from(MIXED_PREFERENCES_TABLE)
      .select(MIXED_PREFERENCES_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          console.error('Failed to load mixed trainer preferences.', error);
          const defaults = { ...DEFAULT_MIXED_SETTINGS };
          latestRef.current = defaults;
          setSettings(defaults);
          setIsLoading(false);
          return;
        }

        const next = sanitizeMixedPreferences(data || {});
        latestRef.current = next;
        setSettings(next);
        setIsLoading(false);
      });

    return cancelScope;
  }, [client, isAuthLoading, userId]);

  const flushPending = useCallback(async () => {
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

        const { error } = await client
          .from(MIXED_PREFERENCES_TABLE)
          .upsert(snapshot, {
            onConflict: 'user_id'
          });

        if (saveScopeRef.current !== scope) return;
        if (error) {
          scope.pending = scope.pending || snapshot;
          throw error;
        }
      }
    })().finally(() => {
      scope.promise = null;
    });

    return scope.promise;
  }, [client, userId]);

  const upsertMixedSettings = useCallback(
    async (patch = {}) => {
      const scope = saveScopeRef.current;
      if (!scope || scope.userId !== userId || scope.client !== client) {
        return { error: new Error('The account changed before preferences could be saved.') };
      }
      const next = sanitizeMixedSettings({
        ...latestRef.current,
        ...patch
      });

      latestRef.current = next;
      setSettings(next);

      if (!client || !userId) {
        writeGuestMixedPreferences(next);
        return { error: null };
      }

      scope.pending = buildMixedPreferencesRow(userId, next);

      try {
        await flushPending();
        return { error: null };
      } catch (error) {
        console.error('Failed to save mixed trainer preferences.', error);
        return { error };
      }
    },
    [client, flushPending, userId]
  );

  const value = useMemo(
    () => ({
      mixedSettings: settings,
      isLoadingMixedSettings: isLoading,
      upsertMixedSettings
    }),
    [isLoading, settings, upsertMixedSettings]
  );

  return (
    <MixedTrainerContext.Provider value={value}>
      {children}
    </MixedTrainerContext.Provider>
  );
}

export function useMixedTrainer() {
  return useContext(MixedTrainerContext);
}
