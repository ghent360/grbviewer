import * as React from "react";
import * as ReactDOM from "react-dom";

import { Hello } from "./components/Hello";
import { LayerList } from "./components/LayerList";

ReactDOM.render(
    [
        <Hello key="tst" compiler="TypeScript" framework="React" />,
        <LayerList key="layerList" layers={[
            {fileName:"aa.GTL", layerName:"Top", layerType:"Copper"},
            {fileName:"aa.GTO", layerName:"Top", layerType:"Paste"},
            {fileName:"aa.GTS", layerName:"Top", layerType:"Stencil"},
            {fileName:"aa.GML", layerName:"All", layerType:"Drill"}
        ]}/>
    ],
    document.getElementById("example")
);
