import {GerberToPolygons, Init, PolygonConverterResult} from "grbparser/dist/converters";
import {Point} from "grbparser/dist/point";
import {PolygonSet, Polygon} from "grbparser/dist/polygonSet";
import {BoardLayer, BoardSide, GerberUtils, BoardFileType} from "grbparser/dist/gerberutils";
import {ExcellonParser, DrillHole} from "grbparser/dist/excellonparser";
import * as JSZip from "jszip";
import {WorkerInput, GerberParserOutput, WorkerResult, ExcellonHoles, GerberParserInput} from "../common/AsyncGerberParserAPI";
import {Build} from "../common/build";

const ctx: Worker = self as any;

interface ProcessingData {
    gerber?:PolygonConverterResult;
    holes?:ExcellonHoles;
    content?:string;
    side?:BoardSide;
    layer?:BoardLayer;
    exception?:string;
    unzipTime?:number;
    renderTime?:number;
}

class GerberRenderer {

    constructor(private inputData_:WorkerInput<GerberParserInput>) {
        this.processInput();
    }

    gerberToPolygons(fileName:string, content:string, unzipDuration:number) {
        Init.then(() => {
            try {
                let renderStart = performance.now();
                let polygons = GerberToPolygons(content);
                let renderEnd = performance.now();
                let status = 'done';
                if ((polygons.solids.length == 0 
                     && polygons.thins.length == 0)
                    || polygons.bounds == undefined) {
                    status = 'empty';
                }
                this.postStatusUpdate(fileName, status, {
                    gerber:polygons,
                    holes:undefined,
                    unzipTime:unzipDuration,
                    renderTime:renderEnd - renderStart });
            } catch (e) {
                console.log(`Exception processing ${fileName}: ${e}`);
                this.postStatusUpdate(fileName, "error", {
                    exception:e.toString(),
                    unzipTime:unzipDuration
                });
            }
        });
    }

    excellonFile(fileName:string, content:string, unzipDuration:number) {
        try {
            //console.log(`Parsing '${fileName}'`);
            let renderStart = performance.now();
            let parser = new ExcellonParser();
            parser.parseBlock(content);
            parser.flush();
            let renderEnd = performance.now();
            let status = 'done';
            let holes = parser.result();
            if (holes.holes.length == 0) {
               status = 'empty';
           }
           this.postStatusUpdate(fileName, status, {
               gerber:undefined,
               holes:holes,
               unzipTime:unzipDuration,
               renderTime:renderEnd - renderStart });
        } catch (e) {
            console.log(`Exception processing ${fileName}: ${e}`);
            this.postStatusUpdate(fileName, "error", {
                exception:e.toString(),
                unzipTime:unzipDuration
            });
        }
    }

    processZipFiles(zip:JSZip) {
        for(let fileName in zip.files) {
            let zipObject = zip.files[fileName];
            if (zipObject.dir) {
                continue;
            }
            if (fileName.endsWith('.DS_Store')) {
                continue;
            }
            if (fileName.indexOf('__MACOSX') >= 0) {
                continue;
            }
            fileName = GerberUtils.getFileName(fileName);
            let fileExt = GerberUtils.getFileExt(fileName.toLowerCase());
            if (GerberUtils.bannedExtensions.indexOf(fileExt) >= 0) {
                console.log(`Ignoring known extension ${fileName}`);
                continue;
            }
            let fileInfo = GerberUtils.determineSideAndLayer(fileName);
            this.postStatusUpdate(
                fileName, "Processing", {side:fileInfo.side, layer:fileInfo.layer});
            let startUnzip = performance.now();
            zipObject
                .async("text")
                .then( (content) => {
                    let endUnzip = performance.now();
                    this.postStatusUpdate(fileName, "Rendering", {content:content});
                    let fileType = GerberUtils.boardFileType(content);
                    if ((fileInfo.layer == BoardLayer.Drill 
                        && fileType == BoardFileType.Unsupported)
                        || fileType == BoardFileType.Drill) {
                        fileInfo.layer = BoardLayer.Drill;
                        fileInfo.side = BoardSide.Both;
                        this.postStatusUpdate(
                            fileName, "Rendering", {side:fileInfo.side, layer:fileInfo.layer});
                        this.excellonFile(fileName, content, endUnzip - startUnzip);
                    } else {
                        this.gerberToPolygons(fileName, content, endUnzip - startUnzip);
                    }
                });
        }
    }

    processInput():void {
        if (this.inputData_.input.zipFileBuffer) {
            new JSZip()
                .loadAsync(this.inputData_.input.zipFileBuffer)
                .then(zip => this.processZipFiles(zip));
        } else if (this.inputData_.input.files) {
            this.inputData_.input.files.forEach(file => {
                let fileName = file.fileName;
                if (fileName.endsWith('.DS_Store')) {
                    return;
                }
                if (fileName.indexOf('__MACOSX') >= 0) {
                    return;
                }
                fileName = GerberUtils.getFileName(fileName);
                let fileExt = GerberUtils.getFileExt(fileName.toLowerCase());
                if (GerberUtils.bannedExtensions.indexOf(fileExt) >= 0) {
                    console.log(`Ignoring known extension ${fileName}`);
                    return;
                }
                let fileInfo = GerberUtils.determineSideAndLayer(fileName);
                this.postStatusUpdate(
                    fileName, "Processing", {side:fileInfo.side, layer:fileInfo.layer});
                this.postStatusUpdate(fileName, "Rendering", {content:file.content});
                let fileType = GerberUtils.boardFileType(file.content);
                if ((fileInfo.layer == BoardLayer.Drill 
                    && fileType == BoardFileType.Unsupported)
                    || fileType == BoardFileType.Drill) {
                    fileInfo.layer = BoardLayer.Drill;
                    fileInfo.side = BoardSide.Both;
                    this.postStatusUpdate(
                        fileName, "Rendering", {side:fileInfo.side, layer:fileInfo.layer});
                    this.excellonFile(fileName, file.content, -1);
                } else {
                    this.gerberToPolygons(fileName, file.content, -1);
                }
            });
        }
    }

    postStatusUpdate(fileName:string, status:string, data:ProcessingData) {
        let output = new GerberParserOutput(
            fileName,
            status,
            data.side,
            data.layer,
            data.content,
            data.gerber,
            data.holes,
            data.exception,
            data.unzipTime,
            data.renderTime);
        ctx.postMessage(new WorkerResult<GerberParserOutput>(this.inputData_.id, output));
    }
}


ctx.addEventListener("message", (e:MessageEvent) => {
    let data = e.data as WorkerInput<GerberParserInput>;
    const renderer = new GerberRenderer(data);
});

console.log(`GerberView WK build ${Build}`);
