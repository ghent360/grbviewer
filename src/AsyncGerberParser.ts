const GerberWorker = new Worker("AsyncGerberParser.worker.js");
import {WorkerInput, WorkerResult} from "./AsyncGerberParserAPI";

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

export function Test() {
    GerberWorker.postMessage({a:1});
}

GerberWorker.onmessage = (event:any) => {
    console.log(`Received response ${JSON.stringify(event.data)}`);
};