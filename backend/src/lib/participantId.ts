import crypto from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const PARTICIPANT_ID_MIN_LENGTH = 3;
export const PARTICIPANT_ID_MAX_LENGTH = 32;
const GENERATED_ID_LENGTH = 20;

export function normalizeParticipantId(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidParticipantId(raw: string): boolean {
  const normalized = normalizeParticipantId(raw);
  return (
    normalized.length >= PARTICIPANT_ID_MIN_LENGTH &&
    normalized.length <= PARTICIPANT_ID_MAX_LENGTH
  );
}

export function generateParticipantId(prefix = 'PHD'): string {
  const normalizedPrefix = normalizeParticipantId(prefix).slice(0, 10) || 'PHD';
  const bodyLength = Math.max(GENERATED_ID_LENGTH - normalizedPrefix.length, 0);
  const bytes = crypto.randomBytes(bodyLength);

  let id = normalizedPrefix;
  for (let index = 0; index < bodyLength; index += 1) {
    id += ALPHABET[bytes[index] % ALPHABET.length];
  }

  return id.slice(0, GENERATED_ID_LENGTH);
}
