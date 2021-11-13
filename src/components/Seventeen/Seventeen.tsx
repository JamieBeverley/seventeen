import { Component } from "react";
import { defaultState, Layer as LayerType, BufferSource, get_sample } from "../../utils";
import Layer from "../Layer/Layer";


type LayerMap = { [id: string]: LayerType<BufferSource> }
type PropType = { freesound_api_key: string, ac: AudioContext };

class Seventeen extends Component {

  state: { layers: LayerMap }

  constructor(props: PropType) {
    super(props);
    this.state = defaultState;
  }

  componentDidMount() {
    Object.keys(this.state.layers).forEach(id => {
      const x = this.state.layers[id];
      if (x.type === BufferSource.FreeSound && x.metadata && x.metadata.sample_query) {
        get_sample(this.props.freesound_api_key, this.props.ac, x.metadata.sample_query).then(({ buffer, freesound_data }) => {
          const layers = this.state.layers;
          layers[id].buffer = buffer;
          layers[id].metadata.detail = freesound_data;
          console.log(`Loaded sample ${id}`);
          this.setState({ layers });
        });
      }
    });
  }

  onButtonToggle(id: number, index: number) {
    const layers = this.state.layers;
    layers[id].toggles[index] = !layers[id].toggles[index];
    this.setState({ layers });
  }

  onMute(id: number) {
    const layers = this.state.layers;
    layers[id].mute = !layers[id].mute;
    this.setState({ layers });
  }

  updateLayer(id: number, vals: Partial<LayerType<BufferSource>>) {
    const layers = this.state.layers;
    layers[id] = { ...layers[id], ...vals };
    this.setState({ layers });
  }

  render() {
    const layers = Object.keys(this.state.layers).map((idstr) => {
      const id = parseInt(idstr);
      const layer = this.state.layers[id];
      return (
        <Layer
          key={id}
          onMute={() => { this.onMute.call(this, id) }}
          onButtonToggle={(btn_index: number) => { this.onButtonToggle.call(this, id, btn_index) }}
          updateLayer={(vals: Partial<LayerType<BufferSource>>) => { this.updateLayer.call(this, id, vals) }}
          {...layer}
        />
      )
    });
    return (
      <SoundProvider initialTempo={120} playing={true}>
        <div className="seventeen">
          <Header/>
          {layers}
        </div>
      </SoundProvider>
    )
  }
}
export default Seventeen;
