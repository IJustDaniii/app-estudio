type Entry = { attempts: number; resetAt: number };
const attempts = new Map<string, Entry>();

export function allowLoginAttempt(key: string, now = Date.now()) {
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { attempts: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (current.attempts >= 8) return false;
  current.attempts += 1;
  return true;
}

export function clearLoginAttempts(key: string) {
  attempts.delete(key);
}

