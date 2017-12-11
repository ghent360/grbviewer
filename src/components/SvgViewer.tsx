import * as React from "react";
import {ObjectConverter} from "grbparser/converters";
import {Point} from "grbparser/point";
import {PolygonSet, Polygon} from "grbparser/polygonSet";

export interface SvgViewerProps { 
    objects?: ObjectConverter;
    scale:number;
    margin:number;
    layerColor:number;
}

interface SvgViewerState { 
    width:number;
    height:number;
    offset?:Point;
}

interface PolygonProps {
    polygon:Polygon;
    offset:Point;
    scale:number;
    precision:number;
    layerColor:number;
}

function toString2(n:number):string {
    return ((n >>> 4) & 0xf).toString(16) +
        (n & 0xf).toString(16);
}

function colorToHtml(clr:number):string {
    let ss:string;
    ss = '#' + toString2((clr >>> 16) & 0xff)
        + toString2((clr >>> 8) & 0xff)
        + toString2(clr & 0xff);
    return ss;
}

class SolidPolygon extends React.Component<PolygonProps, {}> {
    transform(point:Point):Point {
        return point.scale(this.props.scale).add(this.props.offset);
    }

    prepareData() {
        let start = this.transform(this.props.polygon[0]);
        let d = [`M ${start.x.toFixed(this.props.precision)} ${start.y.toFixed(this.props.precision)}`];

        let collector = this.props.polygon.slice(1).map(point => {
            let graphPoint = this.transform(point);
            return `L ${graphPoint.x.toFixed(this.props.precision)} ${graphPoint.y.toFixed(this.props.precision)}`;
        });
        return d.concat(collector, "z").join(' ');
    }

    render() {
        return <path d={this.prepareData()}
                     fill={colorToHtml(this.props.layerColor)}
                     fillOpacity="1"
                     fillRule="nonzero"
                     stroke="black"
                     strokeOpacity="1"
                     strokeWidth="0" />;
    }
}

class WirePolygon extends React.Component<PolygonProps, {}> {
    transform(point:Point):Point {
        return point.scale(this.props.scale).add(this.props.offset);
    }

    prepareData() {
        let start = this.transform(this.props.polygon[0]);
        let d = [`M ${start.x.toFixed(this.props.precision)} ${start.y.toFixed(this.props.precision)}`];

        let collector = this.props.polygon.slice(1).map(point => {
            let graphPoint = this.transform(point);
            return `L ${graphPoint.x.toFixed(this.props.precision)} ${graphPoint.y.toFixed(this.props.precision)}`;
        });
        return d.concat(collector).join(' ');
    }

    render() {
        return <path d={this.prepareData()}
                     stroke={colorToHtml(this.props.layerColor)}
                     strokeWidth="1" />;
    }
}

export class SvgViewer extends React.Component<SvgViewerProps, SvgViewerState> {
    constructor(props:SvgViewerProps, context?:any) {
        super(props, context);
        this.state = this.processProps(props);
    }

    processProps(props:SvgViewerProps):SvgViewerState {
        if (props.objects) {
            let width = props.objects.bounds.width * props.scale + props.margin * 2;
            let height = props.objects.bounds.height * props.scale + props.margin * 2;
            let offset = new Point(
                -props.objects.bounds.min.x * props.scale  + props.margin,
                -props.objects.bounds.min.y * props.scale + props.margin);
            return { 
                width:width,
                height:height,
                offset:offset,
            };
        }
        return { 
            width:0,
            height:0,
        };
    }

    componentWillReceiveProps(nextProps:Readonly<SvgViewerProps>) {
        if (nextProps.objects != this.props.objects) {
            this.setState(this.processProps(nextProps));
        }
    }

    render() {
        let key=0;
        let solids:JSX.Element[] = []
        if (this.props.objects) {
            solids = this.props.objects.solids
                .filter(p => p.length > 1)
                .map(polygon =>
                    <SolidPolygon
                        polygon={polygon}
                        offset={this.state.offset}
                        scale={this.props.scale}
                        precision={3}
                        layerColor={this.props.layerColor}
                        key={key++}/>);
        }
        return <svg width="100%" height="100%"
                    viewBox={ "0 0 " + this.state.width + " " + this.state.height}
                    version="1.1" xmlns="http://www.w3.org/2000/svg">
                    {solids}
               </svg>;
    }
}