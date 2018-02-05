import * as React from "react";
import { GerberPolygons, Bounds } from "../../common/AsyncGerberParserAPI";
import { LayerInfo } from "./LayerViewer";
import { BoardLayer } from "../../../grbparser/dist/gerberutils";

export interface CanvasViewerProps { 
    selection?: Array<LayerInfo>;
    layerColor:number;
    style?:React.CSSProperties;
    blockSize?:number;
    useCheckeredBackground?:boolean;
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
    polygonPaths:Map<string, Path2D>;
    scale:number;
    offsetX:number;
    offsetY:number;
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

const layerColors = {
    0:"#b87333",    // Copper
    1:"gold",       // SolderMask
    2:"white",      // Silk
    3:"silver",     // Paste
    4:"white",      // Drill
    5:"black",      // Mill
    6:"black",      // Outline
    7:"carbon",     // Carbon
    8:"green",      // Notes
    9:"yellow",     // Assembly
    10:"brown",     // Mechanical
    11:"black",     // Unknown
};

export class CanvasViewer extends React.Component<CanvasViewerProps, CanvasViewerState> {
    private redrawTimer:any;
    private mouseDnX:number;
    private mouseDnY:number;
    private cachedImage:ImageBitmap;
    private scale:number;
    private offsetX:number;
    private offsetY:number;
    private oldOffsetX:number;
    private oldOffsetY:number;
    private startX:number;
    private startY:number;

    constructor(props:CanvasViewerProps, context?:any) {
        super(props, context);
        this.state = {
            pixelRatio : window.devicePixelRatio || 1,
            width:0,
            height:0,
            contentSize:this.computeContentSize(props),
            polygonPaths:this.createPaths(props),
            scale:1,
            offsetX:0,
            offsetY:0,
        }
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.oldOffsetX = 0;
        this.oldOffsetY = 0;
        this.startX = 0;
        this.startY = 0;
    }

    private createPaths(props:CanvasViewerProps):Map<string, Path2D> {
        let result:Map<string, Path2D> = new Map();
        if (props.selection && props.selection.length > 0) {
            props.selection.forEach(o => {
                let solidPath = new Path2D();
                o.polygons.solids
                    .filter(p => p.length > 1)
                    .forEach(p => this.drawPolygon(p, solidPath));
                solidPath.closePath();
                result.set(o.fileName + ":solid", solidPath);
                let thinPath = new Path2D();
                o.polygons.thins
                    .filter(p => p.length > 1)
                    .forEach(p => this.drawPolygon(p, thinPath));
                result.set(o.fileName + ":thin", thinPath);
            });
        }
        return result;
    }

    private calcBounds(selection:Array<LayerInfo>):Bounds {
        let result:{minx:number, miny:number, maxx:number, maxy:number} = selection[0].polygons.bounds;
        selection.slice(1).forEach(o => {
            let bounds = o.polygons.bounds;
            if (bounds.minx < result.minx) {
                result.minx = bounds.minx;
            }
            if (bounds.miny < result.miny) {
                result.miny = bounds.miny;
            }
            if (bounds.maxx > result.maxx) {
                result.maxx = bounds.maxx;
            }
            if (bounds.maxy > result.maxy) {
                result.maxy = bounds.maxy;
            }
        });
        return result;
    }

