import {WorkerInput, WorkerResult, GerberParserOutput} from "../common/AsyncGerberParserAPI";

export class AsyncWorker<I, O> {
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
        let data = new WorkerInput<I>(id, origin, input);
        this.worker.postMessage(data);
    }

    public terminate() {
        this.worker.terminate();
    }

    private processResult(result:WorkerResult<O>) {
        this.workerData[result.id](result.output);
    }
}

export class AsyncGerberParserInterface extends AsyncWorker<ArrayBuffer, GerberParserOutput>{
    constructor() {
        super();
        this.worker = new Worker("AsyncGerberParser.worker.js");
        this.init();
    }
}
