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
