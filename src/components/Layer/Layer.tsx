import { withRythmeContext } from '../SoundProvider/SoundProvider.jsx';

const Layer = withRythmeContext(
  class extends Component {

    componentDidUpdate(prevProps, prevState) {
      if (prevProps.contextValue.beat !== this.props.contextValue.beat) {
        const beat = this.props.contextValue.beat % this.props.toggles.length;
        const on = this.props.toggles[beat];
        if (on && !this.props.mute) {
          this.play();
        }
      }
    }

    play() {
      if (this.props.buffer === null) {
        return;
      }
      // console.log(this.props.sample);
      if (this.source && this.props.cut) {
        this.source.stop()
      }
      const offset = this.props.buffer.duration * this.props.start;
      const duration = Math.abs(this.props.buffer.duration * (this.props.start - this.props.end));
      const playbackRate = this.props.playback_speed;
      this.source = ac.createBufferSource();
      this.source.playbackRate.value = playbackRate;
      this.source.buffer = this.props.buffer;
      this.source.connect(ac.destination);
      this.source.start(0, offset, duration);
    }

    onMute() {
      if (this.source) {
        this.source.stop()
      }
      this.props.onMute()
    }

    onCut() {
      this.props.updateLayer({ cut: !this.props.cut })
    }

    onStartChange(e) {
      const start = parseFloat(e.target.value)
      this.props.updateLayer({ start, end: Math.max(this.props.end, start) });
    }

    onEndChange(e) {
      this.props.updateLayer({ end: e.target.value })
    }

    onSpeedChange(e) {
      const speed = parseFloat(e.target.value)
      this.props.updateLayer({ playback_speed: speed });
    }

    onLengthChange(e) {
      const value = Math.round(parseFloat(e.target.value));
      if (isNaN(value)) {
        return;
      }
      let toggles = [...this.props.toggles.slice(0, value)];
      const diff = value - toggles.length;
      if (diff > 0) {
        toggles = toggles.concat(repeat(false, diff));
      }
      this.props.updateLayer({ toggles });
    }

    double() {
      const toggles = [...this.props.toggles, ...this.props.toggles];
      this.props.updateLayer({ toggles });
    }

    half() {
      const index = Math.max(1, Math.floor(this.props.toggles.length / 2));
      const toggles = this.props.toggles.slice(0, index);
      this.props.updateLayer({ toggles });
    }

    renderToggles() {
      const foldEvery = 16;

      const toggles = this.props.toggles.map((x, i) =>
        <Button
          key={i}
          onClick={() => this.props.onButtonToggle(i)}
          on={x}
          trig={i === this.props.contextValue.beat % this.props.toggles.length}
        />
      );
      const nFolds = Math.max(1, Math.ceil(toggles.length / foldEvery));
      let togs = [];
      for (let i = 1; i < (nFolds + 1); i++) {
        if (nFolds > 1) {
          debugger;
        }
        togs = [...togs,
        <div key={`row-${i}`} className="flex-row">{toggles.slice((i - 1) * foldEvery, i * foldEvery)}</div>];
      }
      return togs;
    }

    render() {
      const breaks = [2, 4, 8, 16, 32].filter(x => {
        return this.props.toggles.length / x === Math.floor(this.props.toggles.length / x)
      }).map(x => {
        return this.props.toggles.length / x;
      });


      return (
        <div className="layer">
          <div className="sample">
            <div>
              <b style={{ display: "inline-block" }}>{this.props.sample_query} </b>
              {` ${this.props.freesound_data.name} (${this.props.freesound_data.username})`}
            </div>
            <div>
              <button style={{ display: "inline-block" }} className={this.props.mute ? "on" : ""} onClick={this.onMute.bind(this)}>mute</button>
              <button style={{ display: "inline-block" }} className={this.props.cut ? "on" : ""} onClick={this.onCut.bind(this)}>cut</button>
            </div>
            <div>
              <input value={this.props.start} onInput={this.onStartChange.bind(this)} type="number" min="0" max="1" step=".01" />
              <input value={this.props.end} onInput={this.onEndChange.bind(this)} type="number" min="0" max="1" step=".01" />
              <input value={this.props.playback_speed} onInput={this.onSpeedChange.bind(this)} type="number" min="0" step=".1" />
            </div>
            <div>
              <input type="number" value={this.props.toggles.length} step="1" min="0" onInput={this.onLengthChange.bind(this)} />
            </div>
            <div>
              <button onClick={this.double.bind(this)}>x2</button>
              <button onClick={this.half.bind(this)}>1/2</button>
            </div>

          </div>
          <div className="toggles">
            {this.renderToggles()}
          </div>
        </div>
      )
    }
  });

export default Layer;
