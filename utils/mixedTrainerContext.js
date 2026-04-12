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
  const pendingRef = useRef(null);
  const flushPromiseRef = useRef(null);

  useEffect(() => {
    latestRef.current = settings;
  }, [settings]);

  useEffect(() => {
    let isMounted = true;

    pendingRef.current = null;
    flushPromiseRef.current = null;

    if (isAuthLoading) {
      setIsLoading(true);
      return () => {
        isMounted = false;
      };
    }

    if (!client || !userId) {
      const guestSettings = readGuestMixedPreferences();
      latestRef.current = guestSettings;
      setSettings(guestSettings);
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
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

    return () => {
      isMounted = false;
    };
  }, [client, isAuthLoading, userId]);

  const flushPending = useCallback(async () => {
    if (!client || !userId) {
      return;
    }

    if (flushPromiseRef.current) {
      return flushPromiseRef.current;
    }

    flushPromiseRef.current = (async () => {
      while (pendingRef.current) {
        const snapshot = pendingRef.current;
        pendingRef.current = null;

        const { error } = await client
          .from(MIXED_PREFERENCES_TABLE)
          .upsert(buildMixedPreferencesRow(userId, snapshot), {
            onConflict: 'user_id'
          });

        if (error) {
          pendingRef.current = snapshot;
          throw error;
        }
      }
    })().finally(() => {
      flushPromiseRef.current = null;
    });

    return flushPromiseRef.current;
  }, [client, userId]);

  const upsertMixedSettings = useCallback(
    async (patch = {}) => {
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

      pendingRef.current = next;

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
