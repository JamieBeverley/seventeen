import NodeComponent from '../NodeComponent';

class MixerNode extends NodeComponent {
    constructor(props){
        super(props)
    }

    connectChildren(){
        this.props.children.forEach(child => {
            this.input.connect(child.input);
            child.output.connect(this.output);
        });
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
}
 
export default MixerNode;
