import './App.css';
import React, { Component } from 'react';
import Seventeen from './components/Seventeen/Seventeen';

type PropType = any
type StateType = {init:Boolean, apiKey:string}

class App extends Component {
  state:StateType

  constructor(props:PropType) {
    super(props)
    this.state = {init: false, apiKey: ""}
  }

  componentDidMount() {
    const freesound_api_key = window.localStorage.getItem("freesound_api_key");
    if (freesound_api_key) {
      this.setState({ apiKey: freesound_api_key });
    }
  }

  updateApiKey(e:any) {
    this.setState({ apiKey: e.target.value });
  }

  init() {
    this.setState({ init: true });
    const freesound_api_key = this.state.apiKey;
    window.localStorage.setItem("freesound_api_key", freesound_api_key);
  }

  render() {
    return (
    <div className="App">
        {
          this.state.init && this.state.apiKey !== "" ?
            <Seventeen freesound_api_key={this.state.apiKey} /> :
            <div>
              <div>
                Freesound api key:
                <input value={this.state.apiKey} onChange={this.updateApiKey.bind(this)}></input>
              </div>
              <button disabled={this.state.apiKey === ""} onClick={this.init.bind(this)}>start</button>
            </div>
        }
      </div>
    )
  }
}

export default App;
