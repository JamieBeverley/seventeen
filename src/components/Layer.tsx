import { Component } from 'react';
import { getAC } from '../audio';
import {
  RhythmeContextValue,
  withRythmeContext,
} from '../context/RhythmeContext';
import { Layer as LayerData, repeat } from '../types';
import { Button } from './Button';

interface LayerOwnProps extends LayerData {
  onMute: () => void;
  onButtonToggle: (index: number) => void;
  updateLayer: (vals: Partial<LayerData>) => void;
}

interface LayerProps extends LayerOwnProps {
  contextValue: RhythmeContextValue;
}

class LayerInner extends Component<LayerProps> {
  source: AudioBufferSourceNode | null = null;

  componentDidUpdate(prevProps: LayerProps): void {
    if (prevProps.contextValue.beat !== this.props.contextValue.beat) {
      const beat = this.props.contextValue.beat % this.props.toggles.length;
      const on = this.props.toggles[beat];
      if (on && !this.props.mute) {
        this.play();
      }
    }
  }

  play(): void {
    if (this.props.buffer === null) return;
    if (this.source && this.props.cut) {
      this.source.stop();
    }
    const offset = this.props.buffer.duration * this.props.start;
    const duration = Math.abs(
      this.props.buffer.duration * (this.props.start - this.props.end)
    );
    const ac = getAC();
    this.source = ac.createBufferSource();
    this.source.playbackRate.value = this.props.playback_speed;
    this.source.buffer = this.props.buffer;
    this.source.connect(ac.destination);
    this.source.start(0, offset, duration);
  }

  onMute(): void {
    if (this.source) this.source.stop();
    this.props.onMute();
  }

  onCut(): void {
    this.props.updateLayer({ cut: !this.props.cut });
  }

  onStartChange(e: React.FormEvent<HTMLInputElement>): void {
    const start = parseFloat((e.target as HTMLInputElement).value);
    this.props.updateLayer({ start, end: Math.max(this.props.end, start) });
  }

  onEndChange(e: React.FormEvent<HTMLInputElement>): void {
    this.props.updateLayer({
      end: parseFloat((e.target as HTMLInputElement).value),
    });
  }

  onSpeedChange(e: React.FormEvent<HTMLInputElement>): void {
    this.props.updateLayer({
      playback_speed: parseFloat((e.target as HTMLInputElement).value),
    });
  }

  onLengthChange(e: React.FormEvent<HTMLInputElement>): void {
    const value = Math.round(
      parseFloat((e.target as HTMLInputElement).value)
    );
    if (isNaN(value)) return;
    let toggles = [...this.props.toggles.slice(0, value)];
    const diff = value - toggles.length;
    if (diff > 0) toggles = toggles.concat(repeat<boolean>(false, diff));
    this.props.updateLayer({ toggles });
  }

  double(): void {
    this.props.updateLayer({
      toggles: [...this.props.toggles, ...this.props.toggles],
    });
  }

  half(): void {
    const index = Math.max(1, Math.floor(this.props.toggles.length / 2));
    this.props.updateLayer({ toggles: this.props.toggles.slice(0, index) });
  }

  renderToggles(): React.ReactNode[] {
    const foldEvery = 16;
    const toggles = this.props.toggles.map((x, i) => (
      <Button
        key={i}
        onClick={() => this.props.onButtonToggle(i)}
        on={x}
        trig={i === this.props.contextValue.beat % this.props.toggles.length}
      />
    ));
    const nFolds = Math.max(1, Math.ceil(toggles.length / foldEvery));
    const rows: React.ReactNode[] = [];
    for (let i = 1; i < nFolds + 1; i++) {
      rows.push(
        <div key={`row-${i}`} className="flex-row">
          {toggles.slice((i - 1) * foldEvery, i * foldEvery)}
        </div>
      );
    }
    return rows;
  }

  render() {
    return (
      <div className="layer">
        <div className="sample">
          <div>
            <b style={{ display: 'inline-block' }}>{this.props.sample_query} </b>
            {` ${this.props.freesound_data.name ?? ''} (${this.props.freesound_data.username ?? ''})`}
          </div>
          <div>
            <button
              style={{ display: 'inline-block' }}
              className={this.props.mute ? 'on' : ''}
              onClick={this.onMute.bind(this)}
            >
              mute
            </button>
            <button
              style={{ display: 'inline-block' }}
              className={this.props.cut ? 'on' : ''}
              onClick={this.onCut.bind(this)}
            >
              cut
            </button>
          </div>
          <div>
            <input
              value={this.props.start}
              onInput={this.onStartChange.bind(this)}
              type="number"
              min="0"
              max="1"
              step=".01"
            />
            <input
              value={this.props.end}
              onInput={this.onEndChange.bind(this)}
              type="number"
              min="0"
              max="1"
              step=".01"
            />
            <input
              value={this.props.playback_speed}
              onInput={this.onSpeedChange.bind(this)}
              type="number"
              min="0"
              step=".1"
            />
          </div>
          <div>
            <input
              type="number"
              value={this.props.toggles.length}
              step="1"
              min="0"
              onInput={this.onLengthChange.bind(this)}
            />
          </div>
          <div>
            <button onClick={this.double.bind(this)}>x2</button>
            <button onClick={this.half.bind(this)}>1/2</button>
          </div>
        </div>
        <div className="toggles">{this.renderToggles()}</div>
      </div>
    );
  }
}

export const Layer = withRythmeContext(LayerInner);
