import React from "react";
import NodeComponent from "../NodeComponent";
import { asNode } from "../NodeComponent";

const Osc = asNode(class extends React.Component {
    constructor(props) {
        super(props);
        this.oscillator = this.props.ac.createOscillator();
        this.oscillator.type = this.props.type || "sine";
        this.oscillator.frequency.value = this.props.frequency || 440;
        this.oscillator.connect(this.props.output);
        this.oscillator.start();
    }

    componentDidUpdate(prevProps) {
        if (this.props.type !== prevProps.type) {
            this.oscillator.type = this.props.type;
        }
        if (this.props.frequency !== prevProps.frequency) {
            this.oscillator.frequency.value = this.props.frequency;
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        this.oscillator.disconnect();
    }

    render() {
        if (this.props.headless) {
            return null
        }
        return null;
    }
}, true)

// class Osc extends NodeComponent {
//     constructor(props){
//         super(props, true);
//         debugger;
//         this.oscillator = this.props.ac.createOscillator();
//         this.oscillator.type = this.props.type || "sine";
//         this.oscillator.frequency.value = this.props.frequency || 440;
//         this.oscillator.connect(this.output);
//         this.oscillator.start();
//     }

//     componentDidUpdate(prevProps){
//         if(this.props.type !== prevProps.type){
//             this.oscillator.type = this.props.type;
//         }
//         if(this.props.frequency !== prevProps.frequency){
//             this.oscillator.frequency.value = this.props.frequency;
//         }
//     }

//     componentWillUnmount(){
//         super.componentWillUnmount();
//         this.oscillator.disconnect();
//     }

//     render() { 
//         if(this.props.headless){
//             return null
//         }
//         return null;
//     }
// }

export default Osc;