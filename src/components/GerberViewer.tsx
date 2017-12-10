import * as React from "react";
import * as JSZip from "jszip";
import * as pako from "pako";
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
    private static toSvgUrl = "http://localhost:3000/tosvg";

    constructor(props:GerberViewerProps, context?:any) {
        super(props, context);
        this.state = { fileList:[] };
        if (this.props.file) {
            this.readFile(this.props.file);
        }
    }

    gerberToSvg(fileName:string, content:string) {
        let myHeaders = new Headers({
            "Content-Type": "text/plain",
            "Content-Encoding": "gzip",
            //"X-Api-Key": "W3taPLShAb8jgGl6LfitO4PkumriMv6K1h9Z0JjJ"
        });
        let compressedGerber = new Buffer(pako.gzip(content)).toString('base64');
        console.log(`Gerber ${fileName} size ${compressedGerber.length}`);
        let myInit:RequestInit = {
            method: 'POST',
            body: compressedGerber,
            mode: "cors",
            headers: myHeaders
        };
        let request = new Request(GerberViewer.toSvgUrl, myInit);
        fetch(request)
            .then((response) => {
                if (response.ok) {
                    return response.text()
                        .then((responseText) => this.receiveSvg(fileName, responseText));
                }
                console.log(`error: ${response}`);
            })
            .catch((error) => console.log(`ToSVG error: ${error}`));
    }

    receiveSvg(fileName:string, svgEncoded:string) {
        let newFileList = [];
        let status = "done";
        let bfr = Buffer.from(svgEncoded, 'base64');
        let svg = pako.ungzip(bfr, {to:'string'});
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