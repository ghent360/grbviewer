import * as React from "react";
import * as ReactDOM from "react-dom";

import {Hello} from "./components/Hello";
import {GerberViewer} from "./components/GerberViewer";
import {FileOpenButton} from "./components/FileOpenButton";
import {CanvasViewer} from "./components/CanvasViewer";
import {SvgViewer} from "./components/SvgViewer";
import {PolygonConverter} from "../../grbparser/dist/converters";
import * as ReactGA from 'react-ga';

class AppState {
    file:File;
    selectedGerber?:PolygonConverter
}

class App extends React.Component<{}, AppState> {
    constructor(props:{}, context?:any) {
        super(props, context);
        this.state = { file:null };
        ReactGA.initialize('UA-111584522-1', {debug: true});
        ReactGA.pageview(window.location.pathname + window.location.search);
    }

    handleChangeFile(file:File) {
        this.setState({file:file});
    }

    onSelectGerber(gerber:PolygonConverter) {
        this.setState({selectedGerber:gerber});
    }

    render() {
        return <div style={{height:"100%", display:"flex", flexFlow:"column"}}>
            <FileOpenButton 
                style={{flex:"0 1 auto"}}
                key="fileInput" 
                onChange={(f) => this.handleChangeFile(f)}
                accept=".zip"/>
            <GerberViewer
                style={{flex:"0 1 auto"}}
                key="gerberViewer"
                file={this.state.file}
                onSelect={(gerber) => this.onSelectGerber(gerber)}/>
            <CanvasViewer
                key="svg"
                style={{flex:"1 1 auto"}}
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
