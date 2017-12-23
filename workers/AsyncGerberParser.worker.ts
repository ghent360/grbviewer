import {PolygonConverter, Init} from "grbparser/dist/converters";
import {Point} from "grbparser/dist/point";
import {PolygonSet, Polygon} from "grbparser/dist/polygonSet";
import * as JSZip from "jszip";
import {BoardLayer, BoardSide, GerberUtils} from "../common/GerberUtils";
import {WorkerInput, GerberParserOutput, WorkerResult} from "../common/AsyncGerberParserAPI";
import { PassThrough } from "stream";

const ctx: Worker = self as any;

class GerverRenderer {
    private remaining:number = 0;

    constructor(private inputData_:WorkerInput<ArrayBuffer>) {
        this.processGerberFile();
    }

    gerberToSvg(fileName:string, content:string) {
        Init.then(() => {
            try {
                let svg = PolygonConverter.GerberToPolygons(content);
                this.postStatusUpdate(fileName, "done", svg);
            } catch (e) {
                console.log(`Exception ${e}`);
                this.postStatusUpdate(fileName, "error");
            }
            this.remaining--;
            if (this.remaining <= 0) {
                console.log('Terminating worker...');
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
                            this.postStatusUpdate(fileName, "Ignored");
                        continue;
                    }
                    this.postStatusUpdate(
                        fileName, "Processing", undefined, fileInfo.side, fileInfo.layer);
                    this.remaining++;
                    zip.files[fileName].async("text").then(
                        (content) => {
                            this.postStatusUpdate(fileName, "Rendering");
                            this.gerberToSvg(fileName, content);
                        }
                    );
                    //console.log(`File '${fileName}' side: ${BoardSide[fileInfo.side]} layer: ${BoardLayer[fileInfo.layer]}`);
                }
            });
    }

    postStatusUpdate(fileName:string, status:string, gerber?:any, side?:BoardSide, layer?:BoardLayer) {
        let output = new GerberParserOutput(fileName, status, side, layer, gerber);
        ctx.postMessage(new WorkerResult<GerberParserOutput>(this.inputData_.id, output));
    }
}


ctx.addEventListener("message", (e:MessageEvent) => {
    let data = e.data as WorkerInput<ArrayBuffer>;
    const renderer = new GerverRenderer(data);
});
