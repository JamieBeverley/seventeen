import { Component } from 'react';
import {
  hasDriveToken,
  isGoogleDriveConfigured,
  loadFromDrive,
  pickDriveFile,
  requestDriveAccess,
  saveToDrive,
} from '../persistence/googleDrive';
import { ProjectState } from '../persistence/types';

interface GoogleDrivePanelProps {
  getProject: () => ProjectState;
  onProjectLoad: (project: ProjectState) => void;
}

interface GoogleDrivePanelState {
  status: string;
  /** Drive file ID of the last saved/loaded file, used for subsequent saves. */
  fileId: string | null;
}

export class GoogleDrivePanel extends Component<GoogleDrivePanelProps, GoogleDrivePanelState> {
  state: GoogleDrivePanelState = { status: '', fileId: null };

  private setStatus(msg: string): void {
    this.setState({ status: msg });
    setTimeout(
      () => this.setState((s) => (s.status === msg ? { ...s, status: '' } : s)),
      3000
    );
  }

  async connect(): Promise<void> {
    try {
      await requestDriveAccess();
      this.setStatus('Connected');
      this.forceUpdate();
    } catch (err) {
      this.setStatus(`Auth failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async save(): Promise<void> {
    try {
      const id = await saveToDrive(this.props.getProject(), this.state.fileId ?? undefined);
      this.setState({ fileId: id });
      this.setStatus('Saved to Drive');
    } catch (err) {
      this.setStatus(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async load(): Promise<void> {
    try {
      const fileId = await pickDriveFile();
      if (!fileId) return;
      const project = await loadFromDrive(fileId);
      this.setState({ fileId });
      this.props.onProjectLoad(project);
      this.setStatus('Loaded from Drive');
    } catch (err) {
      this.setStatus(`Load failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  render() {
    if (!isGoogleDriveConfigured()) return null;

    const connected = hasDriveToken();

    return (
      <div className="google-drive-panel">
        {!connected ? (
          <button onClick={() => void this.connect()}>Drive: Connect</button>
        ) : (
          <>
            <button onClick={() => void this.save()}>Drive: Save</button>
            <button onClick={() => void this.load()}>Drive: Open</button>
          </>
        )}
        {this.state.status && (
          <span className="drive-status">{this.state.status}</span>
        )}
      </div>
    );
  }
}
