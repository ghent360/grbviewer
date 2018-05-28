import * as React from "react";
import * as Color from 'color';
import { SketchPicker } from 'react-color';

export interface ColorPickerProps { 
    color:Color;
    onChange: (color:Color) => void;
}

interface ColorPickerState {
    displayColorPicker: boolean,
    color:Color;
}

export class ColorPicker extends React.Component<ColorPickerProps, ColorPickerState> {
    constructor(props:ColorPickerProps, context?:any) {
        super(props, context);
        this.state = {
            displayColorPicker: false,
            color:props.color
        };
    }

    componentWillReceiveProps(nextProps:Readonly<ColorPickerProps>) {
        this.setState({
            color:nextProps.color
        });
    }

    private handleClick() {
        this.setState({ displayColorPicker: !this.state.displayColorPicker })
    }

    private handleClose() {
        this.setState({ displayColorPicker: false })
        if (this.props.onChange) {
            this.props.onChange(this.state.color);
        }
    }

    private handleChange(color:{r:number, g:number, b:number, a?:number}) {
        let c = Color({r:color.r, g:color.g, b:color.b});
        if (color.a) {
            c = c.alpha(color.a);
        }
        this.setState({ color: c })
    }

    render() {
        return (
        <div>
            <div style={{
                    padding: '5px',
                    background: '#fff',
                    borderRadius: '1px',
                    boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
                    display: 'inline-block',
                }} onClick={ (e:React.MouseEvent<HTMLDivElement>) => this.handleClick() }>
                <div style={{
                    width: '16px',
                    height: '14px',
                    borderRadius: '2px',
                    background: this.state.color.hsl().string(),
                }} />
            </div>
            { this.state.displayColorPicker ? 
                <div style={{position: 'absolute', zIndex: 2}}>
                    <div style={{
                            position: 'fixed',
                            top: '0px',
                            right: '0px',
                            bottom: '0px',
                            left: '0px',
                        }} onClick={ (e:React.MouseEvent<HTMLDivElement>) => this.handleClose() }/>
                    <SketchPicker color={{
                        r:this.state.color.red(),
                        g:this.state.color.green(),
                        b:this.state.color.blue(),
                        a:this.state.color.alpha()}}
                        onChange={ (color) => this.handleChange(color.rgb) } 
                        disableAlpha={true}/>
                </div> : null }
        </div>);
    }
}
