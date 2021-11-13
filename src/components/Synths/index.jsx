import NodeComponent from "../NodeComponent";
import MixerNode from "../Mixer";
import Osc from "../Osc";

class Synth extends NodeComponent {
    render() { 
        return (
            <MixerNode>
                <Osc
                  type="sine"
                  frequency={440}
                />
                <Osc
                  type="sine"
                  frequency={440*3/2}
                />
            </MixerNode>
        )
    }
}
 
export default Synth;