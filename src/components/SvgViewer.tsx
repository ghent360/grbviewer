import * as React from "react";
import {PolygonConverter} from "grbparser/dist/converters";
import {Point} from "grbparser/dist/point";
import {PolygonSet, Polygon} from "grbparser/dist/polygonSet";

export interface SvgViewerProps { 
    objects?: PolygonConverter;
    scale?:number;
    margin:number;
    layerColor:number;
}

interface SvgViewerState { 
    width:number;
    height:number;
    offset?:Point;
    scale:number;
}

interface PolygonProps {
    polygonSet:PolygonSet;
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


class PolygonBase extends React.Component<PolygonProps, {}> {
    transform(point:Point):Point {
        return point.scale(this.props.scale).add(this.props.offset);
    }

    prepareData(closed:boolean):string {
        let result:Array<String> = [];
        this.props.polygonSet
            .filter(p => p.length > 0)
            .forEach(polygon => {
            let start = this.transform(polygon[0]);
            let d = [`M ${start.x.toFixed(this.props.precision)} ${start.y.toFixed(this.props.precision)}`];

            let collector = polygon.slice(1).map(point => {
                let graphPoint = this.transform(point);
                return `L ${graphPoint.x.toFixed(this.props.precision)} ${graphPoint.y.toFixed(this.props.precision)}`;
            });
            result.push(d.concat(collector).join(' '));
        });
        if (closed) {
            result.push("z");
        }
        return result.join(' ');
    }
}

class SolidPolygon extends PolygonBase {
    render() {
        return <path d={this.prepareData(true)}
                     fill={colorToHtml(this.props.layerColor)}
                     fillOpacity="1"
                     fillRule="nonzero"
                     stroke="black"
                     strokeOpacity="0"
                     strokeWidth="0" />;
    }
}

class WirePolygon extends PolygonBase {
    render() {
        return <path d={this.prepareData(false)}
                     fillOpacity="0"
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
        let scale = props.scale ? props.scale : 1000;
        if (props.objects) {
            let width = props.objects.bounds.width * scale + props.margin * 2;
            let height = props.objects.bounds.height * scale + props.margin * 2;
            let offset = new Point(
                -props.objects.bounds.min.x * scale  + props.margin,
                -props.objects.bounds.min.y * scale + props.margin);
            return { 
                width:width,
                height:height,
                offset:offset,
                scale:scale
            };
        }
        return { 
            width:0,
            height:0,
            scale:scale
        };
    }

    componentWillReceiveProps(nextProps:Readonly<SvgViewerProps>) {
        if (nextProps.objects != this.props.objects) {
            this.setState(this.processProps(nextProps));
        }
    }

    render() {
        let key=0;
        let polygons:JSX.Element[] = [];
        if (this.props.objects) {
            polygons = [
                <SolidPolygon
                    polygonSet={this.props.objects.solids}
                    offset={this.state.offset}
                    scale={this.state.scale}
                    precision={3}
                    layerColor={this.props.layerColor}
                    key={"solid" + key++}/>,
                <WirePolygon
                    polygonSet={this.props.objects.thins}
                    offset={this.state.offset}
                    scale={this.state.scale}
                    precision={3}
                    layerColor={this.props.layerColor}
                    key={"thin" + key++}/>
            ];
        }
        return <svg width="100%" height="100%"
                    viewBox={ "0 0 " + this.state.width + " " + this.state.height}
                    version="1.1" xmlns="http://www.w3.org/2000/svg">
                    {polygons}
               </svg>;
    }
}