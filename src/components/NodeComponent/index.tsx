import React from 'react';

interface NodeComponentProps {
  ac: AudioContext;
  isSource?: boolean;
  input?: AudioNode | null;
  output?: AudioNode;
}

class NodeComponent extends React.Component<NodeComponentProps> {
  isSource: boolean;
  input: GainNode | null;
  output: GainNode;

  constructor(props: NodeComponentProps) {
    super(props);
    this.isSource = props.isSource ?? false;
    this.input = this.isSource ? this.props.ac.createGain() : null;
    this.output = this.props.ac.createGain();
  }

  componentWillUnmount(): void {
    this.output.disconnect();
    if (this.input) {
      this.input.disconnect();
    }
  }

  render(): React.ReactNode {
    return null;
  }
}

export default NodeComponent;
