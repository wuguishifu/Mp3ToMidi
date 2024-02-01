import { Body, ResponseType, getClient } from '@tauri-apps/api/http';
import { useCallback } from "react";

export default function useMp3ToMidi() {
    const convertToMidi = useCallback(async (path: string) => {
        // create tauri http client
        const client = await getClient();

        // use tauri to upload the original mp3 file
        const body = Body.form({
            myfile: { file: path }
        });

        // const response = await client.post('http://localhost:3000/test', body, {
        const response = await client.post('https://cts.ofoct.com/upload.php', body, {
            headers: {
                Cookie: 'PHPSESSID=2v0ikhmltckms8uaagfsaqva46',
                'Content-Type': 'multipart/form-data',
                Accept: 'text/html'
            },
            timeout: 5000,
            responseType: ResponseType.Text
        });

        console.log(JSON.stringify(response, null, 2));

        return null;
    }, []);

    return convertToMidi;
};