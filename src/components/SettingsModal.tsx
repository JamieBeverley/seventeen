import { Component } from 'react';
import {
  ClockMode,
  MidiPort,
  RhythmeContextValue,
  withRythmeContext,
} from '../context/RhythmeContext';

interface SettingsModalOwnProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onClose: () => void;
}

interface SettingsModalProps extends SettingsModalOwnProps {
  contextValue: RhythmeContextValue;
}

class SettingsModalInner extends Component<SettingsModalProps> {
  private get ctx(): RhythmeContextValue {
    return this.props.contextValue;
  }

  private onModeChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const mode = e.target.value as ClockMode;
    this.ctx.setClockMode(mode, this.ctx.midiInputId, this.ctx.midiOutputId);
  }

  private onInputChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    this.ctx.setClockMode(this.ctx.clockMode, e.target.value || null, this.ctx.midiOutputId);
  }

  private onOutputChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    this.ctx.setClockMode(this.ctx.clockMode, this.ctx.midiInputId, e.target.value || null);
  }

  private renderPortSelect(
    ports: MidiPort[],
    selectedId: string | null,
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void,
    label: string
  ) {
    return (
      <label className="settings__field">
        <span className="settings__label">{label}</span>
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

    return (
      <div className="settings-overlay" onClick={this.props.onClose}>
        <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
          <div className="settings-modal__header">
            <span>settings</span>
            <button className="settings-modal__close" onClick={this.props.onClose}>
              [x]
            </button>
          </div>

          <section className="settings-section">
            <h3 className="settings-section__title">freesound</h3>
            <label className="settings__field">
              <span className="settings__label">api key</span>
              <input
                type="password"
                value={this.props.apiKey}
                placeholder="paste key here — leave blank for MIDI-only use"
                onChange={(e) => this.props.onApiKeyChange(e.target.value)}
                className="settings__input--wide"
              />
            </label>
          </section>

          <section className="settings-section">
            <h3 className="settings-section__title">midi</h3>
            {!midiSupported ? (
              <p className="settings__unsupported">Web MIDI API not supported in this browser.</p>
            ) : !midiHasAccess ? (
              <button onClick={() => void this.ctx.requestMidiAccess()}>
                request midi access
              </button>
            ) : (
              <>
                <label className="settings__field">
                  <span className="settings__label">clock mode</span>
                  <select value={clockMode} onChange={this.onModeChange.bind(this)}>
                    <option value="internal">internal</option>
                    <option value="midi-master">midi master (send clock)</option>
                    <option value="midi-slave">midi slave (follow clock)</option>
                  </select>
                </label>

                {clockMode === 'midi-master' &&
                  this.renderPortSelect(midiOutputs, midiOutputId, this.onOutputChange.bind(this), 'send clock to')}

                {clockMode === 'midi-slave' &&
                  this.renderPortSelect(midiInputs, midiInputId, this.onInputChange.bind(this), 'receive clock from')}

                {clockMode === 'midi-slave' && (
                  <div className="settings__field">
                    <span className="settings__label">detected bpm</span>
                    <span>{tempo.toFixed(1)}</span>
                  </div>
                )}

                {midiInputs.length > 0 && (
                  <div className="settings__device-list">
                    <span className="settings__label">inputs</span>
                    <ul>
                      {midiInputs.map((p) => (
                        <li key={p.id}>{p.name}{p.manufacturer ? ` — ${p.manufacturer}` : ''}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {midiOutputs.length > 0 && (
                  <div className="settings__device-list">
                    <span className="settings__label">outputs</span>
                    <ul>
                      {midiOutputs.map((p) => (
                        <li key={p.id}>{p.name}{p.manufacturer ? ` — ${p.manufacturer}` : ''}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    );
  }
}

export const SettingsModal = withRythmeContext(SettingsModalInner);
