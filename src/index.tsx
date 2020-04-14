import * as React from "react";
import * as ReactDOM from "react-dom";

import {Hello} from "./components/Hello";
import {LayerName} from "./components/LayerName";
import {FileOpenButton} from "./components/FileOpenButton";
import {CanvasViewer} from "./components/CanvasViewer";
import * as ReactGA from 'react-ga';
import {GerberPolygons, Bounds, GerberParserOutput, ExcellonHoles, ComponentCenters,FileContent} from "../common/AsyncGerberParserAPI";
import {Build} from "../common/build";
import {BoardLayer, BoardSide} from "../../grbparser/dist/gerberutils";
import {AsyncGerberParserInterface} from "./AsyncGerberParser";
import {LayerList} from "./components/LayerList";
import * as Color from 'color';
import { DrillHole } from "grbparser/dist/excellonparser";

export interface LayerInfo {
    readonly fileName:string;
    readonly boardLayer:BoardLayer,
    readonly boardSide:BoardSide,
    readonly status:string;
    readonly polygons:GerberPolygons,
    readonly holes:ExcellonHoles,
    readonly centers:ComponentCenters;
    readonly content:string,
    readonly selected:boolean;
    readonly opacity:number;
    readonly solid:Path2D;
    readonly thin:Path2D;
    readonly color:Color;
}

// Oshpark mask #2b1444
//
// FR4 #ab9f15
export const colorFR4 = '#ab9f15';
export const colorENIG = '#d8bf8a';
export const colorHASL = '#cad4c9';
export const colorGreen = '#0e8044';

const layerColors = {
    0:"#e9b397",    // Copper
    1:colorENIG,    // SolderMask
    2:"white",      // Silk // #c2d3df
    3:"silver",     // Paste
    4:"white",      // Drill
    5:"black",      // Mill
    6:"black",      // Outline
    7:"carbon",     // Carbon
    8:"green",      // Notes
    9:"yellow",     // Assembly
    10:"brown",     // Mechanical
    11:"black",     // Unknown
};

class LayerFile implements LayerInfo {
    constructor(
        public fileName:string,
        public boardSide:BoardSide,
        public boardLayer:BoardLayer,
        public status:string,
        public content:string,
        public polygons:GerberPolygons,
        public holes:ExcellonHoles,
        public centers:ComponentCenters,
        public selected:boolean,
        public opacity:number,
        public solid:Path2D,
        public thin:Path2D,
        public color:Color) {}
}

