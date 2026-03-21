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

  updateApiKey(apiKey: string): void {
    this.setState({ apiKey });
    window.localStorage.setItem('freesound_api_key', apiKey);
  }

  render() {
    return (
      <div className="App">
        <Seventeen
          freesound_api_key={this.state.apiKey}
          onApiKeyChange={this.updateApiKey.bind(this)}
        />
      </div>
    );
  }
}

export default App;
