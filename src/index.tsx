import * as React from "react";
import * as ReactDOM from "react-dom";

import {Hello} from "./components/Hello";
import {GerberViewer} from "./components/GerberViewer";
import {FileOpenButton} from "./components/FileOpenButton";
import {CanvasViewer} from "./components/CanvasViewer";
import {SvgViewer} from "./components/SvgViewer";
import * as ReactGA from 'react-ga';
import { GerberPolygons } from "../common/AsyncGerberParserAPI";

class AppState {
    file:File;
    selectedGerber?:GerberPolygons
}

class App extends React.Component<{}, AppState> {
    constructor(props:{}, context?:any) {
        super(props, context);
        this.state = { file:null };
        ReactGA.initialize('UA-111584522-1', {debug: false});
        ReactGA.pageview(window.location.pathname + window.location.search);
    }

    handleChangeFile(file:File) {
        this.setState({file:file});
    }

    onSelectGerber(gerber:GerberPolygons) {
        this.setState({selectedGerber:gerber});
    }

    render() {
        return <div style={{height:"100%"}}>
            <FileOpenButton 
                key="fileInput" 
                onChange={(f) => this.handleChangeFile(f)}
                accept=".zip"/>
            <GerberViewer
                key="gerberViewer"
                file={this.state.file}
                onSelect={(gerber) => this.onSelectGerber(gerber)}/>
            <CanvasViewer
                key="svg"
                style={{width:'100%', height:'100%'}}
                layerColor={0xa02010}
                margin={10}
                objects={this.state.selectedGerber}/>
        </div>;
    }
}

ReactDOM.render(
    <App/>,
    document.getElementById("root")
);
