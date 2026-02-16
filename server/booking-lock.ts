/**
 * In-memory mutex for booking slot serialization.
 * Prevents race conditions where two users book the same time slot concurrently.
 * Key format: "${date}T${time}" e.g. "2026-02-17T14:00"
 */

const locks = new Map<string, Promise<void>>();

export async function withBookingLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  // Wait for any existing lock on this key
  while (locks.has(key)) {
    await locks.get(key);
  }

  let resolve: () => void;
  const lockPromise = new Promise<void>((r) => { resolve = r; });
  locks.set(key, lockPromise);

  try {
    return await fn();
  } finally {
    locks.delete(key);
    resolve!();
  }
}
