const CHALLENGE_TTL_MS = 5 * 60 * 1000;

type ChallengeRecord = {
  identifier?: string;
  expiresAt: number;
};

const store = new Map<string, ChallengeRecord>();

function cleanup() {
  const now = Date.now();
  for (const [challenge, record] of store.entries()) {
    if (record.expiresAt <= now) {
      store.delete(challenge);
    }
  }
}

export function persistChallenge(challenge: string, identifier?: string) {
  cleanup();
  store.set(challenge, {
    identifier,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
}

export function consumeChallenge(challenge: string) {
  cleanup();
  const record = store.get(challenge);
  if (!record) {
    return null;
  }
  store.delete(challenge);
  if (record.expiresAt <= Date.now()) {
    return null;
  }
  return record;
}

export function clearChallenges() {
  store.clear();
}
