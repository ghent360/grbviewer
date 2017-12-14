import * as React from "react";

export interface HelloProps { 
    compiler: string;
    framework: string;
}

export class Hello extends React.Component<HelloProps, {}> {
    componentDidMount() {
        // if using React < 0.14, use this.refs.svg.getDOMNode().offsetWidth
        // let h1 = this.refs.h1 as HTMLHeadingElement;
        // console.log(`My width is ${h1.clientWidth}`);
    }

    render() {
        return <h1 ref="h1">Aloha from {this.props.compiler} and {this.props.framework}!</h1>;
    }
}