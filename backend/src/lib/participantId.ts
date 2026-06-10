import crypto from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const PARTICIPANT_ID_LENGTH = 20;

export function normalizeParticipantId(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidParticipantId(raw: string): boolean {
  return normalizeParticipantId(raw).length === PARTICIPANT_ID_LENGTH;
}

export function generateParticipantId(prefix = 'PHD'): string {
  const normalizedPrefix = normalizeParticipantId(prefix).slice(0, 10) || 'PHD';
  const bodyLength = Math.max(PARTICIPANT_ID_LENGTH - normalizedPrefix.length, 0);
  const bytes = crypto.randomBytes(bodyLength);

  let id = normalizedPrefix;
  for (let index = 0; index < bodyLength; index += 1) {
    id += ALPHABET[bytes[index] % ALPHABET.length];
  }

  return id.slice(0, PARTICIPANT_ID_LENGTH);
}
