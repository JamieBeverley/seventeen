import logo from './logo.svg';
import './App.css';
import React, { Component } from 'react';
import { render } from '@testing-library/react';

var AudioContext = window.AudioContext || window.webkitAudioContext;
var ac = new AudioContext();

function repeat(x, n){
  return Array.apply(x, Array(n));
}

const default_layer = function(sample_query,id){
  return {
    id,
    sample_query,
    // toggles: Array.apply(false, Array(Math.ceil(28*Math.random()+4))).map(x=> Math.random() >0.8 ? true : false),
    toggles: repeat(false, 8),
    mute: true,
    playback_speed: 1,
    cut: true,
    start: 0,
    end: 1,
    buffer: null,
    freesound_data: {},
    send_1: 0,
    send_2: 0
  }
}

function init_from_sample_list(sample_query){
  return sample_query.reduce((acc, sample, index)=>{
    acc[index] = default_layer(sample);
    return acc;
  },{})
}

const defaultState = {
  // layers: ["bd","snare","clap","closed_hat", "open_hat", "low_tom","hi_tom"].map(default_layer)
  // layers: ["kick","snare","hat","tom","piano","bass","tink","ambience","bop"].map(default_layer)
  // layers: ["piano","melody","hat","bd","snare","flute"].map(default_layer)
  // layers: ["kick", "hat", "snare","tom","tom"].map(default_layer)
  // layers: ["piano", "orchestra", "flute", "strings", "guitar", "rap"].map(default_layer)
  // layers: ["piano", "orchestra", "flute", "strings", "guitar", "rap"].map(default_layer)
  // layers: ["choir","choir","choir","choir","drum","drum","drum", "drum"].map(default_layer)
  // layers: ["hiphop","hiphop","hiphop","hiphop","hiphop","hiphop"].map(default_layer)
  layers: ["drum","drum","drum","drum"].map(default_layer)
}

const get_sample = function(freesound_api_key, ac, query){
  return (
    fetch(
      `https://freesound.org/apiv2/search/text/?query=${query}&page_size=30&token=${freesound_api_key}`,
      ).then(x => {
        return x.json()
      })
      .then(x =>{
        const id = x.results[Math.floor(x.results.length*Math.random())].id;
        return get_sample_by_id(freesound_api_key, ac, id);
      })
      )
}

const get_sample_by_id = function(freesound_api_key,ac, sound_id){
  return (
    fetch(
      `https://freesound.org/apiv2/sounds/${sound_id}/?token=${freesound_api_key}`,
      ).then(x => x.json())
      .then(data =>
        fetch(`${data.previews['preview-hq-mp3']}?token=${freesound_api_key}`)
        .then(y => y.arrayBuffer()).then(buffer => ac.decodeAudioData(buffer))
        .then(decoded =>{
          return {buffer: decoded, freesound_data:data}
        })
      )
  )
}

/////////////////////////////////////////////////////////////////////////////////
export const RhythmeContext = React.createContext({})
class RhythmProvider extends Component{
  constructor(props){
    super(props)
    this.state = {
      beat: 0,
      beat_count:0,
      tempo: this.props.initialTempo,
      speed: 1,
      tempo_set_ts: null
    }
  }

  now(){
    return Number(new Date())
  }

  initClock(){
    this.setState({tempo_set_ts: this.now()}, () => {
      const loop = () => {
        const beat = this.state.beat + this.state.speed;
        const beat_count = this.state.beat_count+1;
        this.setState({beat: beat, beat_count}, ()=>{
          const wait = (this.state.beat_count*1000*15/this.state.tempo+this.state.tempo_set_ts) - this.now();
          this.timeout = setTimeout(loop, wait);
        });
      };
      const wait = (this.state.beat_count*1000*15/this.state.tempo+this.state.tempo_set_ts) - this.now();
      this.timeout = setTimeout(loop, wait);
    });
    
    // this.clockTimeout = setInterval(()=>{
    //   // console.log(this.state.beat+1);
    // }, this.state.tempo*1000/60/16);
  }

  componentDidMount(){
    if(this.props.playing){
      this.initClock()
    }
  }

  componentDidUpdate(prevProps, prevState){
    if(prevState.tempo !== this.state.tempo){
      this.setState({tempo_set_ts: this.now(), beat_count:0})
    }
    if(prevProps.playing && !this.props.playing){
      clearTimeout(this.clockTimeout);
    } else if(!prevProps && this.props.playing){
      this.initClock();
    }
    if(prevState.tempo !== this.state.tempo){

    }
  }

