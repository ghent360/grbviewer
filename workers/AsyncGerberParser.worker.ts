import {GerberToPolygons, Init, PolygonConverterResult} from "grbparser/dist/converters";
import {Point} from "grbparser/dist/point";
import {PolygonSet, Polygon} from "grbparser/dist/polygonSet";
import {BoardLayer, BoardSide, GerberUtils} from "grbparser/dist/gerberutils";
import * as JSZip from "jszip";
import {WorkerInput, GerberParserOutput, WorkerResult} from "../common/AsyncGerberParserAPI";
import {Build} from "../common/build";

const ctx: Worker = self as any;

interface ProcessingData {
    gerber?:PolygonConverterResult;
    content?:string;
    side?:BoardSide;
    layer?:BoardLayer;
    exception?:string;
    unzipTime?:number;
    renderTime?:number;
}

class GerberRenderer {
    private remaining:number = 0;

    constructor(private inputData_:WorkerInput<ArrayBuffer>) {
        this.processGerberFile();
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
                    unzipTime:unzipDuration,
                    renderTime:renderEnd - renderStart });
            } catch (e) {
                console.log(`Exception processing ${fileName}: ${e}`);
                this.postStatusUpdate(fileName, "error", {
                    exception:e.toString(),
                    unzipTime:unzipDuration
                });
            }
            this.remaining--;
            if (this.remaining <= 0) {
                //console.log('Terminating worker...');
                //close();
            }
        });
    }

    processGerberFile():void {
        new JSZip().loadAsync(this.inputData_.input).then(
            zip => {
                for(let fileName in zip.files) {
                    let zipObject = zip.files[fileName];
                    if (zipObject.dir) {
                        continue;
                    }
                    if (fileName.endsWith('.DS_Store')
                        || fileName.toLowerCase().endsWith('.drl')
                        || fileName.toLowerCase().endsWith('.drill')) {
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
                    this.remaining++;
                    zipObject
                        .async("text")
                        .then( (content) => {
                            let endUnzip = performance.now();
                            this.postStatusUpdate(fileName, "Rendering", {content:content});
                            this.gerberToPolygons(fileName, content, endUnzip - startUnzip);
                        });
                }
            });
    }

    postStatusUpdate(fileName:string, status:string, data:ProcessingData) {
        let output = new GerberParserOutput(
            fileName,
            status,
            data.side,
            data.layer,
            data.content,
            data.gerber,
            data.exception,
            data.unzipTime,
            data.renderTime);
        ctx.postMessage(new WorkerResult<GerberParserOutput>(this.inputData_.id, output));
    }
}


ctx.addEventListener("message", (e:MessageEvent) => {
    let data = e.data as WorkerInput<ArrayBuffer>;
    const renderer = new GerberRenderer(data);
});

console.log(`GerberView WK build ${Build}`);
