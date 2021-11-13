import React from "react";

var AudioContext = window.AudioContext || window.webkitAudioContext;
var ac = new AudioContext();

const withAudioContext = Component => class extends React.Component {
    render(){
        return (
            <Component {...this.props} ac={ac}/>
        )
    }
}

// props => {
//     debugger;
//     return(
//         <Component {...props} ac={ac}/>
//     )
// }

export default withAudioContext;
