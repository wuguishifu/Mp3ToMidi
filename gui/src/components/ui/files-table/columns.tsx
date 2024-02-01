import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';

export type File = {
    filename: string;
    status: 'pending' | 'processing' | 'success' | 'failed';
};

export const columns: ColumnDef<File>[] = [
    {
        id: 'select',
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected() || (table.getIsSomeRowsSelected() && 'indeterminate')}
                onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
                aria-label='Select all'
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={value => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: 'filename',
        header: 'File Name',
        cell: ({ row }) => (
            <p className='my-1'>
                {row.getValue('filename')}
            </p>
        ),
        size: 2000,
        minSize: 2000,
        maxSize: 40000
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
            <p className={cn(row.getValue('status'), 'my-1')}>
                {row.getValue('status')}
            </p>
        ),
    }
];