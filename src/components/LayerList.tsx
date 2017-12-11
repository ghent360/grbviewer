import * as React from "react";
import * as ReactTable from 'react-table';
import 'react-table/react-table.css';

export interface LayerInfo {
    readonly fileName:string;
    // Top, Bottom, All
    readonly layerName:string;
    // Copper, solder mask, drill etc.
    readonly layerType:string;
    readonly status:string;
}

export interface LayerListProps { 
    layers:Array<LayerInfo>;
    onClick?:(fileName:string) => void;
}

export class LayerList extends React.Component<LayerListProps, {}> {
    private static LeftAlignText = { textAlign:"left" };
    private static Columns:Array<ReactTable.Column> = [
        { accessor: 'fileName', Header:'File Name', headerStyle:LayerList.LeftAlignText },
        { accessor: 'layerName', Header:'Layer Name', headerStyle:LayerList.LeftAlignText },
        { accessor: 'layerType', Header:'Type', headerStyle:LayerList.LeftAlignText },
        { accessor: 'status', Header:'Status', headerStyle:LayerList.LeftAlignText },
    ];

    render() {
        return <ReactTable.default
            data={this.props.layers}
            noDataText=""
            columns={LayerList.Columns}
            defaultPageSize={-1}
            getTrProps={
                (state:any, rowInfo:ReactTable.RowInfo) => {
                return {
                    onClick: (e:any) => {
                        let row = this.props.layers[rowInfo.index];
                        if (this.props.onClick) {
                            this.props.onClick(row.fileName);
                        }
                    }
                }
            }}
            showPagination={false} />;
    }
}