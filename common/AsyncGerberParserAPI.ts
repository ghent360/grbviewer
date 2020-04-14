import {BoardSide, BoardLayer} from "grbparser/dist/gerberutils";
import {DrillHole} from "grbparser/dist/excellonparser";
import {ComponentPosition} from "grbparser/dist/kicadcentroidparser";

export class WorkerInput<I> {
    constructor(
        public id:number,
        public origin:string,
        public input:I) {
    }
}

export class WorkerResult<O> {
    constructor(
        public id:number,
        public output:O) {
    }
}

export interface Bounds {
    readonly minx:number;
    readonly miny:number;
    readonly maxx:number;
    readonly maxy:number;
}

export interface GerberPolygons {
    readonly solids: Array<Float64Array>;
    readonly thins: Array<Float64Array>;
    readonly bounds: Bounds;
}

export interface ExcellonHoles {
    readonly holes: Array<DrillHole>;
    readonly bounds: Bounds;
}

export interface ComponentCenters {
    readonly centers: Array<ComponentPosition>;
    readonly bounds: Bounds;
}

export interface FileContent {
    readonly fileName:string;
    readonly content:string;
}

export interface GerberParserInput {
    readonly zipFileBuffer?:ArrayBuffer;
    readonly files?:Array<FileContent>;
}

export class GerberParserOutput {
    constructor(
        readonly fileName:string,
        readonly status:string,
        readonly side?:BoardSide,
        readonly layer?:BoardLayer,
        readonly content?:string,
        readonly gerber?:GerberPolygons,
        readonly holes?:ExcellonHoles,
        readonly centers?:ComponentCenters,
        readonly exception?:string,
        readonly unzipTime?:number,
        readonly renderTime?:number) {
    }
}