import React from 'react';
import withAudioContext from '../../audioContext';

export const asNode = (Component, isSource=false) => withAudioContext(class extends React.Component{
    constructor(props){
        super(props);
        this.isSource = isSource
        this.input = this.isSource ? this.props.ac.createGain() : null;
        this.output = this.props.ac.createGain();
        this.output.connect(this.props.output);
    }

    componentDidUpdate(prevProps){
        if(this.props.output !== prevProps.output){
            this.output(prevProps.output);
        }
        if(this.input && (this.props.input !== prevProps.input)){
            this.input.disconnect(this.props.input);
            this.props.input.connect(this.input);
        }
    }

    componentWillUnmount(){
        this.output.disconnect();
        if(this.input){
            this.input.disconnect();
        }
    }
    
    render(){
        const props = {
            ...this.props,
            input: this.input,
            output: this.output,
        }

        return(
            <Component {...props}/>
        )
    }
})

const NodeComponent = withAudioContext(class extends React.Component {
    constructor(props, isSource=false){
        debugger;
        super(props);
        this.isSource = isSource
        this.input = this.isSource ? this.props.ac.createGain() : null;
        this.output = this.props.ac.createGain();
    }

    componentWillUnmount(){
        this.output.disconnect();
        if(this.input){
            this.input.disconnect();
        }
    }

    // componentDidMount(){
    //     if(this.input){
    //         this.props.input.connect(this.input);
    //     }
    //     this.output.connect(this.props.output);
    // }

    // componentDidUpdate(prevProps, prevState){
    //     if(this.input && this.props.input !== prevProps.input){
    //         prevProps.input.disconnect(this.input);
    //         this.props.input.connect(this.input);
    //     }
    //     if(this.props.output !== prevProps.output){
    //         this.output.disconnect(prevProps.output);
    //         this.output.connect(this.props.output);
    //     }
    // }

    render = () => null;
})

// class NodeComponent extends React.Component {
//     constructor(props, isSource=false){
//         debugger;
//         super(props);
//         this.isSource = isSource
//         this.input = this.isSource ? this.props.ac.createGain() : null;
//         this.output = this.props.ac.createGain();
//     }

//     componentWillUnmount(){
//         this.output.disconnect();
//         if(this.input){
//             this.input.disconnect();
//         }
//     }

//     // componentDidMount(){
//     //     if(this.input){
//     //         this.props.input.connect(this.input);
//     //     }
//     //     this.output.connect(this.props.output);
//     // }

//     // componentDidUpdate(prevProps, prevState){
//     //     if(this.input && this.props.input !== prevProps.input){
//     //         prevProps.input.disconnect(this.input);
//     //         this.props.input.connect(this.input);
//     //     }
//     //     if(this.props.output !== prevProps.output){
//     //         this.output.disconnect(prevProps.output);
//     //         this.output.connect(this.props.output);
//     //     }
//     // }

//     render = () => null;
// }

export default NodeComponent;
