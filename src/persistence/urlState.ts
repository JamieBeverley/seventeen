import { parseProjectState } from './serialization';
import { ProjectState } from './types';

/**
 * Encode a project into the URL hash and return the full shareable URL.
 * Uses base64 so the hash stays reasonably compact. All field values
 * in ProjectState are ASCII-safe (numbers, booleans, plain strings)
 * so btoa works without additional escaping.
 */
export function encodeToUrl(project: ProjectState): string {
  const encoded = btoa(encodeURIComponent(JSON.stringify(project)));
  return `${window.location.origin}${window.location.pathname}#${encoded}`;
}

/** Attempt to decode a ProjectState from the current URL hash. */
export function loadFromUrl(): ProjectState | null {
  try {
    const hash = window.location.hash.slice(1);
    if (!hash) return null;
    return parseProjectState(JSON.parse(decodeURIComponent(atob(hash))));
  } catch {
    return null;
  }
}

/** Remove the hash from the URL without a history entry. */
export function clearUrlHash(): void {
  history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search
  );
}
