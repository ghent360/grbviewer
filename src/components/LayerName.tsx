import * as React from "react";
import {BoardLayer} from "grbparser/dist/gerberutils";
import Dropdown, { Option } from 'react-dropdown';
import 'react-dropdown/style.css';

export interface LayerNameProps { 
    layer: BoardLayer;
}

export class LayerName extends React.Component<LayerNameProps, {}> {
    constructor(props:LayerNameProps, context?:any) {
        super(props, context);
    }

    buildOptions():Array<Option> {
        let layer = this.props.layer;
        const keys = Object.keys(BoardLayer).filter(k => typeof BoardLayer[k as any] === "number");
        let result = []
        for (let k of keys) {
            result.push({value:BoardLayer[k].toString(), label:k});
        }
        return result;
    }

    render() {
        return <Dropdown 
            options={this.buildOptions()}
            value={{value:this.props.layer.toString(), label:BoardLayer[this.props.layer]}}/>;
    }
}