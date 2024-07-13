const fs = require('fs');
const csv = require('csv-parse');
const axios = require('axios');
const FormData = require('form-data');
const { Readable } = require('stream');
const { finished } = require('stream/promises');
const prompt = require('prompt-sync')({ sigint: true });
const args = require('minimist')(process.argv.slice(2));
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const readline = require('readline');

const out = args.quiet ? {
    write: () => true,
    moveCursor: () => true,
    clearLine: () => true,
} : process.stdout;

let ln = 0;

module.exports.run = async () => {
    const videoUrl = prompt('Enter youtube video url: ');
    if (!videoUrl.trim()) return console.log('please enter a url lol');
    let name = prompt('Enter file name or leave blank for default: ');
    if (!name.trim()) name = 'file';

    out.write('downloading mp3...');
    await downloadMp3(videoUrl, name);
    out.write('done\n');
    out.write('converting to midi...\n');
    ln++;
    await mp3ToMidi({ path: `${__dirname}/original/${name}.mp3`, name });
    for (let i = 0; i < ln; i++) {
        out.moveCursor(0, -1);
        out.clearLine();
    }
    out.write('converting to midi...done\n');
    ln = 0;
    out.write('converting to mp3...\n');
    ln++;
    await midiToMp3({ path: `${__dirname}/midi/${name}.mid`, name });
    for (let i = 0; i < ln; i++) {
        out.moveCursor(0, -1);
        out.clearLine();
    }
    out.write('converting to mp3...done\n');
    if (args['no-verbose']) return;
    console.log('finished conversion');
};

module.exports.setlist = async (startAt) => {
    const rows = await parseSetlist(`${__dirname}/setlist.csv`);
    const keys = [];
    for (let i = 0; i < rows.length; i++) {
        const [videoUrl] = rows[i];
        keys[i] = [...rows[i]];
        if (i > 0) {
            keys[i][0] = `${i}.mp3`;
        } else {
            keys[i][0] = 'File Name';
        }
        if (videoUrl.toLowerCase() === 'youtube link') continue;
        if (i < startAt) continue;
        const name = i.toString();
        !args['no-verbose'] && console.log(`---- converting ${videoUrl} (${name}.mp3) ----\n`);
        ln = 0;
        out.write('downloading mp3...');
        await downloadMp3(videoUrl, name);
        out.write('done\n');
        out.write('converting to midi...\n');
        ln++;
        await mp3ToMidi({ path: `${__dirname}/original/${name}.mp3`, name });
        for (let j = 0; j < ln; j++) {
            out.moveCursor(0, -1);
            out.clearLine();
        }
        out.write('converting to midi...done\n');
        ln = 0;
        out.write('converting to mp3...\n');
        ln++;
        await midiToMp3({ path: `${__dirname}/midi/${name}.mid`, name });
        for (let j = 0; j < ln; j++) {
            out.moveCursor(0, -1);
            out.clearLine();
        }
        out.write('converting to mp3...done\n');
    }
    if (!args['no-verbose']) console.log('\nfull setlist done.\n');
    fs.writeFileSync(`${__dirname}/key.csv`, keys.join('\n'));
};

module.exports.parallel = async () => {
    out.write = () => true;
    out.moveCursor = () => true;
    out.clearLine = () => true;

    const rows = await parseSetlist(`${__dirname}/setlist.csv`);
    const keys = [];
    const promises = [];
    const bigNow = performance.now();
    for (let i = 0; i < rows.length; i++) {
        keys[i] = [...rows[i]];
        if (i > 0) {
            keys[i][0] = `${i}.mp3`;
        } else {
            keys[i][0] = 'File Name';
        }
        const [videoUrl] = rows[i];
        if (videoUrl.toLowerCase() === 'youtube link') continue;
        const name = i.toString();
        if (!args['no-verbose']) console.log(`converting ${videoUrl} (${name}.mp3)`);
        promises.push(new Promise((resolve) => {
            (async () => {
                const now = performance.now();
                await downloadMp3(videoUrl, name);
                await mp3ToMidi({ path: `${__dirname}/original/${name}.mp3`, name });
                await midiToMp3({ path: `${__dirname}/midi/${name}.mid`, name });
                if (!args['no-verbose']) console.log(`finised converting ${name}.mp3 (${Math.round((performance.now() - now) / 10) / 100}s)`);
            })().then(() => resolve());
        }));
    }
    await Promise.all(promises);
    if (!args['no-verbose']) console.log(`\nfull setlist done. (${Math.round((performance.now() - bigNow) / 10) / 100}s)\n`);
    fs.writeFileSync(`${__dirname}/key.csv`, keys.join('\n'));
};

