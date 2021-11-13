const Header = withRythmeContext (
    class extends Component{
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
        const beat = (this.props.contextValue.beat%16);
        return(
          <div className="header">
            <input value={this.props.contextValue.tempo} onChange={this.updateTempo.bind(this)} type="number" step="0.5"/>
            <input value={this.props.contextValue.beat%64} onChange={this.updateBeat.bind(this)} type="number" step="1"/>
            <input value={this.props.contextValue.speed} onChange={this.updateSpeed.bind(this)} type="number" step="1"/>
            <span className={"metronome"}>
              {[0,1,2,3,4,5,6,7].map(x=>x*2).map(i =>
                <div key={i} className={beat > i ? "on":""} style={{display:"inline-block", width:"10px"}}/>
                )
              }
            </span>
    
            <div>beat current: {this.props.contextValue.beat}</div>
            <div>total: {this.props.contextValue.beat_count}</div>
    
          </div>
        )
      }
    })