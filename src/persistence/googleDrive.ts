/**
 * Google Drive persistence — save/load project files via the Drive REST API.
 *
 * Auth uses the Google Identity Services (GIS) token flow (no redirect).
 * The Picker API is loaded lazily from the CDN; both GSI and Picker scripts
 * must be present in index.html (see comments there).
 *
 * Required env var:  VITE_GOOGLE_CLIENT_ID
 *
 * Required OAuth scopes:
 *   https://www.googleapis.com/auth/drive.file
 *   (drive.file lets us see and modify only files we created — no broader access)
 */

import { parseProjectState } from './serialization';
import { ProjectState } from './types';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const MIME = 'application/json';
const EXT_MIME = 'application/vnd.seventeen.project';
const FILE_NAME = 'project.seventeen.json';

// ──────────────────────────────────────────────────────────────────────────────
// GIS token client (lazy singleton)
// ──────────────────────────────────────────────────────────────────────────────

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(cfg: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }): TokenClient;
        };
      };
    };
    gapi?: {
      load(lib: string, cb: () => void): void;
      client: {
        setToken(token: { access_token: string } | null): void;
      };
      auth2?: unknown; // not used; here to silence TS on window.gapi.auth2
    };
    google_picker_loaded?: boolean;
  }
}

let tokenClient: TokenClient | null = null;
let accessToken: string | null = null;

function getTokenClient(): TokenClient {
  if (!window.google) throw new Error('GIS script not loaded');
  if (!CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID is not set');
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) throw new Error(`GIS error: ${resp.error}`);
        accessToken = resp.access_token ?? null;
      },
    });
  }
  return tokenClient;
}

/** Request (or silently refresh) an access token. Resolves once the token is available. */
export function requestDriveAccess(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const client = getTokenClient();
      const origCallback = (window.google!.accounts.oauth2.initTokenClient as unknown as {
        _cb?: (r: { access_token?: string; error?: string }) => void;
      })._cb;
      // Patch callback for this call
      tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp) => {
          if (resp.error) { reject(new Error(`GIS error: ${resp.error}`)); return; }
          accessToken = resp.access_token ?? null;
          resolve();
        },
      });
      void origCallback; // suppress unused warning
      tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
    } catch (err) {
      reject(err);
    }
  });
}

export function isGoogleDriveConfigured(): boolean {
  return Boolean(CLIENT_ID);
}

export function hasDriveToken(): boolean {
  return Boolean(accessToken);
}

// ──────────────────────────────────────────────────────────────────────────────
// Drive REST helpers
// ──────────────────────────────────────────────────────────────────────────────

async function driveRequest(
  url: string,
  options: RequestInit & { token?: string } = {}
): Promise<Response> {
  const token = options.token ?? accessToken;
  if (!token) throw new Error('No Drive access token — call requestDriveAccess() first');
  const { token: _t, ...rest } = options;
  void _t;
  const res = await fetch(url, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(rest.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Drive API error ${res.status}: ${body}`);
  }
  return res;
}

/**
 * Upload (create or update) a project file on Drive.
 * If `fileId` is provided the existing file is updated; otherwise a new file is created.
 * Returns the Drive file ID of the saved file.
 */
export async function saveToDrive(
  project: ProjectState,
  fileId?: string
): Promise<string> {
  const body = JSON.stringify(project, null, 2);
  const metadata = {
    name: FILE_NAME,
    mimeType: EXT_MIME,
  };

  if (fileId) {
    // PATCH existing file content
    const form = new FormData();
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: MIME })
    );
    form.append('file', new Blob([body], { type: MIME }));
    const res = await driveRequest(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
      { method: 'PATCH', body: form }
    );
    const json = (await res.json()) as { id: string };
    return json.id;
  }

  // POST new file
  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: MIME })
  );
  form.append('file', new Blob([body], { type: MIME }));
  const res = await driveRequest(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    { method: 'POST', body: form }
  );
  const json = (await res.json()) as { id: string };
  return json.id;
}

/** Download and parse a project from a Drive file ID. */
export async function loadFromDrive(fileId: string): Promise<ProjectState> {
  const res = await driveRequest(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
  );
  const json: unknown = await res.json();
  return parseProjectState(json);
}

// ──────────────────────────────────────────────────────────────────────────────
// Picker
// ──────────────────────────────────────────────────────────────────────────────

/** Load the Picker API library once. */
function loadPicker(): Promise<void> {
  if (window.google_picker_loaded) return Promise.resolve();
  return new Promise((resolve) => {
    window.gapi!.load('picker', () => {
      window.google_picker_loaded = true;
      resolve();
    });
  });
}

interface PickerData {
  action: string;
  docs?: { id: string }[];
}

interface PickerInstance {
  setVisible(v: boolean): void;
}

interface PickerBuilder {
  addView(v: unknown): this;
  setOAuthToken(t: string): this;
  setCallback(cb: (data: PickerData) => void): this;
  build(): PickerInstance;
}

interface GooglePicker {
  PickerBuilder: new () => PickerBuilder;
  DocsView: new () => unknown;
  Action: { PICKED: string; CANCEL: string };
}

function getGooglePicker(): GooglePicker {
  return (window as unknown as { google: { picker: GooglePicker } }).google.picker;
}

/** Open the Google Picker and resolve with the chosen file ID (or null if cancelled). */
export async function pickDriveFile(): Promise<string | null> {
  if (!window.gapi) throw new Error('GAPI script not loaded');
  if (!accessToken) throw new Error('No Drive access token — call requestDriveAccess() first');
  await loadPicker();

  return new Promise((resolve) => {
    const picker = getGooglePicker();
    const view = new picker.DocsView();
    const token = accessToken!;
    const p = new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setCallback((data: PickerData) => {
        if (data.action === picker.Action.PICKED) {
          resolve(data.docs?.[0]?.id ?? null);
        } else if (data.action === picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();
    p.setVisible(true);
  });
}
