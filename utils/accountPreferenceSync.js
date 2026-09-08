import { USER_PREFERENCES_TABLE } from './accountPreferences.js';

export function getAccountPreferencesRevision(input = {}) {
  const revision = Date.parse(input.updatedAt ?? input.updated_at ?? '');
  return Number.isFinite(revision) ? revision : 0;
}

export function shouldApplyAccountPreferencesRow(
  incomingRow,
  latestRevision = 0
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
