import { readStorageJson, writeStorageJson } from './browserStorage.js';

// Web Locks order writes and resets across tabs; storage invalidates queued rows.
const accounts = new Map();
const buffers = new Set();

function accountState(userId) {
  if (!accounts.has(userId)) accounts.set(userId, { generation: 0, writes: new Set(), reset: null });
  return accounts.get(userId);
}

function locked(userId, mode, work) {
  const locks = typeof navigator === 'undefined' ? null : navigator.locks;
  return locks?.request
    ? locks.request(`mental-math-progress:${userId}`, { mode }, work)
    : work();
}

export function getProgressWriteGeneration(userId) {
  return JSON.stringify([
    accountState(userId).generation,
    readStorageJson(`mathtrainer:progress-reset:${userId}`)
  ]);
}

export function registerProgressBuffer(discard) {
  buffers.add(discard);
  return () => buffers.delete(discard);
}

export function withAccountProgressWrite(userId, work, generation = getProgressWriteGeneration(userId)) {
  const state = accountState(userId);
  const write = (state.reset || Promise.resolve()).then(() => {
    return locked(userId, 'shared', () => {
      // A reset in another tab may have completed while this writer waited.
      if (generation !== getProgressWriteGeneration(userId)) return;
      return work();
    });
  });
  state.writes.add(write);
  const finished = () => state.writes.delete(write);
  void write.then(finished, finished);
  return write;
}

export function resetAccountProgress(userId, work) {
  const state = accountState(userId);
  if (state.reset) return state.reset;
  state.generation += 1;
  const precedingWrites = [...state.writes];
  const durableWrites = [...buffers].map(discard => discard(userId));
  const reset = Promise.allSettled([...precedingWrites, ...durableWrites])
    .then(() => locked(userId, 'exclusive', () => {
      const resetId = globalThis.crypto?.randomUUID?.() || `${Date.now()}:${Math.random()}`;
      writeStorageJson(`mathtrainer:progress-reset:${userId}`, resetId);
      return work();
    }))
    .finally(() => { if (state.reset === reset) state.reset = null; });
  state.reset = reset;
  return reset;
}
