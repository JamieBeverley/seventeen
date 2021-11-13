class Button extends Component {
  render() {
    const className = `${this.props.on ? "on" : ""} ${this.props.trig ? "trig" : ""}`;
    return (
      <div className={`button ${className}`} onClick={this.props.onClick}></div>
    )
  }
}