import {BoardSide, BoardLayer} from "./GerberUtils";

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

export class GerberParserOutput {
    constructor(
        readonly fileName:string,
        readonly status:string,
        readonly side?:BoardSide,
        readonly layer?:BoardLayer,
        readonly gerber?:any) {
    }
}