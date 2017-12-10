import * as React from "react";
import * as JSZip from "jszip";
import {BoardLayer, BoardSide, GerberUtils} from "../GerberUtils";
import {LayerList} from "./LayerList";
import {SVGConverter} from "grbparser/converters";

export interface GerberViewerProps { 
    file: File;
}

class GerberFile {
    constructor(
        public fileName:string,
        public boardSide:BoardSide,
        public boardLayer:BoardLayer,
        public status:string,
        public content?:string,
        public svg?:string) {}

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
    //private gerberParser = new AsyncGerberParser();

    constructor(props:GerberViewerProps, context?:any) {
        super(props, context);
        this.state = { fileList:[] };
        if (this.props.file) {
            this.readFile(this.props.file);
        }
    }

    gerberToSvg(fileName:string, content:string) {
        SVGConverter.WaitInit(() => {
            let svg = SVGConverter.GerberToSvg(content);
            this.receiveSvg(fileName, svg);
        });
    }

    receiveSvg(fileName:string, svg:string) {
        let newFileList = [];
        let status = "done";
        if (!svg.startsWith("<?xml")) {
            status = "error";
        }
        for (let gerberFile of this.state.fileList) {
            if (gerberFile.fileName === fileName) {
                let newGerberFile = new GerberFile(
                    gerberFile.fileName,
                    gerberFile.boardSide,
                    gerberFile.boardLayer,
                    status,
                    gerberFile.content,
                    svg);
                newFileList.push(newGerberFile);
            } else {
                newFileList.push(gerberFile);
            }
        }
        this.setState({fileList:newFileList});
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
    
    receiveFileContent(fileName:string, content:string) {
        let newFileList = [];
        for (let gerberFile of this.state.fileList) {
            if (gerberFile.fileName === fileName) {
                let newGerberFile = new GerberFile(
                    gerberFile.fileName,
                    gerberFile.boardSide,
                    gerberFile.boardLayer,
                    "Rendering",
                    content);
                newFileList.push(newGerberFile);
                this.gerberToSvg(fileName, content);
            } else {
                newFileList.push(gerberFile);
            }
        }
        this.setState({fileList:newFileList});
    }

    processGerberFile(stream:ArrayBuffer):void {
        new JSZip().loadAsync(stream).then(
            zip => {
                let fileList:Array<GerberFile> = [];
                for(let fileName in zip.files) {
                    let fileInfo = GerberUtils.determineSideAndLayer(fileName);
                    if (fileInfo.side === BoardSide.Unknown
                        || fileInfo.layer === BoardLayer.Unknown) {
                        console.log(`Ignoring ${fileName}`);
                        continue;
                    }
                    fileList.push(new GerberFile(fileName, fileInfo.side, fileInfo.layer, "Processing"));
                    zip.files[fileName].async("text").then(
                        (content) => this.receiveFileContent(fileName, content)
                    );
                    //console.log(`File '${fileName}' side: ${BoardSide[fileInfo.side]} layer: ${BoardLayer[fileInfo.layer]}`);
                }
                this.setState({fileList:fileList});
            });
    }
        
    render() {
        return <LayerList key="layerList" layers={this.state.fileList}/>
    }
}