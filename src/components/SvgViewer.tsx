import * as React from "react";
import { GerberPolygons, Bounds } from "../../common/AsyncGerberParserAPI";

export interface SvgViewerProps { 
    objects?: Array<GerberPolygons>;
    scale?:number;
    margin:number;
    layerColor:number;
}

interface SvgViewerState { 
    width:number;
    height:number;
    offset?:{x:number, y:number};
    scale:number;
}

interface PolygonProps {
    polygonSet:Array<Float64Array>;
    offset:{x:number, y:number};
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
    transform(point:{x:number, y:number}):{x:number, y:number} {
        return {
            x:point.x * this.props.scale + this.props.offset.x,
            y:point.y * this.props.scale + this.props.offset.y
        };
    }

    prepareData(closed:boolean):string {
        let result:Array<String> = [];
        this.props.polygonSet
            .forEach(polygon => {
                let start = this.transform({x:polygon[0], y:polygon[1]});
                let d = [`M ${start.x.toFixed(this.props.precision)} ${start.y.toFixed(this.props.precision)}`];

                let collector:Array<string> = [];
                for (let idx = 2; idx < polygon.length; idx += 2) {
                    let graphPoint = this.transform({x:polygon[idx], y:polygon[idx + 1]});
                    collector.push(
                        `L ${graphPoint.x.toFixed(this.props.precision)}`,
                        ` ${graphPoint.y.toFixed(this.props.precision)}`);
                }
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

function calcBounds(objects:Array<GerberPolygons>):Bounds {
    let result:{minx:number, miny:number, maxx:number, maxy:number} = objects[0].bounds;
    objects.slice(1).forEach(o => {
        if (o.bounds.minx < result.minx) {
            result.minx = o.bounds.minx;
        }
        if (o.bounds.miny < result.miny) {
            result.miny = o.bounds.miny;
        }
        if (o.bounds.maxx > result.maxx) {
            result.maxx = o.bounds.maxx;
        }
        if (o.bounds.maxy > result.maxy) {
            result.maxy = o.bounds.maxy;
        }
    });
    return result;
}

export class SvgViewer extends React.Component<SvgViewerProps, SvgViewerState> {
    constructor(props:SvgViewerProps, context?:any) {
        super(props, context);
        this.state = this.processProps(props);
    }

    processProps(props:SvgViewerProps):SvgViewerState {
        let scale = props.scale ? props.scale : 1000;
        if (props.objects && props.objects.length > 0) {
            let bounds = calcBounds(props.objects);
            let width = (bounds.maxx - bounds.minx) * scale + props.margin * 2;
            let height = (bounds.maxy - bounds.miny) * scale + props.margin * 2;
            let offset = {
                x:-bounds.minx * scale + props.margin,
                y:-bounds.miny * scale + props.margin
            };
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
        this.setState(this.processProps(nextProps));
    }

    render() {
        let key=0;
        let polygons:JSX.Element[] = [];
        if (this.props.objects) {
            this.props.objects.forEach( o => {
                polygons.push(
                    <SolidPolygon
                        polygonSet={o.solids}
                        offset={this.state.offset}
                        scale={this.state.scale}
                        precision={3}
                        layerColor={this.props.layerColor}
                        key={"solid" + key++}/>,
                    <WirePolygon
                        polygonSet={o.thins}
                        offset={this.state.offset}
                        scale={this.state.scale}
                        precision={3}
                        layerColor={this.props.layerColor}
                        key={"thin" + key++}/>
                );
            });
        }
        return <svg width="100%" height="100%"
                    viewBox={ "0 0 " + this.state.width + " " + this.state.height}
                    version="1.1" xmlns="http://www.w3.org/2000/svg">
                    {polygons}
               </svg>;
    }
}