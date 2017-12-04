import * as React from "react";
import * as JSZip from 'jszip';
import {BoardLayer, BoardSide, GerberUtils} from "../GerberUtils";
import {LayerList} from "./LayerList";

export interface GerberViewerProps { 
    file: File;
}

class GerberFile {
    constructor(
        public fileName:string,
        public boardSide:BoardSide,
        public boardLayer:BoardLayer,
        public status:string,
        public content?:string) {}

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
    constructor(props:GerberViewerProps, context?:any) {
        super(props, context);
        this.state = { fileList:[] };
        if (this.props.file) {
            this.readFile(this.props.file);
        }
    }

    shouldComponentUpdate(
        nextProps:Readonly<GerberViewerProps>,
        nextState:Readonly<GerberViewerState>):boolean {
        if (nextState !== this.state) {
            return true;
        }
        if (nextProps.file !== this.props.file) {
            this.readFile(nextProps.file);
            return true;
        }
        return false;
    }

    readFile(file:File):void {
        let reader = new FileReader();
        reader.onload = (e:ProgressEvent) => {
            this.processFile(reader.result);
        };
        reader.onerror = (e:ErrorEvent) => {
            console.log("Error " + e.error);
        }
        reader.readAsArrayBuffer(file);
    }
    
    updateFile(fileName:string, content:string) {
        let fileList = this.state.fileList.slice();
        let newFileList = [];
        for (let gerberFile of fileList) {
            if (gerberFile.fileName === fileName) {
                let newGerberFile = new GerberFile(
                    gerberFile.fileName,
                    gerberFile.boardSide,
                    gerberFile.boardLayer,
                    "done",
                    content);
                newFileList.push(newGerberFile);
            } else {
                newFileList.push(gerberFile);
            }
        }
        this.setState({fileList:newFileList});
    }

    processFile(stream:ArrayBuffer):void {
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
                        (content) => this.updateFile(fileName, content)
                    );
                    console.log(`File '${fileName}' side: ${BoardSide[fileInfo.side]} layer: ${BoardLayer[fileInfo.layer]}`);
                }
                this.setState({fileList:fileList});
            });
    }
        
    render() {
        return <LayerList key="layerList" layers={this.state.fileList}/>
    }
}