import * as React from "react";
import * as ReactTable from "react-table";
import * as FontAwesomeIcon from "@fortawesome/react-fontawesome";
import * as faSquare from "@fortawesome/fontawesome-free-regular/faSquare";
import * as faCheckSquare from "@fortawesome/fontawesome-free-regular/faCheckSquare";
import 'react-table/react-table.css';
import { LayerName } from "./LayerName";
import { LayerSide } from "./LayerSide";
import { BoardLayer, BoardSide } from "../../../grbparser/dist/gerberutils";

export interface LayerInfo {
    readonly fileName:string;
    readonly boardLayer:BoardLayer,
    readonly boardSide:BoardSide,
    readonly status:string;
    readonly selected:boolean;
}

export interface LayerListProps { 
    layers:Array<LayerInfo>;
    onClick?:(fileName:string) => void;
    style?:React.CSSProperties;
}

export class LayerList extends React.Component<LayerListProps, {}> {
    private static LeftAlignText = { textAlign:"left" };
    private static Columns:Array<ReactTable.Column> = [
        { accessor: 'selected', Header:'', width:25, Cell: row => (
            <FontAwesomeIcon icon={(row.value) ? faCheckSquare : faSquare}/>
        )},
        { accessor: 'fileName', Header:'File Name', headerStyle:LayerList.LeftAlignText },
        { accessor: 'boardLayer', Header:'Layer', headerStyle:LayerList.LeftAlignText, width:150, Cell: row => (
            <LayerName layer={row.value}/>
        )},
        { accessor: 'boardSide', Header:'Side', headerStyle:LayerList.LeftAlignText, width:150, Cell: row => (
            <LayerSide side={row.value}/>
        )},
        { accessor: 'status', Header:'Status', headerStyle:LayerList.LeftAlignText, width:150 },
    ];

    render() {
        return <ReactTable.default
            style={this.props.style}
            data={this.props.layers}
            noDataText="No gerber data found"
            columns={LayerList.Columns}
            defaultPageSize={-1}
            getTrProps={
                (state:any, rowInfo:ReactTable.RowInfo) => {
                return {
                    onClick: (e:any) => {
                        let row = this.props.layers[rowInfo.index];
                        if (this.props.onClick && row.status == 'done') {
                            this.props.onClick(row.fileName);
                        }
                    }
                }
            }}
            showPagination={false} />;
    }
}