    computeContentSize(props:CanvasViewerProps):ContentSize {
        if (props.selection && props.selection.length > 0) {
            let bounds = this.calcBounds(props.selection);
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
        if (this.cachedImage) {
            this.cachedImage.close();
            this.cachedImage = undefined;
        }
        this.setState({
            contentSize:this.computeContentSize(nextProps),
            polygonPaths:this.createPaths(nextProps),
            scale:1,
            offsetX:0,
            offsetY:0,
        });
    }
    
    componentDidMount() {
        this.handleResize(false);
        window.addEventListener('resize', this.handleResize.bind(this));
        let canvas = this.refs.canvas as HTMLCanvasElement;
        canvas.addEventListener('wheel', this.handleWheel.bind(this));
        window.addEventListener('keypress', this.handleKey.bind(this));
        canvas.addEventListener('mousedown', this.handleMouseDn.bind(this));
        canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        if (this.cachedImage) {
            this.cachedImage.close();
            this.cachedImage = undefined;
        }
    }

    componentWillUnmount() {
        let canvas = this.refs.canvas as HTMLCanvasElement;
        window.removeEventListener('keypress', this.handleKey);
        canvas.removeEventListener('wheel', this.handleWheel);
        canvas.removeEventListener('mousedown', this.handleMouseDn);
        canvas.removeEventListener('mousemove', this.handleMouseMove);
        canvas.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('resize', this.handleResize);
        if (this.cachedImage) {
            this.cachedImage.close();
            this.cachedImage = undefined;
        }
    }

    componentDidUpdate() {
        this.drawFine();
    }

    handleMouseDn(evt:MouseEvent) {
        this.mouseDnX = evt.offsetX;
        this.mouseDnY = evt.offsetY;
        this.oldOffsetX = this.offsetX;
        this.oldOffsetY = this.offsetY;
    }

    handleMouseMove(evt:MouseEvent) {
        if (evt.buttons != 0 && this.mouseDnX != undefined && this.mouseDnY != undefined) {
            this.offsetX = this.oldOffsetX + (evt.offsetX - this.mouseDnX) * this.state.pixelRatio;
            this.offsetY = this.oldOffsetY + (evt.offsetY - this.mouseDnY) * this.state.pixelRatio;
            //console.log(`Move: ${newOffsetX}, ${newOffsetY}`);
            this.drawCached(false);
        }
    }

    handleMouseUp(evt:MouseEvent) {
        this.mouseDnX = undefined;
        this.mouseDnY = undefined;
        this.drawCached(true);
    }

    handleKey(evt:KeyboardEvent) {
        if (evt.key == "z") {
            this.scale = 1;
            this.offsetY = 0;
            this.offsetY = 0;
            if (this.cachedImage) {
                this.cachedImage.close();
                this.cachedImage = undefined;
            }
            this.setState({
                scale:1.0,
                offsetX: 0,
                offsetY: 0
            });
        }
    }

    handleWheel(evt:WheelEvent) {
        if (evt.deltaY == 0 || !this.props.selection || this.props.selection.length == 0) {
            return;
        }
        this.scale = (evt.deltaY < 0) ? this.scale * 1.05 : this.scale * 0.95;
        this.drawCached(true);
    }

    handleResize(evt:any) {
        let canvas = this.refs.canvas as HTMLCanvasElement;
        //console.log(`Canvas size ${canvas.clientWidth}x${canvas.clientHeight}`);
        let width = canvas.clientWidth * this.state.pixelRatio;
        let height = canvas.clientHeight * this.state.pixelRatio;
        canvas.width = width;
        canvas.height = height;
        if (this.cachedImage) {
            this.cachedImage.close();
            this.cachedImage = undefined;
        }
        this.setState({
            width: width,
            height: height,
        });
    }

    getSolidColor(layer:BoardLayer) {
        if (this.props.selection.length == 1) {
            return colorToHtml(this.props.layerColor);
        }
        return layerColors[layer];
    }

    getBorderColor(layer:BoardLayer) {
        if (this.props.selection.length == 1) {
            return colorToHtml(this.props.layerColor);
        }
        return layerColors[layer];
    }

    clearCanvas(context:CanvasRenderingContext2D) {
        context.clearRect(0, 0, this.state.width, this.state.height);
        if (this.props.useCheckeredBackground) {
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
        }
    }

    drawOutline(context:CanvasRenderingContext2D) {
        context.fillStyle = '#004400';
        context.fillRect(0, 0, this.state.width, this.state.height);
    }

    drawSelection(context:CanvasRenderingContext2D) {
        let selection = this.props.selection;
        let width = this.state.width;
        let height = this.state.height;
        if (selection.length > 1) {
            selection.sort((a, b) => a.boardLayer - b.boardLayer);
            this.drawOutline(context);
        }
        if (selection && width > 0 && height > 0) {
            let scaleX = width / this.state.contentSize.contentWidth;
            let scaleY = height / this.state.contentSize.contentHeight;
            let scale = Math.min(scaleX, scaleY);
            let originX = (width - this.state.contentSize.contentWidth * scale) / 2;
            let originY = (height - this.state.contentSize.contentHeight * scale) / 2;
            // Flip the Y axis
            context.translate(originX, this.state.height - originY);
            context.scale(scale, -scale);
            context.translate(
                -this.state.contentSize.contentMinX,
                -this.state.contentSize.contentMinY);
            context.lineWidth = 0;
            selection.forEach(o => {
                context.fillStyle = this.getSolidColor(o.boardLayer);
                let path:any = this.state.polygonPaths.get(o.fileName + ":solid");
                context.fill(path);
            });
            context.lineWidth = 1/scale;
            selection.forEach(o => {
                context.strokeStyle = this.getBorderColor(o.boardLayer);
                let path = this.state.polygonPaths.get(o.fileName + ":thin");
                context.stroke(path);
            });
        }
    }

    drawFine() {
        if (this.redrawTimer) {
            clearTimeout(this.redrawTimer);
        }
        this.redrawTimer = undefined;
        if (this.cachedImage) {
            this.cachedImage.close();
            this.cachedImage = undefined;
        }
        let canvas = this.refs.canvas as HTMLCanvasElement;
        const context = canvas.getContext('2d');
        this.clearCanvas(context);
        context.save();
        context.translate(this.state.offsetX, this.state.offsetY);
        context.scale(this.state.scale, this.state.scale);
        this.drawSelection(context);
        this.startX = Math.max(this.state.offsetX, 0);
        this.startY = Math.max(this.state.offsetY, 0);
        //console.log(`Creating image cache ${this.startX}, ${this.startY}`);
        let cachedImage = context.getImageData(
            this.startX,
            this.startY,
            this.state.width,
            this.state.height);
        createImageBitmap(cachedImage).then(bitmap => {
            this.cachedImage = bitmap;
        });
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        context.restore();
        //console.log('draw fine');
    }

    drawCached(shouldRedrawFine:boolean) {
        let canvas = this.refs.canvas as HTMLCanvasElement;
        const context = canvas.getContext('2d');
        this.clearCanvas(context);
        if (!this.cachedImage) {
            console.log("nothing cached");
        } else {
            context.save();
            context.translate(this.offsetX + this.startX, this.offsetY + this.startY);
            context.scale(this.scale, this.scale);
            context.drawImage(this.cachedImage, 0, 0);
            context.restore();
        }
        if (this.redrawTimer) {
            clearTimeout(this.redrawTimer);
            this.redrawTimer = undefined;
        }
        if (shouldRedrawFine) {
            this.redrawTimer = setTimeout(() => {
                    this.setState({
                        scale:this.state.scale * this.scale,
                        offsetX:this.state.offsetX + this.offsetX,
                        offsetY:this.state.offsetY + this.offsetY});
                },
                500);
        }
        //console.log('draw cached');
    }

    drawPolygon(polygon:Float64Array, context:CanvasRenderingContext2D|Path2D) {
        context.moveTo(polygon[0], polygon[1]);
        for (let idx = 2; idx < polygon.length; idx += 2) {
            context.lineTo(polygon[idx], polygon[idx + 1]);
        }
    }

    render() {
        return <canvas style={this.props.style} ref="canvas"/>;
    }
}