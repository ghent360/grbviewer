import * as React from "react";
import {PolygonConverter} from "grbparser/dist/converters";
import {Point} from "grbparser/dist/point";
import {PolygonSet, Polygon} from "grbparser/dist/polygonSet";

export interface CanvasViewerProps { 
    objects?: PolygonConverter;
    margin:number;
    layerColor:number;
    style?:React.CSSProperties;
}

interface ContentSize {
    contentWidth:number;
    contentHeight:number;
}

interface CanvasViewerState {
    pixelRatio:number;
    width:number;
    height:number;
    contentSize:ContentSize;
}

function toString2(n:number):string {
    return ((n >>> 4) & 0xf).toString(16) +
        (n & 0xf).toString(16);
}

function colorToHtml(clr:number):string {
    let ss:string;
    ss = '#' + toString2((clr >>> 16) & 0xff)
        + toString2((clr >>> 8) & 0xff)
        + toString2(clr & 0xff);
    return ss;
}

export class CanvasViewer extends React.Component<CanvasViewerProps, CanvasViewerState> {
    constructor(props:CanvasViewerProps, context?:any) {
        super(props, context);
        this.state = {
            pixelRatio : window.devicePixelRatio || 1,
            width:0,
            height:0,
            contentSize:this.computeContentSize(props),
        }
    }

    computeContentSize(props:CanvasViewerProps):ContentSize {
        if (props.objects) {
            return { 
                contentWidth:props.objects.bounds.max.x - props.objects.bounds.min.x,
                contentHeight:props.objects.bounds.max.y - props.objects.bounds.min.y,
            };
        }
        return { 
            contentWidth:0,
            contentHeight:0,
        };
    }

    componentWillReceiveProps(nextProps:Readonly<CanvasViewerProps>) {
        if (nextProps.objects != this.props.objects) {
            this.setState({
                contentSize:this.computeContentSize(nextProps)
            });
        }
    }
    
    componentDidMount() {
        this.handleResize(false);
        window.addEventListener('resize', this.handleResize.bind(this, false));
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.handleResize);
    }

    componentDidUpdate() {
        this.draw();
    }

    handleResize(evt:any) {
        let canvas = this.refs.canvas as HTMLCanvasElement;
        //console.log(`Canvas size ${canvas.clientWidth}x${canvas.clientHeight}`);
        let width = canvas.clientWidth * this.state.pixelRatio;
        let height = canvas.clientHeight * this.state.pixelRatio;
        canvas.width = width;
        canvas.height = height;
        this.setState({
            width: width,
            height: height,
        });
    }

    draw() {
        let targetWidth = this.state.width - this.props.margin * 2;
        let targetHeight = this.state.height - this.props.margin * 2;
        let canvas = this.refs.canvas as HTMLCanvasElement;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, this.state.width, this.state.height);
        if (this.props.objects && targetWidth > 0 && targetHeight > 0) {
            let scaleX = targetWidth / this.state.contentSize.contentWidth;
            let scaleY = targetHeight / this.state.contentSize.contentHeight;
            let scale = Math.min(scaleX, scaleY);
            let offset = new Point(
                -this.props.objects.bounds.min.x * scale  + this.props.margin,
                -this.props.objects.bounds.min.y * scale + this.props.margin);
            context.save();
            // Flip the Y axis
            context.translate(0, this.state.height);
            context.scale(scale, -scale);
            context.translate(-this.props.objects.bounds.min.x, -this.props.objects.bounds.min.y);
            context.fillStyle = colorToHtml(this.props.layerColor);
            context.lineWidth = 0;
            //console.log(`Drawing ${this.props.objects.solids.length} polys`);
            context.beginPath();
            this.props.objects.solids
                .filter(p => p.length > 1)
                .forEach(p => this.drawPolygon(p, context));
            context.closePath();
            context.fill();
            context.strokeStyle = colorToHtml(this.props.layerColor);
            context.lineWidth = 1/scale;
            //console.log(`Drawing ${this.props.objects.thins.length} wires`);
            context.beginPath();
            this.props.objects.thins
                .filter(p => p.length > 1)
                .forEach(p => this.drawPolygon(p, context));
            context.stroke();
            context.restore();
        }
    }

    drawPolygon(polygon:Polygon, context:CanvasRenderingContext2D) {
        context.moveTo(polygon[0], polygon[1]);
        for (let idx = 2; idx < polygon.length; idx += 2) {
            context.lineTo(polygon[idx], polygon[idx + 1]);
        }
    }

    render() {
        return <canvas style={this.props.style} ref="canvas"/>;
    }
}