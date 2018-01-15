import * as React from "react";
import {BoardLayer, BoardSide} from "grbparser/dist/gerberutils";
import Dropdown, { Option } from 'react-dropdown';
import 'react-dropdown/style.css';

export interface LayerSideProps { 
    side: BoardSide;
}

export class LayerSide extends React.Component<LayerSideProps, {}> {
    constructor(props:LayerSideProps, context?:any) {
        super(props, context);
    }

    buildOptions():Array<Option> {
        let layer = this.props.side;
        const keys = Object.keys(BoardSide).filter(k => typeof BoardSide[k as any] === "number");
        let result = []
        for (let k of keys) {
            result.push({value:BoardSide[k].toString(), label:k});
        }
        return result;
    }

    render() {
        return <Dropdown 
            options={this.buildOptions()}
            value={{value:this.props.side.toString(), label:BoardSide[this.props.side]}}/>;
    }
}