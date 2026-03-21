import './App.css';
import { Component } from 'react';
import { Seventeen } from './Seventeen';

interface AppState {
  apiKey: string;
}

class App extends Component<Record<string, never>, AppState> {
  constructor(props: Record<string, never>) {
    super(props);
    this.state = {
      apiKey: window.localStorage.getItem('freesound_api_key') ?? '',
    };
  }

  updateApiKey(e: React.ChangeEvent<HTMLInputElement>): void {
    const apiKey = e.target.value;
    this.setState({ apiKey });
    window.localStorage.setItem('freesound_api_key', apiKey);
  }

  render() {
    return (
      <div className="App">
        <Seventeen freesound_api_key={this.state.apiKey} />
        <div className="freesound-key">
          <label>
            Freesound key
            <input
              type="password"
              value={this.state.apiKey}
              placeholder="optional — not needed for MIDI-only use"
              onChange={this.updateApiKey.bind(this)}
            />
          </label>
        </div>
      </div>
    );
  }
}

export default App;
