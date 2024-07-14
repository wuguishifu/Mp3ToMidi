const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { downloadFile } = require('./download-file');

module.exports.midiToMp3 = async (path, name) => {
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
    if (response.status !== 200) throw new Error(`failed to upload ${name}.mid`);
    const uploadFileUrl = response.data[0];

    const midiToMp3Response = await fetch(`https://cts.ofoct.com/midi2mp3_convert.php?${new URLSearchParams({
        tmpfpath: uploadFileUrl,
        row: 'file1',
        sourcename: 'file.mid',
        outformat: 'mp3',
        AudioQuality: 19,
        AudioEncoder: 1,
        AudioSamplingRate: 11,
        AudioChannels: 1,
        soundfont: 'freepats',
        adjust_volume: 150,
        adjust_drum_power: 100,
        adjust_tempo: 100,
        adjust_key: 0,
        rowid: 'file1',
    }).toString()}`)
    const midiToMp3Attribs = (await midiToMp3Response.text()).split('|').filter((a) => a.trim());
    if (midiToMp3Attribs[1] !== 'SUCCESS') throw new Error('failed to convert midi->mp3');

    await downloadFile(
        'https://cts.ofoct.com/get-file.php',
        { type: 'get', genfpath: midiToMp3Attribs[2], downloadsavename: 'file.mp3' },
        `${__dirname}/../set/${name}.mp3`
    );
};
