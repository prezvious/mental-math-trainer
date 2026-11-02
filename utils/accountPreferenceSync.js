import { USER_PREFERENCES_TABLE } from './accountPreferences.js';

export function getAccountPreferencesRevision(input = {}) {
  try {
    const revision = BigInt(input.revision ?? 0);
    return revision >= 0n ? revision : 0n;
  } catch (_error) {
    return 0n;
  }
}

export function shouldApplyAccountPreferencesRow(
  incomingRow,
  latestRevision = 0n
) {
  return getAccountPreferencesRevision(incomingRow) >= latestRevision;
}

export function subscribeToAccountPreferenceChanges(
  client,
  userId,
  onPreferencesChange
) {
  if (!client || !userId || typeof onPreferencesChange !== 'function') {
    return () => {};
  }

  const channel = client
    .channel(`account-preferences:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: USER_PREFERENCES_TABLE,
        filter: `user_id=eq.${userId}`
      },
      ({ new: incomingRow }) => {
        if (incomingRow?.user_id === userId) {
          onPreferencesChange(incomingRow);
        }
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
