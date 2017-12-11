import {WorkerInput, WorkerResult} from "./AsyncGerberParser";
import {SVGConverter} from "grbparser/converters";

onmessage = (e:MessageEvent) => {
    let data = e.data as WorkerInput<string>;
    console.log(`Working on ${data.id}`);
    let svg = SVGConverter.GerberToSvg(data.input);
    console.log(`Completed ${data.id}`);
    postMessage(new WorkerResult<string>(data.id, svg), data.origin, [svg]);
}
