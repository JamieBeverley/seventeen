import { Component } from 'react';
import { getAC } from './audio';
import { Header } from './components/Header';
import { Layer } from './components/Layer';
import { MidiSettings } from './components/MidiSettings';
import { ProjectControls } from './components/ProjectControls';
import { SoundProvider } from './context/RhythmeContext';
import { loadFromLocalStorage } from './persistence/localStorage';
import { deserializeLayers } from './persistence/serialization';
import { ProjectState } from './persistence/types';
import { clearUrlHash, loadFromUrl } from './persistence/urlState';
import { get_sample, get_sample_by_id } from './freesound';
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
  output: { type: 'audio' },
});

const defaultLayers: LayerMap = ['piano', 'orchestra', 'kick', 'shaker', 'hat', 'snare']
  .map(default_layer) as unknown as LayerMap;

/**
 * Priority: URL hash (shared link) > localStorage (auto-save) > null (defaults).
 * The hash is cleared after loading so the URL reflects the current state
 * rather than the original share link.
 */
function loadInitialProject(): ProjectState | null {
  const fromUrl = loadFromUrl();
  if (fromUrl) {
    clearUrlHash();
    return fromUrl;
  }
  return loadFromLocalStorage();
}

interface SeventeenProps {
  freesound_api_key: string;
  initialTempo?: number;
}

export class Seventeen extends Component<SeventeenProps, SeventeenState> {
  private readonly initialProject: ProjectState | null;

  constructor(props: SeventeenProps) {
    super(props);
    this.initialProject = loadInitialProject();
    this.state = {
      layers: this.initialProject ? deserializeLayers(this.initialProject) : defaultLayers,
    };
  }

  componentDidMount(): void {
    this.fetchMissingBuffers(this.state.layers);
  }

  /**
   * Fetch audio for any layer whose buffer is null.
   * If the layer has a saved freesound_id, reload the exact sample;
   * otherwise pick a random one from the search query.
   */
  fetchMissingBuffers(layers: LayerMap): void {
    const apiKey = this.props.freesound_api_key;
    const ctx = getAC();
    Object.entries(layers).forEach(([idStr, layer]) => {
      if (layer.buffer !== null) return;
      const key = parseInt(idStr, 10) as unknown as keyof LayerMap;
      const fetch$ =
        layer.freesound_data.id != null
          ? get_sample_by_id(apiKey, ctx, layer.freesound_data.id)
          : get_sample(apiKey, ctx, layer.sample_query);
      fetch$
        .then(({ buffer, freesound_data }) => {
          this.setState((s) => ({
            layers: {
              ...s.layers,
              [key]: { ...s.layers[key], buffer, freesound_data },
            },
          }));
        })
        .catch(console.error);
    });
  }

  handleProjectLoad(layers: LayerMap): void {
    this.setState({ layers }, () => this.fetchMissingBuffers(this.state.layers));
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
      <SoundProvider
        initialTempo={this.initialProject?.tempo ?? this.props.initialTempo ?? 120}
        playing={true}
      >
        <div className="seventeen">
          <Header />
          <MidiSettings />
          <ProjectControls
            layers={this.state.layers}
            initialProject={this.initialProject}
            onProjectLoad={this.handleProjectLoad.bind(this)}
          />
          {layers}
        </div>
      </SoundProvider>
    );
  }
}
