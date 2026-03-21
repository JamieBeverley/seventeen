import { Component } from 'react';
import { RhythmeContextValue, withRythmeContext } from '../context/RhythmeContext';
import { downloadProject, pickProjectFile } from '../persistence/fileIO';
import { deserializeLayers, serialize } from '../persistence/serialization';
import { ProjectState } from '../persistence/types';
import { LayerMap } from '../types';

export interface ProjectControlsOwnProps {
  layers: LayerMap;
  onProjectLoad: (layers: LayerMap) => void;
}

interface ProjectControlsProps extends ProjectControlsOwnProps {
  contextValue: RhythmeContextValue;
}

class ProjectControlsInner extends Component<ProjectControlsProps> {
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

export const ProjectControls = withRythmeContext(ProjectControlsInner);
