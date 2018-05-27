import * as React from "react";
import * as JSZip from "jszip";
import {BoardLayer, BoardSide, GerberUtils} from "grbparser/dist/gerberutils";
import {LayerList} from "./LayerList";
import {AsyncGerberParserInterface} from "../AsyncGerberParser";
import {GerberParserOutput, GerberPolygons, Bounds} from "../../common/AsyncGerberParserAPI";
import * as ReactGA from 'react-ga';

export interface LayerViewerProps { 
    file: File;
    onSelectChange?: (selection:Array<LayerInfo>, bounds:Bounds) => void;
    onNewFile?: () => void;
    style?: React.CSSProperties;
}

export interface LayerInfo {
    readonly fileName:string;
    readonly boardLayer:BoardLayer,
    readonly boardSide:BoardSide,
    readonly status:string;
    readonly polygons:GerberPolygons,
    readonly content:string,
    readonly selected:boolean;
    readonly opacity:number;
    readonly solid:Path2D;
    readonly thin:Path2D;
}

class LayerFile implements LayerInfo {
    constructor(
        public fileName:string,
        public boardSide:BoardSide,
        public boardLayer:BoardLayer,
        public status:string,
        public content:string,
        public polygons:GerberPolygons,
        public selected:boolean,
        public opacity:number,
        public solid:Path2D,
        public thin:Path2D) {}
}

class LayerViewerState {
    layerList: Array<LayerFile>;
}

function drawPolygon(polygon:Float64Array, context:Path2D) {
    context.moveTo(polygon[0], polygon[1]);
    for (let idx = 2; idx < polygon.length; idx += 2) {
        context.lineTo(polygon[idx], polygon[idx + 1]);
    }
}

function createPathCache(polygons:GerberPolygons):{solid:Path2D, thin:Path2D} {
    let solidPath = new Path2D();
    let isEmpty = true;
    polygons.solids
        .filter(p => p.length > 1)
        .forEach(p => {
            drawPolygon(p, solidPath);
            isEmpty = false;
        });
    if (!isEmpty) {
        solidPath.closePath();
    } else {
        solidPath = undefined;
    }
    let thinPath = new Path2D();
    isEmpty = true;
    polygons.thins
        .filter(p => p.length > 1)
        .forEach(p => {
            drawPolygon(p, thinPath);
            isEmpty = false;
        });
    if (isEmpty) {
        thinPath = undefined;
    }
    return {solid:solidPath, thin:thinPath};
}

function calcBounds(selection:Array<LayerInfo>):Bounds {
    if (selection.length == 0) {
        return undefined;
    }
    let result:{minx:number, miny:number, maxx:number, maxy:number} = selection[0].polygons.bounds;
    selection.slice(1).forEach(o => {
        let bounds = o.polygons.bounds;
        if (bounds.minx < result.minx) {
            result.minx = bounds.minx;
        }
        if (bounds.miny < result.miny) {
            result.miny = bounds.miny;
        }
        if (bounds.maxx > result.maxx) {
            result.maxx = bounds.maxx;
        }
        if (bounds.maxy > result.maxy) {
            result.maxy = bounds.maxy;
        }
    });
    return result;
}

export class LayerViewer extends React.Component<LayerViewerProps, LayerViewerState> {
    private gerberParser:AsyncGerberParserInterface;

    constructor(props:LayerViewerProps, context?:any) {
        super(props, context);
        this.state = { layerList:[] };
        if (this.props.file) {
            this.readZipFile(this.props.file);
        }
    }

    componentWillReceiveProps(nextProps:Readonly<LayerViewerProps>) {
        if (nextProps.file !== this.props.file) {
            this.readZipFile(nextProps.file);
        }
    }

    readZipFile(file:File):void {
        ReactGA.event({ category:'User', action: 'Open a file'});
        let reader = new FileReader();
        reader.onload = (e:ProgressEvent) => {
            this.processZipFile(reader.result);
        };
        reader.onerror = (e:any) => {
            console.log("Error: " + e.error);
            ReactGA.exception({
                description: 'Read input file error.',
                fatal: true
            });
        }
        reader.readAsArrayBuffer(file);
    }

    onChangeLayer(fileName:string, layer:BoardLayer) {
        let newFileList = this.state.layerList.map(gerberFile => {
            if (gerberFile.fileName === fileName) {
                return new LayerFile(
                    gerberFile.fileName,
                    gerberFile.boardSide,
                    layer,
                    gerberFile.status,
                    gerberFile.content,
                    gerberFile.polygons,
                    gerberFile.selected, 
                    gerberFile.opacity,
                    gerberFile.solid,
                    gerberFile.thin);
            }
            return gerberFile;
        });
        ReactGA.event({ category:'User', action: 'change layer', label:fileName, value:layer });
        this.setState({layerList:newFileList});
    }

