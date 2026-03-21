import './App.css';
import { Component } from 'react';
import { Seventeen } from './Seventeen';

interface AppState {
  init: boolean;
  apiKey: string;
}

class App extends Component<Record<string, never>, AppState> {
  constructor(props: Record<string, never>) {
    super(props);
    this.state = { init: false, apiKey: '' };
  }

  componentDidMount(): void {
    const freesound_api_key = window.localStorage.getItem('freesound_api_key');
    if (freesound_api_key) {
      this.setState({ apiKey: freesound_api_key });
    }
  }

  updateApiKey(e: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({ apiKey: e.target.value });
  }

  init(): void {
    this.setState({ init: true });
    window.localStorage.setItem('freesound_api_key', this.state.apiKey);
  }

  render() {
    return (
      <div className="App">
        {this.state.init && this.state.apiKey !== '' ? (
          <Seventeen freesound_api_key={this.state.apiKey} />
        ) : (
          <div>
            <div>
              Freesound api key:
              <input
                value={this.state.apiKey}
                onChange={this.updateApiKey.bind(this)}
              />
            </div>
            <button
              disabled={this.state.apiKey === ''}
              onClick={this.init.bind(this)}
            >
              start
            </button>
          </div>
        )}
      </div>
    );
  }
}

export default App;
