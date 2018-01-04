import * as React from "react";
import { GerberPolygons, Bounds } from "../../common/AsyncGerberParserAPI";

export interface CanvasViewerProps { 
    objects?: Array<GerberPolygons>;
    margin:number;
    layerColor:number;
    style?:React.CSSProperties;
    blockSize?:number;
}

interface ContentSize {
    contentWidth:number;
    contentHeight:number;
    contentMinX:number;
    contentMinY:number;
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
            contentSize:this.computeContentSize(props)
        }
    }

    calcBounds(objects:Array<GerberPolygons>):Bounds {
        let result:{minx:number, miny:number, maxx:number, maxy:number} = objects[0].bounds;
        objects.slice(1).forEach(o => {
            if (o.bounds.minx < result.minx) {
                result.minx = o.bounds.minx;
            }
            if (o.bounds.miny < result.miny) {
                result.miny = o.bounds.miny;
            }
            if (o.bounds.maxx > result.maxx) {
                result.maxx = o.bounds.maxx;
            }
            if (o.bounds.maxy > result.maxy) {
                result.maxy = o.bounds.maxy;
            }
        });
        return result;
    }

    computeContentSize(props:CanvasViewerProps):ContentSize {
        if (props.objects && props.objects.length > 0) {
            let bounds = this.calcBounds(props.objects);
            console.log(`${JSON.stringify(bounds)}`);
            return { 
                contentWidth:bounds.maxx - bounds.minx,
                contentHeight:bounds.maxy - bounds.miny,
                contentMinX:bounds.minx,
                contentMinY:bounds.miny,
            };
        }
        return { 
            contentWidth:0,
            contentHeight:0,
            contentMinX:0,
            contentMinY:0
        };
    }

    componentWillReceiveProps(nextProps:Readonly<CanvasViewerProps>) {
        this.setState({
            contentSize:this.computeContentSize(nextProps)
        });
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
        let blockSize = this.props.blockSize || 10;
        let numBlocksX = Math.round(this.state.width / blockSize);
        let numBlocksY = Math.round(this.state.height / blockSize);
        context.fillStyle = '#d0d0d0';
        for (let x = 0; x < numBlocksX; x++) {
            for (let y = 0; y < numBlocksY; y++) {
                if ((x + y) % 2) {
                    context.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
                }
            }
        }        
        if (this.props.objects && targetWidth > 0 && targetHeight > 0) {
            let scaleX = targetWidth / this.state.contentSize.contentWidth;
            let scaleY = targetHeight / this.state.contentSize.contentHeight;
            let scale = Math.min(scaleX, scaleY);
            context.save();
            // Flip the Y axis
            context.translate(this.props.margin, this.state.height - this.props.margin);
            context.scale(scale, -scale);
            context.translate(
                -this.state.contentSize.contentMinX,
                -this.state.contentSize.contentMinY);
            context.fillStyle = colorToHtml(this.props.layerColor);
            context.lineWidth = 0;
            //console.log(`Drawing ${this.props.objects.solids.length} polys`);
            this.props.objects.forEach(o => {
                context.beginPath();
                o.solids
                    .filter(p => p.length > 1)
                    .forEach(p => this.drawPolygon(p, context));
                context.closePath();
                context.fill();
            });
            context.strokeStyle = colorToHtml(this.props.layerColor);
            context.lineWidth = 1/scale;
            //console.log(`Drawing ${this.props.objects.thins.length} wires`);
            this.props.objects.forEach(o => {
                context.beginPath();
                o.thins
                    .filter(p => p.length > 1)
                    .forEach(p => this.drawPolygon(p, context));
                context.stroke();
            });
            context.restore();
        }
    }

    drawPolygon(polygon:Float64Array, context:CanvasRenderingContext2D) {
        context.moveTo(polygon[0], polygon[1]);
        for (let idx = 2; idx < polygon.length; idx += 2) {
            context.lineTo(polygon[idx], polygon[idx + 1]);
        }
    }

    render() {
        return <canvas style={this.props.style} ref="canvas"/>;
    }
}