import React from 'react';
import {asNode} from '../NodeComponent';

const MixerNode = asNode(class extends React.Component {
    constructor(props){ 
        super(props);
        this.node = this.props.ac.createGain();
        this.node.connect(this.props.output);
    }

    connectChildren(){
        // this.props.children.forEach(child => {
        //     // this.props.input.connect(child.props.input);
        //     debugger;
        //     child.props.output.connect(this.props.output);
        // });
    }

    componentDidMount(){
        this.connectChildren();
    }

    componentDidUpdate(prevProps){
        if(this.props.children !== prevProps.children){
            prevProps.children.forEach(child => {
                child.output.disconnect();
            });
            this.connectChildren();
        }
    }

    render() {
        if(this.props.headless){
            return null;
        }
        return (
            <>
              {this.props.children}
            </>
        )
    }
})
 
export default MixerNode;