async function parseSetlist(path) {
    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(path)
            .pipe(csv.parse({ delimiter: ',', columns: false, ltrim: true }))
            .on('data', (row) => rows.push(row))
            .on('error', reject)
            .on('end', () => resolve(rows));
    });
}

async function mp3ToMidi({ path, name }) {
    out.write('\tuploading mp3...');
    const form = new FormData();
    form.append('myfile', fs.createReadStream(path));
    const config = {
        method: 'POST',
        maxBodyLength: Infinity,
        url: 'https://cts.ofoct.com/upload.php',
        headers: {
            Cookie: 'PHPSESSID=2v0ikhmltckms8uaagfsaqva46',
            ...form.getHeaders(),
        },
        data: form,
    };
    const response = await axios(config);
    if (response.status !== 200) throw new Error('failed to upload mp3 file');
    const uploadFileUrl = response.data[0];
    out.write('done\n');
    ln++;

    out.write('\tconverting to midi...');
    const mp3ToMidiOptions = {
        cid: 'audio2midi',
        output: 'MID',
        tmpfpath: uploadFileUrl,
        row: 'file1',
        sourcename: name,
        rowid: 'file1',
    };
    const mp3ToMidiResponse = await fetch(`https://cts.ofoct.com/convert-file_v2.php?${new URLSearchParams(mp3ToMidiOptions).toString()}`);
    const mp3ToMidiAttribs = (await mp3ToMidiResponse.text()).split('|').filter((a) => a.trim());
    if (mp3ToMidiAttribs[1] !== 'SUCCESS') throw new Error('failed to convert mp3->midi');
    out.write('done\n');
    ln++;

    out.write('\tdownloading midi...');
    const midiOptions = {
        type: 'get',
        genfpath: mp3ToMidiAttribs[2],
        downloadsavename: 'file.mid',
    };
    await downloadFile(`https://cts.ofoct.com/get-file.php?${new URLSearchParams(midiOptions).toString()}`, `${__dirname}/midi/${name}.mid`);
    out.write('done\n');
    ln++;
}

async function midiToMp3({ path, name }) {
    out.write('\tuploading midi...');
    const form = new FormData();
    form.append('myfile', fs.createReadStream(path));
    const config = {
        method: 'POST',
        maxBodyLength: Infinity,
        url: 'https://cts.ofoct.com/upload.php',
        headers: {
            Cookie: 'PHPSESSID=2v0ikhmltckms8uaagfsaqva46',
            ...form.getHeaders(),
        },
        data: form,
    };
    const response = await axios(config);
    if (response.status !== 200) throw new Error('failed to upload midi file');
    const uploadFileUrl = response.data[0];
    out.write('done\n');
    ln++;

    out.write('\tconverting to mp3...');
    const midiToMp3Options = {
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
    };
    const midiToMp3Response = await fetch(`https://cts.ofoct.com/midi2mp3_convert.php?${new URLSearchParams(midiToMp3Options).toString()}`);
    const midiToMp3Attribs = (await midiToMp3Response.text()).split('|').filter((a) => a.trim());
    if (midiToMp3Attribs[1] !== 'SUCCESS') throw new Error('failed to convert midi->mp3');
    out.write('done\n');
    ln++;

    out.write('\tdownloading mp3...');
    const mp3Options = {
        type: 'get',
        genfpath: midiToMp3Attribs[2],
        downloadsavename: 'file.mp3',
    };
    await downloadFile(`https://cts.ofoct.com/get-file.php?${new URLSearchParams(mp3Options).toString()}`, `${__dirname}/set/${name}.mp3`);
    out.write('done\n');
    ln++;
}

async function downloadMp3(url, name) {
    const stream = ytdl(url, {
        filter: 'audioonly',
        quality: 'highestaudio',
    });

    await new Promise((resolve, reject) => {
        ffmpeg(stream)
            .audioBitrate(128)
            .save(`${__dirname}/original/${name}.mp3`)
            .on('progress', p => {
                if (args.quiet) return;
                readline.cursorTo(process.stdout, 0);
                process.stdout.write(`${name}.mp3 ${p.targetSize}kb downloaded`);
            })
            .on('end', () => {
                resolve();
                if (args.quiet) return;
                console.log(`\n${name}.mp3 downloaded`)
            })
            .on('error', reject);
    })
}

async function downloadFile(link, outpath) {
    const response = await fetch(link);
    const body = Readable.fromWeb(response.body);
    const writeStream = fs.createWriteStream(outpath);
    await finished(body.pipe(writeStream));
}
