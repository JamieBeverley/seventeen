import { parseProjectState } from './serialization';
import { ProjectState } from './types';

const KEY = 'seventeen_project';

export function saveToLocalStorage(project: ProjectState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(project));
  } catch {
    // Quota exceeded or storage unavailable — silently ignore
  }
}

export function loadFromLocalStorage(): ProjectState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseProjectState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
