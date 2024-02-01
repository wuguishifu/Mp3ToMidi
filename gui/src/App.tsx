import { open } from '@tauri-apps/api/dialog';
import { readBinaryFile } from '@tauri-apps/api/fs';
import { useCallback } from 'react';
import { Button } from './components/ui/button';

export default function App() {

    const openFilePicker = useCallback(async () => {
        const result = await open({
            title: 'Select an MP3 file.',
            filters: [{ name: 'MP3', extensions: ['mp3'] }],
            multiple: false
        });

        if (result == null) return;

        const file = await readBinaryFile(result as string);
    }, []);

    return (
        <>
            <h1>Welcome to the MP3 To MIDI GUI.</h1>
            <Button onClick={openFilePicker}>Select an MP3 file.</Button>
        </>
    );
};