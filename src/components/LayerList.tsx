import * as React from "react";
import * as ReactTable from "react-table";
import * as FontAwesomeIcon from "@fortawesome/react-fontawesome";
import * as faSquare from "@fortawesome/fontawesome-free-regular/faSquare";
import * as faCheckSquare from "@fortawesome/fontawesome-free-regular/faCheckSquare";
import '../../css/react-table.css';
import { LayerName } from "./LayerName";
import { LayerSide } from "./LayerSide";
import { BoardLayer, BoardSide } from "../../../grbparser/dist/gerberutils";
import { LayerInfo } from "./LayerViewer";

export interface LayerListProps { 
    layers:Array<LayerInfo>;
    onClick?:(fileName:string) => void;
    onChangeLayer?:(fileName:string, layer:BoardLayer) => void;
    onChangeSide?:(fileName:string, side:BoardSide) => void;
    style?:React.CSSProperties;
}

export class LayerList extends React.Component<LayerListProps, {}> {
    private static LeftAlignText = { textAlign:"left" };
    private Columns:Array<ReactTable.Column> = [
        { accessor: 'selected', Header:'', width:25, Cell: row => 
            <FontAwesomeIcon icon={(row.value) ? faCheckSquare : faSquare}/>
        },
        { accessor: 'fileName', Header:'File Name', headerStyle:LayerList.LeftAlignText },
        { accessor: 'boardLayer', Header:'Layer', headerStyle:LayerList.LeftAlignText, width:150, Cell: row =>
            <LayerName layer={row.value} onChange={(layer:BoardLayer) => {
                this.changeLayer(row.row.fileName, layer);
            }}/>
        },
        { accessor: 'boardSide', Header:'Side', headerStyle:LayerList.LeftAlignText, width:150, Cell: row => 
            <LayerSide side={row.value} onChange={(side:BoardSide) => {
                this.changeSide(row.row.fileName, side);
            }}/>
        },
        { accessor: 'status', Header:'Status', headerStyle:LayerList.LeftAlignText, width:100 },
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
            getTdProps={
                (state:any, rowInfo:ReactTable.RowInfo, column:ReactTable.Column) => {
                return {
                    onClick: (e:any) => {
                        if (!rowInfo) {
                            return;
                        }
                        if (column.Header == ""
                            || column.Header == "File Name"
                            || column.Header == "Status") {
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