    onChangeSide(fileName:string, side:BoardSide) {
        let newFileList = this.state.layerList.map(gerberFile => {
            if (gerberFile.fileName === fileName) {
                return new LayerFile(
                    gerberFile.fileName,
                    side,
                    gerberFile.boardLayer,
                    gerberFile.status,
                    gerberFile.content,
                    gerberFile.polygons,
                    gerberFile.selected,
                    gerberFile.opacity,
                    gerberFile.solid,
                    gerberFile.thin);
            }
            return gerberFile;
        });
        ReactGA.event({ category:'User', action: 'change side', label:fileName, value:side });
        this.setState({layerList:newFileList});
    }

    onChangeOpacity(fileName:string, opacity:number) {
        let newFileList = this.state.layerList.map(gerberFile => {
            if (gerberFile.fileName === fileName) {
                return new LayerFile(
                    gerberFile.fileName,
                    gerberFile.boardSide,
                    gerberFile.boardLayer,
                    gerberFile.status,
                    gerberFile.content,
                    gerberFile.polygons,
                    gerberFile.selected,
                    opacity,
                    gerberFile.solid,
                    gerberFile.thin);
            }
            return gerberFile;
        });
        this.setState({layerList:newFileList});
        if (this.props.onSelectChange) {
            let selection = newFileList.filter(l => l.selected);
            this.props.onSelectChange(selection, calcBounds(selection));
        }
    }

    onClick(fileName:string) {
        let layerList = this.state.layerList.map(l => {
            if (l.fileName == fileName) {
                l.selected = !l.selected;
            }
            return l;
        });
        this.setState({layerList:layerList});
        if (this.props.onSelectChange) {
            let selection = layerList.filter(l => l.selected);
            this.props.onSelectChange(selection, calcBounds(selection));
        }
    }

    processGerberOutput(output:GerberParserOutput) {
        let newFileList = [];
        let handled = false
        for (let gerberFile of this.state.layerList) {
            if (gerberFile.fileName === output.fileName) {
                let cache = output.gerber ? createPathCache(output.gerber) : undefined;
                let newGerberFile = new LayerFile(
                    output.fileName,
                    output.side ? output.side : gerberFile.boardSide,
                    output.layer ? output.layer : gerberFile.boardLayer,
                    output.status,
                    output.content ? output.content : gerberFile.content,
                    output.gerber,
                    false,
                    1,
                    cache ? cache.solid : undefined,
                    cache ? cache.thin : undefined);
                newFileList.push(newGerberFile);
                handled = true;
            } else {
                newFileList.push(gerberFile);
            }
        }
        if (!handled) {
            let cache = output.gerber ? createPathCache(output.gerber) : undefined;
            let newGerberFile = new LayerFile(
                output.fileName,
                output.side,
                output.layer,
                output.status,
                output.content,
                output.gerber,
                false,
                1,
                cache ? cache.solid : undefined,
                cache ? cache.thin : undefined);
            newFileList.push(newGerberFile);
        }
        if (output.status === 'error') {
            console.log(`Reporting error ${output.exception}`);
            ReactGA.exception({
                description: `Rendering error: ${output.exception}`,
                fatal: true
            });
        } else if (output.status === 'done') {
            ReactGA.event({ category:'User', action: 'render gerber', label:output.fileName});
        }
        if (output.unzipTime) {
            ReactGA.timing({
                category: 'Processing',
                variable: 'unzip',
                value: output.unzipTime, // in milliseconds
                label: 'JSZip'
            });
        }
        if (output.renderTime) {
            ReactGA.timing({
                category: 'Processing',
                variable: 'render',
                value: output.renderTime, // in milliseconds
                label: 'grbparser'
            });
        }
        this.setState({layerList:newFileList});
    }

    processZipFile(stream:ArrayBuffer):void {
        this.setState({layerList:[]});
        if (this.props.onNewFile) {
            this.props.onNewFile();
        }
        // Kill the old processing thread
        if (this.gerberParser) {
            this.gerberParser.terminate();
        }
        this.gerberParser = new AsyncGerberParserInterface();
        this.gerberParser.scheduleWork(stream, (output) => this.processGerberOutput(output));
    }

    render() {
        return <LayerList
            style={this.props.style}
            key="layerList"
            layers={this.state.layerList}
            onClick={(fileName) => this.onClick(fileName)}
            onChangeLayer={(fileName, layer) => this.onChangeLayer(fileName, layer)}
            onChangeSide={(fileName, side) => this.onChangeSide(fileName, side)}
            onChangeOpacity={(fileName, opacity) => this.onChangeOpacity(fileName, opacity)}/>
    }
}