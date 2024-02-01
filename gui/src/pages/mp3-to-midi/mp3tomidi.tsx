import { Button } from '@/components/ui/button';
import { File, columns } from '@/components/ui/files-table/columns';
import { FilesTable } from '@/components/ui/files-table/data-table';
import { exists } from '@/lib/utils';
import { RowSelectionState } from '@tanstack/react-table';
import { open } from '@tauri-apps/api/dialog';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import useMp3ToMidi from './useMp3ToMidi';

export default function Mp3ToMidi(): JSX.Element {
    const [files, setFiles] = useState<File[]>([]);
    const [selected, setSelected] = useState<RowSelectionState>({});

    const [testResponse, setTestResponse] = useState<ArrayBuffer>();

    const convertToMidi = useMp3ToMidi();

    const openFilePicker = useCallback(async () => {
        const result = await open({
            title: 'Select an MP3 file.',
            filters: [{ name: 'MP3', extensions: ['mp3'] }],
            multiple: true
        });
        if (result == null) return;

        let files: File[];
        if (Array.isArray(result)) files = result.map(file => ({ filename: file, status: 'pending' }));
        else files = [{ filename: result, status: 'pending' }];

        setFiles(files);
    }, []);

    const onClearSelected = useCallback(() => {
        setFiles(prevState => prevState
            .map((file, index) => index in selected ? null : file)
            .filter(exists)
        );
        setSelected({});
    }, [selected]);

    const onClearFiles = useCallback(() => {
        setFiles([]);
    }, []);

    const onConvertToMidi = useCallback(async () => {
        let midi: ArrayBuffer | null = null;
        try {
            midi = await convertToMidi(files[0].filename);
        } catch (error) {
            console.error(error);
            return toast.error('Failed to convert to midi.');
        }
        if (midi == null) {
            toast.error('Failed to convert to midi.');
            return;
        }
        setTestResponse(midi);
    }, [files, convertToMidi]);

    return (
        <>
            <div className='flex flex-row justify-end w-3/4'>
                <Button onClick={openFilePicker}>add mp3 files</Button>
            </div>
            <FilesTable
                columns={columns}
                data={files}
                selected={selected}
                setSelected={setSelected}
            />
            <div className='h-4' />
            <div className='flex flex-row items-center gap-4 justify-end w-3/4'>
                {Object.keys(selected)?.length ? (
                    <Button onClick={onClearSelected} variant='destructive'>clear selected</Button>
                ) : null}
                <Button onClick={onClearFiles} variant='destructive' disabled={!files?.length}>clear files</Button>
                <Button onClick={onConvertToMidi} disabled={!files?.length}>convert to midi</Button>
            </div>
        </>
    )
}