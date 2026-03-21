import { Component } from 'react';

interface ButtonProps {
  on: boolean;
  trig: boolean;
  onClick: () => void;
}

export class Button extends Component<ButtonProps> {
  render() {
    const className = `${this.props.on ? 'on' : ''} ${this.props.trig ? 'trig' : ''}`;
    return (
      <div className={`button ${className}`} onClick={this.props.onClick}></div>
    );
  }
}
