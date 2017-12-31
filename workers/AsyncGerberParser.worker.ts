import {GerberToPolygons, Init} from "grbparser/dist/converters";
import {Point} from "grbparser/dist/point";
import {PolygonSet, Polygon} from "grbparser/dist/polygonSet";
import * as JSZip from "jszip";
import {BoardLayer, BoardSide, GerberUtils} from "../common/GerberUtils";
import {WorkerInput, GerberParserOutput, WorkerResult} from "../common/AsyncGerberParserAPI";
import { PassThrough } from "stream";

const ctx: Worker = self as any;

interface ProcessingData {
    gerber?:any;
    side?:BoardSide;
    layer?:BoardLayer;
    exception?:string;
    unzipTime?:number;
    renderTime?:number;
}

class GerverRenderer {
    private remaining:number = 0;

    constructor(private inputData_:WorkerInput<ArrayBuffer>) {
        this.processGerberFile();
    }

    gerberToSvg(fileName:string, content:string, unzipDuration:number) {
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
                //console.log(`Exception ${e}`);
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
                    let fileInfo = GerberUtils.determineSideAndLayer(fileName);
                    if (fileInfo.side === BoardSide.Unknown
                        || fileInfo.layer === BoardLayer.Unknown) {
                            this.postStatusUpdate(fileName, "Ignored", {});
                        continue;
                    }
                    this.postStatusUpdate(
                        fileName, "Processing", {side:fileInfo.side, layer:fileInfo.layer});
                    let startUnzip = performance.now();
                    this.remaining++;
                    zip.files[fileName].async("text").then(
                        (content) => {
                            let endUnzip = performance.now();
                            this.postStatusUpdate(fileName, "Rendering", {});
                            this.gerberToSvg(fileName, content, endUnzip - startUnzip);
                        }
                    );
                    //console.log(`File '${fileName}' side: ${BoardSide[fileInfo.side]} layer: ${BoardLayer[fileInfo.layer]}`);
                }
            });
    }

    postStatusUpdate(fileName:string, status:string, data:ProcessingData) {
        let output = new GerberParserOutput(
            fileName,
            status,
            data.side,
            data.layer,
            data.gerber,
            data.exception,
            data.unzipTime,
            data.renderTime);
        ctx.postMessage(new WorkerResult<GerberParserOutput>(this.inputData_.id, output));
    }
}


ctx.addEventListener("message", (e:MessageEvent) => {
    let data = e.data as WorkerInput<ArrayBuffer>;
    const renderer = new GerverRenderer(data);
});
