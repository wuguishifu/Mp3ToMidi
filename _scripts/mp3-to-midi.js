const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { downloadFile } = require('./download-file');

module.exports.mp3ToMidi = async (path, name) => {
    const form = new FormData();
    form.append('myfile', fs.createReadStream(path));
    const response = await axios({
        method: 'POST',
        maxBodyLength: Infinity,
        url: 'https://cts.ofoct.com/upload.php',
        headers: {
            Cookie: 'PHPSESSID=2v0ikhmltckms8uaagfsaqva46',
            ...form.getHeaders(),
        },
        data: form,
    });
    if (response.status !== 200) throw new Error(`failed to upload ${name}.mp3`);
    const uploadFileUrl = response.data[0];
    const mp3ToMidiResponse = await fetch(`https://cts.ofoct.com/convert-file_v2.php?${new URLSearchParams({
        cid: 'audio2midi',
        output: 'MID',
        tmpfpath: uploadFileUrl,
        row: 'file1',
        sourcename: name,
        rowid: 'file1',
    }).toString()}`);
    const mp3ToMidiAttribs = (await mp3ToMidiResponse.text()).split('|').filter((a) => a.trim());
    if (mp3ToMidiAttribs[1] !== 'SUCCESS') throw new Error(`failed to convert ${name}.mp3 -> ${name}.mid`);

    await downloadFile(
        'https://cts.ofoct.com/get-file.php',
        { type: 'get', genfpath: mp3ToMidiAttribs[2], downloadsavename: 'file.mid' },
        `${__dirname}/../midi/${name}.mid`
    );
};
