import NodeComponent from '../NodeComponent';
import React from 'react';

interface MixerNodeProps {
  ac: AudioContext;
  isSource?: boolean;
  headless?: boolean;
  children?: NodeComponent[];
}

class MixerNode extends NodeComponent {
  declare props: MixerNodeProps;

  constructor(props: MixerNodeProps) {
    super(props);
  }

  connectChildren(): void {
    if (!this.props.children) return;
    this.props.children.forEach((child) => {
      if (this.input) {
        this.input.connect(child.input as AudioNode);
      }
      child.output.connect(this.output);
    });
  }

  componentDidMount(): void {
    this.connectChildren();
  }

  componentDidUpdate(prevProps: MixerNodeProps): void {
    if (this.props.children !== prevProps.children) {
      if (prevProps.children) {
        prevProps.children.forEach((child) => {
          child.output.disconnect();
        });
      }
      this.connectChildren();
    }
  }

  render(): React.ReactNode {
    if (this.props.headless) {
      return null;
    }
    return <>{this.props.children}</>;
  }
}

export default MixerNode;
