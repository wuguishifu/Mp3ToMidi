import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ColumnDef, OnChangeFn, RowSelectionState, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    selected: RowSelectionState;
    setSelected: OnChangeFn<RowSelectionState>;
}

export function FilesTable<TData, TValue>({
    columns,
    data,
    selected,
    setSelected,
}: DataTableProps<TData, TValue>): JSX.Element {

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onRowSelectionChange: setSelected,
        state: {
            rowSelection: selected
        }
    });

    return (
        <div className="w-3/4">
            <div className="rounded-md border w-full bg-slate-50">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )
                                        }
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map(row => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-16 text-center">
                                    No files.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex flex-row items-center justify-between mt-2 pl-4 pr-8">
                <div className="text-sm text-primary font-medium">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} selected.
                </div>
            </div>
        </div>
    );
};