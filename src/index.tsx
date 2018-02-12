import * as React from "react";
import * as ReactDOM from "react-dom";

import {Hello} from "./components/Hello";
import {LayerViewer, LayerInfo} from "./components/LayerViewer";
import {LayerName} from "./components/LayerName";
import {FileOpenButton} from "./components/FileOpenButton";
import {CanvasViewer} from "./components/CanvasViewer";
import {SvgViewer} from "./components/SvgViewer";
import * as ReactGA from 'react-ga';
import {GerberPolygons} from "../common/AsyncGerberParserAPI";
import {Build} from "../common/build";
import { BoardLayer } from "../../grbparser/dist/gerberutils";

class AppState {
    file:File;
    selection:Array<LayerInfo>
}

class App extends React.Component<{}, AppState> {
    constructor(props:{}, context?:any) {
        super(props, context);
        this.state = { file:null, selection:[] };
        ReactGA.initialize('UA-111584522-1', {debug: false});
        ReactGA.pageview(window.location.pathname + window.location.search);
    }

    handleChangeFile(file:File) {
        this.setState({file:file, selection:[]});
    }

    onSelectGerber(selection:Array<LayerInfo>) {
        if (!selection) {
            return;
        }
        this.setState({selection:selection});
    }

    render() {
        return <div style={{height:"100%", display:"flex", flexFlow:"column"}}>
            <h4 style={{color: "coral"}}>
                This is experimental software. Functionality can change rapidly and without
                notice. Bugs are very likely. <a href="https://goo.gl/forms/uXouJRtWRVEcTA983">Contact us.</a>
            </h4>
            <FileOpenButton 
                key="fileInput" 
                onChange={(f) => this.handleChangeFile(f)}
                accept=".zip"/>
            <p></p>
            <div style={{
                flex:1,
                display:"flex",
                flexFlow:"row",
                overflow:"hidden"}}>
                <div style={{order:1, flex:"flex-basis", flexBasis:"auto"}}>
                    <LayerViewer
                        key="gerberViewer"
                        file={this.state.file}
                        onSelectChange={(selection) => this.onSelectGerber(selection)}/>
                </div>
                <div style={{order:2, flex:"flex-basis", width:"10px"}}/>
                <div style={{order:3, flex:1, overflow:"hidden"}}>
                    <CanvasViewer
                            key="svg"
                            style={{order:2, width:'100%', height:'100%'}}
                            layerColor={0xa02010}
                            useCheckeredBackground={false}
                            selection={this.state.selection}/>
                </div>
                <div style={{order:4, flex:"flex-basis", width:"10px"}}/>
            </div>
            <div style={{flex:"flex-basis", height:"10px"}}/>
        </div>;
    }
}

ReactDOM.render(
    <App/>,
    document.getElementById("root")
);

console.log(`GerberView UI build ${Build}`);
