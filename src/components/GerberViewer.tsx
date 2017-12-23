import * as React from "react";
import * as JSZip from "jszip";
import {BoardLayer, BoardSide, GerberUtils} from "../../common/GerberUtils";
import {LayerList} from "./LayerList";
import {PolygonConverter} from "grbparser/dist/converters";
import {AsyncGerberParserInterface} from "../AsyncGerberParser";
import {GerberParserOutput} from "../../common/AsyncGerberParserAPI";

export interface GerberViewerProps { 
    file: File;
    onSelect?: (gerber:PolygonConverter) => void;
}

class GerberFile {
    constructor(
        public fileName:string,
        public boardSide:BoardSide,
        public boardLayer:BoardLayer,
        public status:string,
        public svg?:PolygonConverter) {}

    get layerName() {
        return BoardSide[this.boardSide];
    }

    get layerType() {
        return BoardLayer[this.boardLayer];
    }
}

class GerberViewerState {
    fileList: Array<GerberFile>;
}

export class GerberViewer extends React.Component<GerberViewerProps, GerberViewerState> {
    private gerberParser = new AsyncGerberParserInterface();

    constructor(props:GerberViewerProps, context?:any) {
        super(props, context);
        this.state = { fileList:[] };
        if (this.props.file) {
            this.readFile(this.props.file);
        }
    }

    componentWillReceiveProps(nextProps:Readonly<GerberViewerProps>) {
        if (nextProps.file !== this.props.file) {
            this.readFile(nextProps.file);
        }
    }

    readFile(file:File):void {
        let reader = new FileReader();
        reader.onload = (e:ProgressEvent) => {
            this.processGerberFile(reader.result);
        };
        reader.onerror = (e:ErrorEvent) => {
            console.log("Error " + e.error);
        }
        reader.readAsArrayBuffer(file);
    }

    processGerberOutput(output:GerberParserOutput) {
        let newFileList = [];
        let handled = false
        for (let gerberFile of this.state.fileList) {
            if (gerberFile.fileName === output.fileName) {
                let newGerberFile = new GerberFile(
                    output.fileName,
                    output.side ? output.side : gerberFile.boardSide,
                    output.layer ? output.layer :gerberFile.boardLayer,
                    output.status,
                    output.gerber);
                newFileList.push(newGerberFile);
                handled = true;
            } else {
                newFileList.push(gerberFile);
            }
        }
        if (!handled) {
            let newGerberFile = new GerberFile(
                output.fileName,
                output.side,
                output.layer,
                output.status,
                output.gerber);
            newFileList.push(newGerberFile);
        }
        this.setState({fileList:newFileList});
    }

    processGerberFile(stream:ArrayBuffer):void {
        this.setState({fileList:[]});
        this.gerberParser.scheduleWork(stream, (output) => this.processGerberOutput(output));
    }

    onClick(fileName:string) {
        let idx = this.state.fileList.findIndex(gf => gf.fileName === fileName);
        if (idx >= 0) {
            let item = this.state.fileList[idx];
            if (item.svg && this.props.onSelect) {
                this.props.onSelect(item.svg);
            }
        }
    }

    render() {
        return <LayerList
            key="layerList"
            layers={this.state.fileList}
            onClick={(fileName) => this.onClick(fileName)}/>
    }
}