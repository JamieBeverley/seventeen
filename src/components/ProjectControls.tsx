import { Component } from 'react';
import { RhythmeContextValue, withRythmeContext } from '../context/RhythmeContext';
import { downloadProject, pickProjectFile } from '../persistence/fileIO';
import { loadFromLocalStorage, saveToLocalStorage } from '../persistence/localStorage';
import { deserializeLayers, serialize } from '../persistence/serialization';
import { ProjectState } from '../persistence/types';
import { LayerMap } from '../types';

export interface ProjectControlsOwnProps {
  layers: LayerMap;
  /** Project loaded before SoundProvider existed — used to restore clock state on mount. */
  initialProject: ProjectState | null;
  onProjectLoad: (layers: LayerMap) => void;
}

interface ProjectControlsProps extends ProjectControlsOwnProps {
  contextValue: RhythmeContextValue;
}

class ProjectControlsInner extends Component<ProjectControlsProps> {
  private saveDebounce: ReturnType<typeof setTimeout> | null = null;

  componentDidMount(): void {
    // Restore clock state that couldn't be applied before SoundProvider mounted
    const p = this.props.initialProject;
    if (p) {
      this.props.contextValue.setClockMode(p.clockMode, p.midiInputId, p.midiOutputId);
      this.props.contextValue.updateContext({ speed: p.speed });
      // tempo was already passed as initialTempo to SoundProvider
    }
  }

  componentDidUpdate(prevProps: ProjectControlsProps): void {
    const { layers, contextValue: ctx } = this.props;
    const { layers: prevLayers, contextValue: prevCtx } = prevProps;
    const changed =
      layers !== prevLayers ||
      ctx.tempo !== prevCtx.tempo ||
      ctx.speed !== prevCtx.speed ||
      ctx.clockMode !== prevCtx.clockMode ||
      ctx.midiInputId !== prevCtx.midiInputId ||
      ctx.midiOutputId !== prevCtx.midiOutputId;

    if (changed) {
      if (this.saveDebounce !== null) clearTimeout(this.saveDebounce);
      this.saveDebounce = setTimeout(() => {
        saveToLocalStorage(this.getProject());
        this.saveDebounce = null;
      }, 1000);
    }
  }

  componentWillUnmount(): void {
    if (this.saveDebounce !== null) clearTimeout(this.saveDebounce);
  }

  getProject(): ProjectState {
    return serialize(this.props.layers, this.props.contextValue);
  }

  applyProject(project: ProjectState): void {
    this.props.onProjectLoad(deserializeLayers(project));
    this.props.contextValue.setClockMode(
      project.clockMode,
      project.midiInputId,
      project.midiOutputId
    );
    this.props.contextValue.updateContext({
      tempo: project.tempo,
      speed: project.speed,
    });
  }

  onSave(): void {
    downloadProject(this.getProject());
  }

  async onLoad(): Promise<void> {
    try {
      this.applyProject(await pickProjectFile());
    } catch (err) {
      if (err instanceof Error && err.message !== 'No file selected') {
        alert(`Failed to load project: ${err.message}`);
      }
    }
  }

  render() {
    return (
      <div className="project-controls">
        <button onClick={this.onSave.bind(this)}>Save</button>
        <button onClick={() => void this.onLoad()}>Load</button>
      </div>
    );
  }
}

export { loadFromLocalStorage };
export const ProjectControls = withRythmeContext(ProjectControlsInner);
