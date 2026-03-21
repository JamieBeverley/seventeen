import { Component } from 'react';
import { getAC } from './audio';
import { Header } from './components/Header';
import { Layer } from './components/Layer';
import { SoundProvider } from './context/RhythmeContext';
import { get_sample } from './freesound';
import { Layer as LayerData, LayerMap, SeventeenState, repeat } from './types';

const default_layer = (sample_query: string, id: number): LayerData => ({
  id,
  sample_query,
  toggles: repeat<boolean>(false, 8),
  mute: true,
  playback_speed: 1,
  cut: true,
  start: 0,
  end: 1,
  buffer: null,
  freesound_data: {},
  send_1: 0,
  send_2: 0,
});

const defaultState: SeventeenState = {
  layers: ['piano', 'orchestra', 'kick', 'shaker', 'hat', 'snare'].map(
    default_layer
  ) as unknown as LayerMap,
};

interface SeventeenProps {
  freesound_api_key: string;
}

export class Seventeen extends Component<SeventeenProps, SeventeenState> {
  constructor(props: SeventeenProps) {
    super(props);
    this.state = defaultState;
  }

  componentDidMount(): void {
    (Object.keys(this.state.layers) as unknown as number[]).forEach((id) => {
      const key = id as unknown as keyof LayerMap;
      const x = this.state.layers[key];
      get_sample(this.props.freesound_api_key, getAC(), x.sample_query).then(
        ({ buffer, freesound_data }) => {
          const layers = { ...this.state.layers };
          layers[key] = { ...layers[key], buffer, freesound_data };
          console.log(`Loaded sample ${String(id)}`);
          this.setState({ layers });
        }
      );
    });
  }

  onButtonToggle(id: string, index: number): void {
    const numId = parseInt(id, 10) as unknown as keyof LayerMap;
    const layers = { ...this.state.layers };
    const toggles = [...layers[numId].toggles];
    toggles[index] = !toggles[index];
    layers[numId] = { ...layers[numId], toggles };
    this.setState({ layers });
  }

  onMute(id: string): void {
    const numId = parseInt(id, 10) as unknown as keyof LayerMap;
    const layers = { ...this.state.layers };
    layers[numId] = { ...layers[numId], mute: !layers[numId].mute };
    this.setState({ layers });
  }

  updateLayer(id: string, vals: Partial<LayerData>): void {
    const numId = parseInt(id, 10) as unknown as keyof LayerMap;
    const layers = { ...this.state.layers };
    layers[numId] = { ...layers[numId], ...vals };
    this.setState({ layers });
  }

  render() {
    const layers = Object.keys(this.state.layers).map((id) => {
      const layer = this.state.layers[parseInt(id, 10) as unknown as keyof LayerMap];
      return (
        <Layer
          key={id}
          onMute={() => this.onMute(id)}
          onButtonToggle={(i: number) => this.onButtonToggle(id, i)}
          updateLayer={(vals: Partial<LayerData>) => this.updateLayer(id, vals)}
          {...layer}
        />
      );
    });

    return (
      <SoundProvider initialTempo={120} playing={true}>
        <div className="seventeen">
          <Header />
          {layers}
        </div>
      </SoundProvider>
    );
  }
}
