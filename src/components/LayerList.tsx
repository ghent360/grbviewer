import * as React from "react";
import * as ReactTable from "react-table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSquare, faCheckSquare } from "@fortawesome/fontawesome-free-regular";
import '../../css/react-table.css';
import { LayerName } from "./LayerName";
import { LayerSide } from "./LayerSide";
import { BoardLayer, BoardSide } from "../../../grbparser/dist/gerberutils";
import { LayerInfo } from "..";
import { ColorPicker } from "./ColorPicker";
import * as Color from 'color';

export interface LayerListProps { 
    layers:Array<LayerInfo>;
    onClick?:(fileName:string) => void;
    onChangeLayer?:(fileName:string, layer:BoardLayer) => void;
    onChangeSide?:(fileName:string, side:BoardSide) => void;
    onChangeOpacity?:(fileName:string, opacity:number) => void;
    onChangeColor?:(fileName:string, color:Color) => void;
    style?:React.CSSProperties;
}

export class LayerList extends React.Component<LayerListProps, {}> {
    private static LeftAlignText = { textAlign:"left" };
    private Columns:Array<ReactTable.Column> = [
        { 
            accessor: 'selected',
            Header:'',
            width:25, 
            Cell: cell => <FontAwesomeIcon icon={(cell.value) ? faCheckSquare : faSquare}/>
        },
        { accessor: 'fileName', Header:'File Name', headerStyle:LayerList.LeftAlignText },
        { 
            accessor: 'boardLayer',
            Header:'Layer',
            className:'rt-td-v', 
            headerStyle:LayerList.LeftAlignText,
            width:120,
            Cell: cell =>
            <LayerName layer={cell.value} onChange={(layer:BoardLayer) =>
                this.changeLayer(cell.row.fileName, layer)
            }/>
        },
        {
            accessor: 'boardSide',
            Header:'Side',
            className:'rt-td-v', 
            headerStyle:LayerList.LeftAlignText,
            width:110,
            Cell: cell => 
            <LayerSide side={cell.value} onChange={(side:BoardSide) => 
                this.changeSide(cell.row.fileName, side)
            }/>
        },
        {
            accessor: 'color',
            Header: ' ',
            width:30,
            Cell: cell => <ColorPicker color={cell.value as Color} onChange={
                (color:Color) => this.changeColor(cell.row.fileName, color)
            }/>
        },
        { 
            id:"status",
            accessor: (row:LayerInfo) => ({status:row.status, opacity:row.opacity}),
            Header:'Status',
            headerStyle:LayerList.LeftAlignText,
            width:80,
            Cell: cell => !cell.row.selected ? cell.value.status : (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#dadada',
                        borderRadius: '2px'
                    }}
                    onClick={ (e:React.MouseEvent<HTMLDivElement>) => {
                        let opacity = e.nativeEvent.offsetX/e.currentTarget.clientWidth;
                        opacity = Math.round(opacity * 10);
                        this.changeOpacity(cell.row.fileName, opacity / 10);
                    }}
                >
                    <div
                        style={{
                            width: `${Math.round(cell.value.opacity * 100)}%`,
                            height: '100%',
                            backgroundColor: '#858585',
                            borderRadius: '2px'
                        }}
                    />
                </div>
              ),
        },
    ];

    changeLayer(fileName:string, layer:BoardLayer) {
        if (this.props.onChangeLayer) {
            this.props.onChangeLayer(fileName, layer);
        }
    }

    changeSide(fileName:string, side:BoardSide) {
        if (this.props.onChangeSide) {
            this.props.onChangeSide(fileName, side);
        }
    }

    changeOpacity(fileName:string, opacity:number) {
        if (this.props.onChangeOpacity) {
            this.props.onChangeOpacity(fileName, opacity);
        }
    }

    changeColor(fileName:string, color:Color) {
        if (this.props.onChangeColor) {
            this.props.onChangeColor(fileName, color);
        }
    }

    render() {
        let tableSize =this.props.layers.length;
        let showPagination = false;
        if (tableSize == 0 || tableSize > 20) {
            showPagination = tableSize > 0;
            tableSize = 20;
        }
        return <ReactTable.default
            style={this.props.style}
            data={this.props.layers}
            noDataText="No gerber data found"
            columns={this.Columns}
            defaultPageSize={tableSize}
            minRows={tableSize}
            showPageSizeOptions={false}
            getTdProps={
                (state:any, rowInfo:ReactTable.RowInfo, column:ReactTable.Column) => {
                return {
                    onClick: (e:any) => {
                        if (!rowInfo) {
                            return;
                        }
                        if (column.Header == ""
                            || column.Header == "File Name") {
                            let row = this.props.layers[rowInfo.index];
                            if (this.props.onClick && row.status == 'done') {
                                this.props.onClick(row.fileName);
                            }
                        }
                    }
                }
            }}
            showPagination={showPagination} />;
    }
}