  updateContext(items){
    this.setState({...this.state, ...items});
  }

  render(){
    const value = Object.assign(this.state,{updateContext: this.updateContext.bind(this)});
    return(
      <RhythmeContext.Provider value={value}>
        {this.props.children}
      </RhythmeContext.Provider>
    )
  }
}
const withRythmeContext = Wrapped => props =>(
  <RhythmeContext.Consumer>
    {context => <Wrapped {...props} contextValue={context}/>}
  </RhythmeContext.Consumer>
)
///////////////////////////////////////////////////////////////////////////////////


class Button extends Component {
  render(){
    const className = `${this.props.on?"on":""} ${this.props.trig?"trig":""}`;
    return (
      <div className={`button ${className}`} onClick={this.props.onClick}></div>
    )
  }
}

const Layer = withRythmeContext (class extends Component{

  componentDidUpdate(prevProps, prevState){
    if(prevProps.contextValue.beat !== this.props.contextValue.beat){
      const beat = this.props.contextValue.beat % this.props.toggles.length;
      const on = this.props.toggles[beat];
      if(on && !this.props.mute){
        this.play();
      }
    }
  }

  play(){
    if(this.props.buffer === null){
      return;
    }
    // console.log(this.props.sample);
    if(this.source && this.props.cut){
      this.source.stop()
    }
    const offset = this.props.buffer.duration * this.props.start;
    const duration = Math.abs(this.props.buffer.duration * (this.props.start-this.props.end));
    const playbackRate = this.props.playback_speed;
    this.source = ac.createBufferSource();
    this.source.playbackRate.value = playbackRate;
    this.source.buffer = this.props.buffer;
    this.source.connect(ac.destination);
    this.source.start(0, offset, duration);
  }

  onMute(){
    if(this.source){
      this.source.stop()
    }
    this.props.onMute()
  }

  onCut(){
    this.props.updateLayer({cut: !this.props.cut})
  }

  onStartChange(e){
    const start = parseFloat(e.target.value)
    this.props.updateLayer({start, end: Math.max(this.props.end, start)});
  }

  onEndChange(e){
    this.props.updateLayer({end:e.target.value})
  }

  onSpeedChange(e){
    const speed = parseFloat(e.target.value)
    this.props.updateLayer({playback_speed: speed});
  }

  onLengthChange(e){
    const value = Math.round(parseFloat(e.target.value));
    if(isNaN(value)){
      return;
    }
    let toggles = [...this.props.toggles.slice(0, value)];
    const diff = value - toggles.length;
    if(diff > 0){
      toggles = toggles.concat(repeat(false, diff));
    }
    this.props.updateLayer({toggles});
  }

  double(){
    const toggles = [...this.props.toggles, ...this.props.toggles];
    this.props.updateLayer({toggles});
  }

  half(){
    const index = Math.floor(this.props.toggles.length/2);
    const toggles = this.props.toggles.slice(0, index);
    this.props.updateLayer({toggles});
  }



  render(){
    const breaks = [2,4,8,16,32].filter(x=>{
      return this.props.toggles.length/x === Math.floor(this.props.toggles.length/x)
   }).map(x=>{
     return this.props.toggles.length/x;
   });

    return (
      <div className="layer">
        <div className="sample">
          <div>
            <b style={{display:"inline-block"}}>{this.props.sample_query} </b>
            {` ${this.props.freesound_data.name} (${this.props.freesound_data.username})`}
          </div>
          <div>
            <button style={{display:"inline-block"}} className={this.props.mute?"on":""} onClick={this.onMute.bind(this)}>mute</button>
            <button style={{display:"inline-block"}} className={this.props.cut?"on":""} onClick={this.onCut.bind(this)}>cut</button>
          </div>
          <div>
            <input value={this.props.start} onInput={this.onStartChange.bind(this)} type="number" min="0" max="1" step=".01"/>
            <input value={this.props.end} onInput={this.onEndChange.bind(this)} type="number" min="0" max="1" step=".01"/>
            <input value={this.props.playback_speed} onInput={this.onSpeedChange.bind(this)} type="number" min="0" step=".1"/>
          </div>
          <div>
            <input type="number" value={this.props.toggles.length} step="1" min="0" onInput={this.onLengthChange.bind(this)}/>
          </div>
          <div>
            <button onClick={this.double.bind(this)}>x2</button>
            <button onClick={this.half.bind(this)}>1/2</button>
          </div>
          
        </div>
        <div className="toggles">
          {this.props.toggles.map((x,i)=> <Button key={i} className={breaks.includes(i)?"tog":""} onClick={()=> this.props.onButtonToggle(i)} on={x} trig={i===this.props.contextValue.beat%this.props.toggles.length} />)}
        </div>
      </div>
    )
  }
});


