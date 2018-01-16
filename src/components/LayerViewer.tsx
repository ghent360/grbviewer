import * as React from "react";
import * as JSZip from "jszip";
import {BoardLayer, BoardSide, GerberUtils} from "grbparser/dist/gerberutils";
import {LayerList} from "./LayerList";
import {AsyncGerberParserInterface} from "../AsyncGerberParser";
import {GerberParserOutput, GerberPolygons} from "../../common/AsyncGerberParserAPI";
import * as ReactGA from 'react-ga';

export interface LayerViewerProps { 
    file: File;
    onSelectChange?: (selection:Array<LayerInfo>) => void;
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
}

export class LayerFile implements LayerInfo {
    constructor(
        public fileName:string,
        public boardSide:BoardSide,
        public boardLayer:BoardLayer,
        public status:string,
        public content:string,
        public polygons:GerberPolygons,
        public selected:boolean) {}
}

class LayerViewerState {
    layerList: Array<LayerFile>;
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
        reader.onerror = (e:ErrorEvent) => {
            console.log("Error " + e.error);
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
                    gerberFile.selected);
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
                    gerberFile.selected);
            }
            return gerberFile;
        });
        ReactGA.event({ category:'User', action: 'change side', label:fileName, value:side });
        this.setState({layerList:newFileList});
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
            this.props.onSelectChange(layerList.filter(l => l.selected));
        }
    }

    processGerberOutput(output:GerberParserOutput) {
        let newFileList = [];
        let handled = false
        for (let gerberFile of this.state.layerList) {
            if (gerberFile.fileName === output.fileName) {
                let newGerberFile = new LayerFile(
                    output.fileName,
                    output.side ? output.side : gerberFile.boardSide,
                    output.layer ? output.layer : gerberFile.boardLayer,
                    output.status,
                    output.content ? output.content : gerberFile.content,
                    output.gerber,
                    false);
                newFileList.push(newGerberFile);
                handled = true;
            } else {
                newFileList.push(gerberFile);
            }
        }
        if (!handled) {
            let newGerberFile = new LayerFile(
                output.fileName,
                output.side,
                output.layer,
                output.status,
                output.content,
                output.gerber,
                false);
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
            onChangeSide={(fileName, side) => this.onChangeSide(fileName, side)}/>
    }
}