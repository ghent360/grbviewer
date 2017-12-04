import * as React from "react";
import * as ReactDOM from "react-dom";
import * as JSZip from 'jszip';
import {BoardLayer, BoardSide, GerberUtils} from "./GerberUtils";

import {Hello} from "./components/Hello";
import {LayerList} from "./components/LayerList";
import {FileOpenButton} from "./components/FileOpenButton";

function readSingleFile(file:File):void {
    let reader = new FileReader();
    reader.onload = (e:ProgressEvent) => {
        processFile(reader.result);
    };
    reader.onerror = (e:ErrorEvent) => {
        console.log("Error " + e.error);
    }
    reader.readAsArrayBuffer(file);
}

function processFile(stream:ArrayBuffer):void {
    new JSZip().loadAsync(stream).then(
        zip => { 
            console.log("Completer loading the zip file.");
            for(let f in zip.files) {
                let t = GerberUtils.determineSideAndLayer(f);
                console.log("File '" + f + "' side:" + BoardSide[t.side] + " layer:" + BoardLayer[t.layer]);
            }
        });
}

ReactDOM.render(
    [
        <Hello key="tst" compiler="TypeScript" framework="React" />,
        <FileOpenButton key="fileInput" onChange={readSingleFile} accept=".zip"/>,
        <LayerList key="layerList" layers={[
            {fileName:"aa.GTL", layerName:"Top", layerType:"Copper"},
            {fileName:"aa.GTO", layerName:"Top", layerType:"Paste"},
            {fileName:"aa.GTS", layerName:"Top", layerType:"Stencil"},
            {fileName:"aa.GML", layerName:"All", layerType:"Drill"}
        ]}/>
    ],
    document.getElementById("example")
);