const Header = withRythmeContext (class extends Component{
  constructor(props){
    super(props)
  }

  updateTempo(e){
    const tempo = parseFloat(e.target.value);
    this.props.contextValue.updateContext({tempo});
  }

  updateBeat(e){
    const beat = parseInt(e.target.value);
    this.props.contextValue.updateContext({beat});
  }

  updateSpeed(e){
    const speed = parseFloat(e.target.value);
    this.props.contextValue.updateContext({speed});
  }


  render(){
    return(
      <div class="header">
        <input value={this.props.contextValue.tempo} onChange={this.updateTempo.bind(this)} type="number" step="0.5"/>
        <input value={this.props.contextValue.beat%64} onChange={this.updateBeat.bind(this)} type="number" step="1"/>
        <input value={this.props.contextValue.speed} onChange={this.updateSpeed.bind(this)} type="number" step="1"/>

        <div>{this.props.contextValue.beat}</div>
        <div>{this.props.contextValue.beat_count}</div>

      </div>
    )
  }
})


class Seventeen extends Component{
  constructor(props){
    super(props)
    this.state = defaultState;
  }

  componentDidMount(){
    Object.keys(this.state.layers).forEach(id=>{
      const x = this.state.layers[id];
      get_sample(this.props.freesound_api_key, ac, x.sample_query).then(({buffer, freesound_data})=>{
        const layers = this.state.layers;
        layers[id].buffer = buffer;
        layers[id].freesound_data = freesound_data;
        console.log(`Loaded sample ${id}`);
        this.setState({layers});
      });
    });
  }

  onButtonToggle(id, index){
    const layers = this.state.layers;
    layers[id].toggles[index] = !layers[id].toggles[index];
    this.setState({layers});
  }

  onMute(id){
    const layers = this.state.layers;
    layers[id].mute = !layers[id].mute;
    this.setState({layers});
  }

  updateLayer(id, vals){
    const layers = this.state.layers;
    layers[id] = {...layers[id], ...vals};
    this.setState({layers});
  }

  render(){
    const layers = Object.keys(this.state.layers).map((id)=>{
      const layer = this.state.layers[id];
      return (
        <Layer
          key={id}
          onMute={()=>{this.onMute.call(this,id)}}
          onButtonToggle={(btn_index)=>{this.onButtonToggle.call(this,id,btn_index)}}
          updateLayer={(vals)=>{this.updateLayer.call(this, id, vals)}}
          {...layer}
        />
      )
    })

    return (
      <RhythmProvider initialTempo={120} playing={true}>
        <div className="seventeen">
          <Header/>
          {layers}
        </div>
      </RhythmProvider>
    )
  }
}


class App extends Component{
  constructor(props){
    super(props)
    this.state = {
      init:false,
      apiKey: null
    }
  }

  componentDidMount(){
    const freesound_api_key = window.localStorage.getItem("freesound_api_key");
    if(freesound_api_key){
      this.setState({apiKey: freesound_api_key});
    }
  }

  updateApiKey(e){
    this.setState({apiKey: e.target.value});
  }

  init(){
    this.setState({init:true});
    const freesound_api_key = this.state.apiKey;
    window.localStorage.setItem("freesound_api_key", freesound_api_key);
  }

  render(){
    return(
      <div className="App">
        {
          this.state.init && this.state.apiKey !== null ?
            <Seventeen freesound_api_key={this.state.apiKey}/> :
            <div>
              <div>
                Freesound api key:
                <input value={this.state.apiKey} onChange={this.updateApiKey.bind(this)}></input>
              </div>
              <button disabled={this.state.apiKey===null} onClick={this.init.bind(this)}>start</button>
            </div>
        }
    </div>
    )
  }
}

export default App;
