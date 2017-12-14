import * as React from "react";
import * as ReactDOM from "react-dom";

import {Hello} from "./components/Hello";
import {GerberViewer} from "./components/GerberViewer";
import {FileOpenButton} from "./components/FileOpenButton";
import {CanvasViewer} from "./components/CanvasViewer";
import {SvgViewer} from "./components/SvgViewer";
import {PolygonConverter} from "../../grbparser/converters";

class AppState {
    file:File;
    selectedGerber?:PolygonConverter
}

class App extends React.Component<{}, AppState> {
    constructor(props:{}, context?:any) {
        super(props, context);
        this.state = { file:null };
    }

    handleChangeFile(file:File) {
        this.setState({file:file});
    }

    onSelectGerber(gerber:PolygonConverter) {
        console.log(`Selected new gerber ${gerber.solids.length} solids`);
        this.setState({selectedGerber:gerber});
    }

    render() {
        return <div>
            <FileOpenButton key="fileInput" onChange={(f) => this.handleChangeFile(f)} accept=".zip"/>
            <br/>
            <GerberViewer 
                key="gerberViewer"
                file={this.state.file}
                onSelect={(gerber) => this.onSelectGerber(gerber)}/>
            <CanvasViewer
                key="svg"
                layerColor={0xa02010}
                scale={100}
                margin={10}
                objects={this.state.selectedGerber}/>
        </div>;
    }
}

ReactDOM.render(
    [
        <Hello key="tst" compiler="TypeScript" framework="React" />,
        <App key="app"/>
    ],
    document.getElementById("example")
);
