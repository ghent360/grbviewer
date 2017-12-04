import * as React from "react";
import * as ReactDOM from "react-dom";

import {Hello} from "./components/Hello";
import {GerberViewer} from "./components/GerberViewer";
import {FileOpenButton} from "./components/FileOpenButton";

class AppState {
    file:File;
}

class App extends React.Component<{}, AppState> {
    constructor(props:{}, context?:any) {
        super(props, context);
        this.state = { file:null };
    }

    handleChangeFile(file:File) {
        this.setState({file:file});
    }

    render() {
        return <div>
            <FileOpenButton key="fileInput" onChange={(f) => this.handleChangeFile(f)} accept=".zip"/>,
            <GerberViewer key="gerberViewer" file={this.state.file}/>
        </div>;
    }
}

ReactDOM.render(
    [
        <Hello key="tst" compiler="TypeScript" framework="React" />,
        <App key="app"/>,
    ],
    document.getElementById("example")
);
