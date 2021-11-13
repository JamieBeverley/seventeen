// @ts-ignore
var AudioContext = window.AudioContext || window.webkitAudioContext;
var ac = new AudioContext();

export const RhythmeContext = React.createContext({})
export class SoundProvider extends Component{
  constructor(props){
    super(props)
    this.ac = ac;
    this.input = this.ac.createGain();

    const reverb = this.ac.createConvolver;

    const delayNode = this.ac.createDelay();
    delayNode.delayTime.value = this.props.initialTempo/60/3;
    const feedbackNode = this.ac.createGain();
    feedbackNode.gain.value = 0.8;
    delayNode.connect(feedbackNode);
    feedbackNode.connect(delayNode);
    
    const delay = {
      delayNode,
      feedbackNode,
      delayTime: delayNode.delayTime.value,

    }


    this.state = {
      beat: 0,
      beat_count:0,
      tempo: this.props.initialTempo,
      speed: 1,
      tempo_set_ts: null,
    }
  }

  setDelayTime(delayTime){
    this.state.delay.delayNode.delayTime.value = delayTime;
    const delay = {...this.state.delay, delayTime};
    this.setState(Object.assign(this.state, {delay}));
  }

  setDelayFeedback(value){
    value = clip(value, 0, 1);
    this.state.delay.feedbackNode.gain.value = value;
    const delay = {...this.state.delay, feedback: value};
    this.setState(Object.assign(this.state, {delay}));
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
    const value = Object.assign(this.state,{
      // input: this.
      updateContext: this.updateContext.bind(this),
      setDelayFeedback: this.setDelayFeedback.bind(this),
      setDelayTime: this.setDelayTime.bind(this)
    });

    return(
      <RhythmeContext.Provider value={value}>
        {this.props.children}
      </RhythmeContext.Provider>
    )
  }
}
export const withRythmeContext = Wrapped => props =>(
  <RhythmeContext.Consumer>
    {context => <Wrapped {...props} contextValue={context}/>}
  </RhythmeContext.Consumer>
)
