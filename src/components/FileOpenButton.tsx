import * as React from "react";
import "./FileOpenButton.css";

export interface FileOpenButtonProps { 
    onChange: (f:File) => void;
    style?:React.CSSProperties;
    id?:string
    accept?:string
}

class FileOpenButtonState {
    fileName?:string;
}
export class FileOpenButton extends React.Component<FileOpenButtonProps, FileOpenButtonState> {
    constructor(props:FileOpenButtonProps, context?:any) {
        super(props, context);
        this.state = {};
    }

    onFileSelected(e:React.ChangeEvent<HTMLInputElement>) {
        let file = e.target.files[0];
        if (file) {
            this.setState({fileName:file.name});
            this.props.onChange(file);
            return;
        }
        this.setState({});
    }

    getFileName() {
        if (this.state.fileName) {
            return this.state.fileName;
        }
        return "Choose a ZIP file with gerber data";
    }

    render() {
        return (
          <div style={this.props.style}>
            <input
                id={"fileOpen_" + this.props.id}
                type="file"
                onChange={(e) => this.onFileSelected(e)}
                className="inputfile"
                style={this.props.style}
                accept={this.props.accept}/>
            <label htmlFor={"fileOpen_" + this.props.id}><strong>{this.getFileName()}</strong></label>
          </div>);
    }
}