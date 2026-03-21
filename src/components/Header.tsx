import { Component } from 'react';
import { RhythmeContextValue, withRythmeContext } from '../context/RhythmeContext';

interface HeaderOwnProps {
  onOpenSettings: () => void;
}

interface HeaderProps extends HeaderOwnProps {
  contextValue: RhythmeContextValue;
}

class HeaderInner extends Component<HeaderProps> {
  updateTempo(e: React.ChangeEvent<HTMLInputElement>): void {
    this.props.contextValue.updateContext({ tempo: parseFloat(e.target.value) });
  }

  updateSpeed(e: React.ChangeEvent<HTMLInputElement>): void {
    this.props.contextValue.updateContext({ speed: parseFloat(e.target.value) });
  }

  render() {
    const beat = this.props.contextValue.beat % 16;
    return (
      <div className="header">
        <span className="header__title">seventeen</span>
        <label className="header__field">
          <span>bpm</span>
          <input
            value={this.props.contextValue.tempo}
            onChange={this.updateTempo.bind(this)}
            type="number"
            step="0.5"
          />
        </label>
        <label className="header__field">
          <span>speed</span>
          <input
            value={this.props.contextValue.speed}
            onChange={this.updateSpeed.bind(this)}
            type="number"
            step="1"
          />
        </label>
        <span className="metronome">
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} className={i === beat ? 'metronome__tick metronome__tick--on' : 'metronome__tick'} />
          ))}
        </span>
        <button className="header__settings-btn" onClick={this.props.onOpenSettings}>
          [settings]
        </button>
      </div>
    );
  }
}

export const Header = withRythmeContext(HeaderInner);
