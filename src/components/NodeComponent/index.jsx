import React from 'react';

class NodeComponent extends React.Component {
    constructor(props){
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
}
 
export default NodeComponent;
