import * as workerPath from "file-loader?name=[name].js!./AsyncGerberParser.worker";

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

class AsyncWorker<I, O> {
    protected worker:Worker;
    private workerData:Array<(output:O) => void> = [];

    protected init() {
        this.worker.onmessage = (e:MessageEvent) => {
            this.processResult(e.data as WorkerResult<O>);
        }
    }

    public scheduleWork(input:I, callback:(output:O) => void) {
        this.workerData.push(callback);
        let origin:string = "*";
        if (window && window.location) {
            origin = window.location.origin;
        }
        let id = this.workerData.length - 1;
        console.log(`Sheduled work ${id} ${origin}`);
        let data = new WorkerInput<I>(id, origin, input);
        this.worker.postMessage(data);
    }

    private processResult(result:WorkerResult<O>) {
        this.workerData[result.id](result.output);
    }
}

export class AsyncGerberParser extends AsyncWorker<string, string> {
    constructor() {
        super();
        console.log(`Worker path ${workerPath}`);
        this.worker = new Worker(workerPath);
        this.init();
    }
}