class AppState {
    file:File;
    layerList:Array<LayerFile>;
    bounds:Bounds;
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
    let result = {
        minx:Number.MAX_SAFE_INTEGER,
        miny:Number.MAX_SAFE_INTEGER,
        maxx:Number.MIN_SAFE_INTEGER,
        maxy:Number.MIN_SAFE_INTEGER,
    };
    selection.forEach(o => {
        let bounds:Bounds;
        if (o.polygons) {
            bounds = o.polygons.bounds;
        } else if (o.holes) {
            bounds = o.holes.bounds;
        } else if (o.centers) {
            bounds = o.centers.bounds;
        }
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

class FileReaderList {
    private incomplete:number;
    private content:Map<string, string> = new Map();
    private result:Array<FileContent> = [];

    constructor(readonly files:Array<File>) {
        this.incomplete = files.length;
        console.log(`created file reader for ${this.incomplete} files`);
    }

    read(cb:(contnent:Array<FileContent>) => void) {
        this.files.forEach(file => {
            let reader = new FileReader();
            reader.onload = (e:ProgressEvent) => {
                this.content.set(file.name, reader.result as string);
                this.incomplete--;
                if (this.incomplete == 0) {
                    this.content.forEach((v:string, k:string) => {
                        this.result.push({fileName:k, content:v});
                    });
                    if (cb) {
                        cb(this.result);
                    }
                }
            };
            reader.onerror = (e:any) => {
                console.log("Error: " + e.error);
                /*ReactGA.exception({
                    description: 'Read input file error.',
                    fatal: true
                });*/
            }
            reader.readAsText(file);
        });
    }

    isComplete() {
        return this.incomplete > 0;
    }

    getResult():Array<FileContent> {
        return this.result;
    }
}

class App extends React.Component<{}, AppState> {
    private gerberParser:AsyncGerberParserInterface;
    
    constructor(props:{}, context?:any) {
        super(props, context);
        this.state = { file:null, layerList:[], bounds:undefined };
        ReactGA.initialize('UA-111584522-1', {debug: false});
        ReactGA.pageview(window.location.pathname + window.location.search);
    }

    handleChangeFile(file:File) {
        this.setState({file:file, layerList:[], bounds:undefined});
        this.readZipFile(file);
    }

    readZipFile(file:File):void {
        let reader = new FileReader();
        reader.onload = (e:ProgressEvent) => {
            this.processZipFile(reader.result as ArrayBuffer);
        };
        reader.onerror = (e:any) => {
            console.log("Error: " + e.error);
            /*ReactGA.exception({
                description: 'Read input file error.',
                fatal: true
            });*/
        }
        reader.readAsArrayBuffer(file);
    }

    readFiles(files:Array<File>) {
        let reader = new FileReaderList(files);
        reader.read((content:Array<FileContent>) => this.processFiles(content));
    }

    processFiles(content:Array<FileContent>) {
        this.setState({layerList:[], bounds:undefined});
        // Kill the old processing thread
        if (this.gerberParser) {
            this.gerberParser.terminate();
        }
        this.gerberParser = new AsyncGerberParserInterface();
        console.log(`scheduling work`);
        this.gerberParser.scheduleWork(
            {files:content}, (output) => this.processGerberOutput(output));
    }

    processZipFile(stream:ArrayBuffer):void {
        this.setState({layerList:[], bounds:undefined});
        // Kill the old processing thread
        if (this.gerberParser) {
            this.gerberParser.terminate();
        }
        this.gerberParser = new AsyncGerberParserInterface();
        this.gerberParser.scheduleWork(
            {zipFileBuffer:stream}, (output) => this.processGerberOutput(output));
    }

    processGerberOutput(output:GerberParserOutput) {
        let newFileList = [];
        let handled = false
        for (let gerberFile of this.state.layerList) {
            if (gerberFile.fileName === output.fileName) {
                let cache = 
                    gerberFile.solid == undefined
                    && gerberFile.thin == undefined
                    && output.gerber ? createPathCache(output.gerber) : undefined;
                let layer = output.layer ? output.layer : gerberFile.boardLayer;
                let newGerberFile = new LayerFile(
                    output.fileName,
                    output.side ? output.side : gerberFile.boardSide,
                    layer,
                    output.status,
                    output.content ? output.content : gerberFile.content,
                    output.gerber,
                    output.holes,
                    output.centers,
                    false,
                    1,
                    cache ? cache.solid : gerberFile.solid,
                    cache ? cache.thin : gerberFile.thin,
                    Color(layerColors[layer]));
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
                output.holes,
                output.centers,
                false,
                1,
                cache ? cache.solid : undefined,
                cache ? cache.thin : undefined,
                Color(layerColors[output.layer]));
            newFileList.push(newGerberFile);
        }
        if (output.status === 'error') {
            console.log(`Reporting error ${output.exception}`);
            /*ReactGA.exception({
                description: `Rendering error: ${output.exception}`,
                fatal: true
            });*/
        }
        this.setState({layerList:newFileList});
    }

    onChangeLayer(fileName:string, layer:BoardLayer) {
        let layerList = this.state.layerList.map(gerberFile => {
            if (gerberFile.fileName === fileName) {
                gerberFile.boardLayer = layer;
                gerberFile.color = Color(layerColors[layer]);
            }
            return gerberFile;
        });
        //ReactGA.event({ category:'User', action: 'change layer', label:fileName, value:layer });
        this.setState({layerList:layerList});
    }

    onChangeSide(fileName:string, side:BoardSide) {
        let layerList = this.state.layerList.map(gerberFile => {
            if (gerberFile.fileName === fileName) {
                gerberFile.boardSide = side;
            }
            return gerberFile;
        });
        //ReactGA.event({ category:'User', action: 'change side', label:fileName, value:side });
        this.setState({layerList:layerList});
    }

    onChangeOpacity(fileName:string, opacity:number) {
        let layerList = this.state.layerList.map(gerberFile => {
            if (gerberFile.fileName === fileName) {
                gerberFile.opacity = opacity;
            }
            return gerberFile;
        });
        this.setState({layerList:layerList});
    }

    onChangeColor(fileName:string, color:Color) {
        let layerList = this.state.layerList.map(gerberFile => {
            if (gerberFile.fileName === fileName) {
                gerberFile.color = color;
            }
            return gerberFile;
        });
        this.setState({layerList:layerList});
    }

    onClick(fileName:string) {
        let layerList = this.state.layerList.map(l => {
            if (l.fileName == fileName) {
                l.selected = !l.selected;
            }
            return l;
        });
        let selection = layerList.filter(l => l.selected);
        this.setState({layerList:layerList, bounds:calcBounds(selection)});
    }

    onDrop(ev:React.DragEvent<HTMLDivElement>) {
        ev.preventDefault();
        let files:Array<File> = [];
        if (ev.dataTransfer.items) {
            // Use DataTransferItemList interface to access the file(s)

            for (let i = 0; i < ev.dataTransfer.items.length; i++) {
                if (ev.dataTransfer.items[i].kind === 'file') {
                    files.push(ev.dataTransfer.items[i].getAsFile());
                }
            }
        } else {
            // Use DataTransfer interface to access the file(s)
            for (let i = 0; i < ev.dataTransfer.files.length; i++) {
                files.push(ev.dataTransfer.files[i]);
            }
        }
        if (files.length == 1) {
            this.readZipFile(files[0]);
        } else {
            this.readFiles(files);
        }
        
        // Pass event to removeDragData for cleanup
        this.removeDragData(ev)
    }

    removeDragData(ev) {
        console.log('Removing drag data')
        if (ev.dataTransfer.items) {
          // Use DataTransferItemList interface to remove the drag data
          ev.dataTransfer.items.clear();
        } else {
          // Use DataTransfer interface to remove the drag data
          ev.dataTransfer.clearData();
        }
    }

    render() {
        return <div style={{height:"100%", display:"flex", flexFlow:"column"}} 
            onDragOver={(ev) => ev.preventDefault()}
            onDrop={(ev) => this.onDrop(ev)}>
            <div style={{color: "rgb(158, 1, 1)"}}>
                Please try our free Gerber file (rs274-x) viewer. All data is processed in the browser.
            </div>
            <div style={{color: "coral"}}>
                This is experimental software.<a href="https://goo.gl/forms/FWb0kufsdXdGO9Gt1">Contact us.</a>
            </div>
            <FileOpenButton 
                key="fileInput" 
                onChange={(f) => this.handleChangeFile(f)}
                accept=".zip"/>
            <p></p>
            <div style={{
                flex:1,
                display:"flex",
                flexFlow:"row",
                overflow:"hidden"}}>
                <div style={{order:1, flex:"flex-basis", flexBasis:"auto"}}>
                    <LayerList
                        key="layerList"
                        layers={this.state.layerList}
                        onClick={(fileName) => this.onClick(fileName)}
                        onChangeLayer={(fileName, layer) => this.onChangeLayer(fileName, layer)}
                        onChangeSide={(fileName, side) => this.onChangeSide(fileName, side)}
                        onChangeOpacity={(fileName, opacity) => this.onChangeOpacity(fileName, opacity)}
                        onChangeColor={(fileName, color) => this.onChangeColor(fileName, color)}/>
                    <span className="help" style={{fontSize:"12px"}}>
                        <br/>Pan: mouse down and dragg a point in the image
                        <br/>Zoom: use the mouse wheel
                        <br/>press 'h' for a horizontal flip
                        <br/>press 'v' for a vertical flip
                        <br/>Reset: press the 'z' key to reset the view
                    </span>
                </div>
                <div style={{order:2, flex:"flex-basis", width:"10px"}}/>
                <div style={{order:3, flex:1, overflow:"hidden"}}>
                    <CanvasViewer
                            key="svg"
                            style={{order:2, width:'100%', height:'100%'}}
                            layerColor={0xa02010}
                            useCheckeredBackground={false}
                            layers={this.state.layerList}
                            bounds={this.state.bounds}/>
                </div>
                <div style={{order:4, flex:"flex-basis", width:"10px"}}/>
            </div>
            <div style={{flex:"flex-basis", height:"10px"}}/>
        </div>;
    }
}

ReactDOM.render(
    <App/>,
    document.getElementById("root")
);

console.log(`GerberView UI build ${Build}`);
