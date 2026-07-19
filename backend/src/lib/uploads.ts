import path from 'path';
import { mkdirSync } from 'fs';

/** Directory where admin-uploaded lesson files (PDFs) are stored. Backed by a
 *  Docker named volume (uploads_data) so files survive image rebuilds. */
export const uploadsDir = path.resolve(process.cwd(), 'uploads');

export function ensureUploadsDir() {
  try {
    mkdirSync(uploadsDir, { recursive: true });
  } catch {
    /* directory already exists */
  }
}
