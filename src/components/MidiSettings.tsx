import { Component } from 'react';
import {
  ClockMode,
  MidiPort,
  RhythmeContextValue,
  withRythmeContext,
} from '../context/RhythmeContext';

interface MidiSettingsProps {
  contextValue: RhythmeContextValue;
}

class MidiSettingsInner extends Component<MidiSettingsProps> {
  private get ctx(): RhythmeContextValue {
    return this.props.contextValue;
  }

  private onModeChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const mode = e.target.value as ClockMode;
    this.ctx.setClockMode(mode, this.ctx.midiInputId, this.ctx.midiOutputId);
  }

  private onInputChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    this.ctx.setClockMode(
      this.ctx.clockMode,
      e.target.value || null,
      this.ctx.midiOutputId
    );
  }

  private onOutputChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    this.ctx.setClockMode(
      this.ctx.clockMode,
      this.ctx.midiInputId,
      e.target.value || null
    );
  }

  private renderPortSelect(
    ports: MidiPort[],
    selectedId: string | null,
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void,
    label: string
  ) {
    return (
      <label className="midi-settings__field">
        <span>{label}</span>
        <select value={selectedId ?? ''} onChange={onChange}>
          <option value="">— none —</option>
          {ports.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.manufacturer ? ` (${p.manufacturer})` : ''}
            </option>
          ))}
        </select>
      </label>
    );
  }

  render() {
    const {
      clockMode,
      midiSupported,
      midiHasAccess,
      midiInputs,
      midiOutputs,
      midiInputId,
      midiOutputId,
      tempo,
    } = this.ctx;

    if (!midiSupported) {
      return (
        <div className="midi-settings">
          <p className="midi-settings__unsupported">
            Web MIDI API not supported in this browser.
          </p>
        </div>
      );
    }

    return (
      <div className="midi-settings">
        <h3 className="midi-settings__title">MIDI</h3>

        {!midiHasAccess ? (
          <button
            className="midi-settings__request-btn"
            onClick={() => void this.ctx.requestMidiAccess()}
          >
            Request MIDI access
          </button>
        ) : (
          <>
            <label className="midi-settings__field">
              <span>Clock mode</span>
              <select
                value={clockMode}
                onChange={this.onModeChange.bind(this)}
              >
                <option value="internal">Internal</option>
                <option value="midi-master">MIDI master (send clock)</option>
                <option value="midi-slave">MIDI slave (follow clock)</option>
              </select>
            </label>

            {clockMode === 'midi-master' &&
              this.renderPortSelect(
                midiOutputs,
                midiOutputId,
                this.onOutputChange.bind(this),
                'Send clock to'
              )}

            {clockMode === 'midi-slave' &&
              this.renderPortSelect(
                midiInputs,
                midiInputId,
                this.onInputChange.bind(this),
                'Receive clock from'
              )}

            {clockMode === 'midi-slave' && (
              <div className="midi-settings__bpm">
                Detected BPM: <strong>{tempo.toFixed(1)}</strong>
              </div>
            )}

            <DeviceList label="Inputs" ports={midiInputs} />
            <DeviceList label="Outputs" ports={midiOutputs} />
          </>
        )}
      </div>
    );
  }
}

function DeviceList({ label, ports }: { label: string; ports: MidiPort[] }) {
  if (ports.length === 0) return null;
  return (
    <div className="midi-settings__device-list">
      <span>{label}:</span>
      <ul>
        {ports.map((p) => (
          <li key={p.id}>
            {p.name}
            {p.manufacturer ? ` — ${p.manufacturer}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const MidiSettings = withRythmeContext(MidiSettingsInner);
