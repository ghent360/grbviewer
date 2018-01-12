import {BoardSide, BoardLayer} from "grbparser/dist/gerberutils";

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

export class GerberParserOutput {
    constructor(
        readonly fileName:string,
        readonly status:string,
        readonly side?:BoardSide,
        readonly layer?:BoardLayer,
        readonly gerber?:GerberPolygons,
        readonly exception?:string,
        readonly unzipTime?:number,
        readonly renderTime?:number) {
    }
}