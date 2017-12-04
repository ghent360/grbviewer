import * as React from "react";
import "./FileOpenButton.css";

export interface FileOpenButtonProps { 
    onChange: (f:File) => void;
    style?:React.CSSProperties;
    id?:string
    accept?:string
}

export class FileOpenButton extends React.Component<FileOpenButtonProps, {}> {
    onFileSelected(files:FileList) {
        let fileName = files[0];
        if (fileName) {
            this.props.onChange(fileName);
        }
    }

    render() {
        return (
          <div>
            <input
                id={"fileOpen_" + this.props.id}
                type="file"
                onChange={(e) => this.onFileSelected(e.target.files)}
                className="inputfile"
                style={this.props.style}
                accept={this.props.accept}/>
            <label htmlFor={"fileOpen_" + this.props.id}><strong>Choose a file</strong></label>
          </div>);
    }
}