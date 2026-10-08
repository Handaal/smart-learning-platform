import path from 'path';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';
import AdmZip from 'adm-zip';
import { uploadsDir } from './uploads';

/** Extracted SCORM packages live under uploads/scorm/<scormId>/ and are served
 *  statically from /uploads/scorm/<scormId>/… just like uploaded PDFs. */
export const scormRootDir = path.join(uploadsDir, 'scorm');

export function ensureScormDir() {
  try {
    mkdirSync(scormRootDir, { recursive: true });
  } catch {
    /* already exists */
  }
}

export type ScormExtractResult = {
  scormId: string;
  /** Public URL of the launch file, e.g. /uploads/scorm/<id>/index.html */
  launchUrl: string;
  /** Launch path relative to the package root. */
  launchHref: string;
  title: string | null;
  scormVersion: string | null;
};

export class ScormError extends Error {}

function looksLikeZip(buffer: Buffer) {
  // ZIP local-file ("PK\x03\x04"), empty-archive ("PK\x05\x06") or spanned ("PK\x07\x08").
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  );
}

/** Extract every entry into destDir, guarding against zip-slip path traversal. */
function safeExtractAll(zip: AdmZip, destDir: string) {
  const root = path.resolve(destDir);
  for (const entry of zip.getEntries()) {
    const entryName = entry.entryName.replace(/\\/g, '/');
    if (entry.isDirectory) {
      const dir = path.resolve(root, entryName);
      if (dir === root || dir.startsWith(root + path.sep)) mkdirSync(dir, { recursive: true });
      continue;
    }
    const target = path.resolve(root, entryName);
    // Reject anything that would escape the destination directory.
    if (target !== root && !target.startsWith(root + path.sep)) continue;
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, entry.getData());
  }
}

function findManifestEntry(zip: AdmZip) {
  const matches = zip
    .getEntries()
    .filter(
      (entry) =>
        !entry.isDirectory && /(^|\/)imsmanifest\.xml$/i.test(entry.entryName.replace(/\\/g, '/')),
    );
  // Prefer the manifest closest to the archive root.
  matches.sort(
    (a, b) => a.entryName.split('/').length - b.entryName.split('/').length,
  );
  return matches[0] ?? null;
}

function parseManifest(xml: string): {
  href: string | null;
  title: string | null;
  version: string | null;
} {
  // Map every resource identifier → launch href.
  const resources: Record<string, string> = {};
  let firstResourceHref: string | null = null;
  const resourceRe = /<resource\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = resourceRe.exec(xml))) {
    const tag = match[0];
    const id = tag.match(/\bidentifier\s*=\s*"([^"]+)"/i)?.[1];
    const href = tag.match(/\bhref\s*=\s*"([^"]+)"/i)?.[1];
    if (href) {
      const normalized = href.replace(/^\.\//, '');
      if (!firstResourceHref) firstResourceHref = normalized;
      if (id) resources[id] = normalized;
    }
  }

  // The default organization's first launchable item points at a resource.
  let launchHref: string | null = null;
  const firstItemRef = xml.match(/<item\b[^>]*\bidentifierref\s*=\s*"([^"]+)"/i)?.[1];
  if (firstItemRef && resources[firstItemRef]) launchHref = resources[firstItemRef];
  if (!launchHref) launchHref = firstResourceHref;

  const title =
    xml
      .match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/<[^>]+>/g, '')
      .trim() || null;
  const version =
    xml.match(/<schemaversion[^>]*>([\s\S]*?)<\/schemaversion>/i)?.[1]?.trim() || null;

  return { href: launchHref, title, version };
}

const FALLBACK_LAUNCH_FILES = [
  'index.html',
  'index_lms.html',
  'story.html',
  'story_html5.html',
  'launch.html',
  'scormdriver/indexAPI.html',
];

/**
 * Validate and unpack a SCORM .zip package. Returns the launch URL the learner
 * iframe should load. Throws ScormError with a stable code for known problems.
 */
export function extractScormPackage(buffer: Buffer): ScormExtractResult {
  if (!looksLikeZip(buffer)) throw new ScormError('NOT_A_ZIP');

  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new ScormError('NOT_A_ZIP');
  }

  const manifest = findManifestEntry(zip);
  if (!manifest) throw new ScormError('NO_MANIFEST');

  ensureScormDir();
  const scormId = randomUUID();
  const destDir = path.join(scormRootDir, scormId);
  mkdirSync(destDir, { recursive: true });
  safeExtractAll(zip, destDir);

  const manifestRel = manifest.entryName.replace(/\\/g, '/');
  const manifestDir = manifestRel.includes('/')
    ? manifestRel.slice(0, manifestRel.lastIndexOf('/'))
    : '';

  const parsed = parseManifest(manifest.getData().toString('utf8'));

  let launchHref = parsed.href;
  if (!launchHref) {
    for (const candidate of FALLBACK_LAUNCH_FILES) {
      if (existsSync(path.join(destDir, manifestDir, candidate))) {
        launchHref = candidate;
        break;
      }
    }
  }
  if (!launchHref) throw new ScormError('NO_LAUNCH');

  const relPath = [manifestDir, launchHref].filter(Boolean).join('/');
  return {
    scormId,
    launchUrl: `/uploads/scorm/${scormId}/${relPath}`,
    launchHref: relPath,
    title: parsed.title,
    scormVersion: parsed.version,
  };
}
