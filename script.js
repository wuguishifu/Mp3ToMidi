const youtubeMp3Converter = require('youtube-mp3-converter');
const fs = require('fs');
const csv = require('csv-parse');
const axios = require('axios');
const FormData = require('form-data');
const { Readable } = require('stream');
const { finished } = require('stream/promises')
const prompt = require('prompt-sync')({ sigint: true });

const args = require('minimist')(process.argv.slice(2));

const out = args.quiet ? {
    write: () => true,
    moveCursor: () => true,
    clearLine: () => true
} : process.stdout;

const convertLinkToMp3 = youtubeMp3Converter(`${__dirname}/original`);

let ln = 0;

module.exports.run = async () => {
    checkFileStructure();

    const videoUrl = prompt('Enter youtube video url: ');
    if (!videoUrl.trim()) return console.log('please enter a url lol');
    let name = prompt('Enter file name or leave blank for default: ');
    if (!name.trim()) name = 'file';

    out.write('downloading mp3...');
    await convertLinkToMp3(videoUrl, { title: name }); // download mp3
    out.write('done\n');
    out.write('converting to midi...\n');
    ln++;
    await mp3ToMidi({ path: `${__dirname}/original/${name}.mp3`, name }) // convert to midi
    for (let i = 0; i < ln; i++) {
        out.moveCursor(0, -1)
        out.clearLine();
    };
    out.write('converting to midi...done\n');
    ln = 0;
    out.write('converting to mp3...\n');
    ln++;
    await midiToMp3({ path: `${__dirname}/midi/${name}.mid`, name }); // convert to mp3
    for (let i = 0; i < ln; i++) {
        out.moveCursor(0, -1)
        out.clearLine();
    };
    out.write('converting to mp3...done\n');
    !args['no-verbose'] && console.log('finished conversion');
};

module.exports.setlist = async (startAt) => {
    checkFileStructure();
    const rows = await parseSetlist(`${__dirname}/setlist.csv`);
    const keys = [];
    for (let i = 0; i < rows.length; i++) {
        const [videoUrl] = rows[i];
        keys[i] = [...rows[i]];
        if (i > 0) {
            keys[i][0] = `${i}.mp3`
        } else {
            keys[i][0] = 'File Name'
        }
        if (videoUrl.toLowerCase() === 'youtube link') continue;
        if (i < startAt) continue;
        const name = i.toString();
        !args['no-verbose'] && console.log(`---- converting ${videoUrl} (${name}.mp3) ----\n`);
        ln = 0;
        out.write('downloading mp3...');
        await convertLinkToMp3(videoUrl, { title: name }); // download mp3
        out.write('done\n');
        out.write('converting to midi...\n');
        ln++;
        await mp3ToMidi({ path: `${__dirname}/original/${name}.mp3`, name }) // convert to midi
        for (let i = 0; i < ln; i++) {
            out.moveCursor(0, -1)
            out.clearLine();
        };
        out.write('converting to midi...done\n');
        ln = 0;
        out.write('converting to mp3...\n');
        ln++;
        await midiToMp3({ path: `${__dirname}/midi/${name}.mid`, name }); // convert to mp3
        for (let i = 0; i < ln; i++) {
            out.moveCursor(0, -1)
            out.clearLine();
        };
        out.write('converting to mp3...done\n');
    }
    !args['no-verbose'] & console.log('\nfull setlist done.\n');
    fs.writeFileSync(`${__dirname}/key.csv`, keys.join('\n'));
};

module.exports.parallel = async () => {
    checkFileStructure();

    // disable so it doesn't look like crap lmao
    out.write = () => true;
    out.moveCursor = () => true;
    out.clearLine = () => true;

    const rows = await parseSetlist(`${__dirname}/setlist.csv`);
    const keys = [];
    const promises = [];
    for (let i = 0; i < rows.length; i++) {
        keys[i] = [...rows[i]];
        if (i > 0) {
            keys[i][0] = `${i}.mp3`
        } else {
            keys[i][0] = 'File Name'
        }
        const [videoUrl] = rows[i];
        if (videoUrl.toLowerCase() === 'youtube link') continue;
        const name = i.toString();
        !args['no-verbose'] && console.log(`---- converting ${videoUrl} (${name}.mp3) ----\n`);
        promises.push(new Promise(resolve => {
            (async () => {
                const now = performance.now();
                await convertLinkToMp3(videoUrl, { title: name }); // download mp3
                await mp3ToMidi({ path: `${__dirname}/original/${name}.mp3`, name }) // convert to midi
                await midiToMp3({ path: `${__dirname}/midi/${name}.mid`, name }); // convert to mp3
                !args['no-verbose'] && console.log(`finised converting ${name}.mp3 (${(performance.now() - now) / 1000}s)})`);
            })().then(() => resolve());
        }));
    }
    await Promise.all(promises);
    !args['no-verbose'] && console.log('\nfull setlist done.\n');
    fs.writeFileSync(`${__dirname}/key.csv`, keys.join('\n'));
}

const parseSetlist = (path) => {
    return new Promise(resolve => {
        const rows = [];
        fs.createReadStream(path)
            .pipe(csv.parse({ delimiter: ',', columns: false, ltrim: true }))
            .on('data', (row) => rows.push(row))
            .on('error', console.error)
            .on('end', () => resolve(rows))
    });
}

const checkFileStructure = () => {
    out.write('checking project structure...');
    if (!fs.existsSync(`${__dirname}/original`)) fs.mkdirSync(`${__dirname}/original`);
    if (!fs.existsSync(`${__dirname}/midi`)) fs.mkdirSync(`${__dirname}/midi`);
    if (!fs.existsSync(`${__dirname}/set`)) fs.mkdirSync(`${__dirname}/set`);
    out.write('done\n');
}

const mp3ToMidi = async ({ path, name }) => {
    // upload original mp3
    out.write('\tuploading mp3...');
    const form = new FormData();
    form.append('myfile', fs.createReadStream(path));
    const config = {
        method: 'POST',
        maxBodyLength: Infinity,
        url: 'https://cts.ofoct.com/upload.php',
        headers: {
            Cookie: 'PHPSESSID=2v0ikhmltckms8uaagfsaqva46',
            ...form.getHeaders()
        },
        data: form
    };
    const response = await axios(config);
    if (response.status !== 200) throw new Error('failed to upload mp3 file');
    const uploadFileUrl = response.data[0];
    out.write('done\n');
    ln++;

    out.write('\tconverting to midi...');
    // convert midi -> mp3
    const mp3ToMidiOptions = {
        cid: 'audio2midi',
        output: 'MID',
        tmpfpath: uploadFileUrl,
        row: 'file1',
        sourcename: name,
        rowid: 'file1'
    };
    const mp3ToMidiResponse = await fetch(`https://cts.ofoct.com/convert-file_v2.php?${new URLSearchParams(mp3ToMidiOptions).toString()}`);
    const mp3ToMidiAttribs = (await mp3ToMidiResponse.text()).split('|').filter(a => a.trim());
    if (mp3ToMidiAttribs[1] !== 'SUCCESS') throw new Error('failed to convert mp3->midi');
    out.write('done\n');
    ln++;

    out.write('\tdownloading midi...');
    const midiOptions = {
        type: 'get',
        genfpath: mp3ToMidiAttribs[2],
        downloadsavename: 'file.mid'
    };
    await downloadFile(`https://cts.ofoct.com/get-file.php?${new URLSearchParams(midiOptions).toString()}`, `${__dirname}/midi/${name}.mid`);
    out.write('done\n');
    ln++;
};

const midiToMp3 = async ({ path, name }) => {
    // upload midi
    out.write('\tuploading midi...');
    const form = new FormData();
    form.append('myfile', fs.createReadStream(path));
    const config = {
        method: 'POST',
        maxBodyLength: Infinity,
        url: 'https://cts.ofoct.com/upload.php',
        headers: {
            Cookie: 'PHPSESSID=2v0ikhmltckms8uaagfsaqva46',
            ...form.getHeaders()
        },
        data: form
    };
    const response = await axios(config);
    if (response.status !== 200) throw new Error('failed to upload midi file');
    const uploadFileUrl = response.data[0];
    out.write('done\n');
    ln++;

    out.write('\tconverting to mp3...');
    // convert midi -> mp3
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
        adjust_volume: 150, // increase volume 
        adjust_drum_power: 100,
        adjust_tempo: 100,
        adjust_key: 0,
        rowid: 'file1'
    }
    const midiToMp3Response = await fetch(`https://cts.ofoct.com/midi2mp3_convert.php?${new URLSearchParams(midiToMp3Options).toString()}`);
    const midiToMp3Attribs = (await midiToMp3Response.text()).split('|').filter(a => a.trim());
    if (midiToMp3Attribs[1] !== 'SUCCESS') throw new Error('failed to convert midi->mp3');
    out.write('done\n');
    ln++;

    out.write('\tdownloading mp3...');
    const mp3Options = {
        type: 'get',
        genfpath: midiToMp3Attribs[2],
        downloadsavename: 'file.mp3'
    };
    await downloadFile(`https://cts.ofoct.com/get-file.php?${new URLSearchParams(mp3Options).toString()}`, `${__dirname}/set/${name}.mp3`)
    out.write('done\n');
    ln++;
}

const downloadFile = async (link, outpath) => {
    const response = await fetch(link);
    const body = Readable.fromWeb(response.body);
    const writeStream = fs.createWriteStream(outpath);
    await finished(body.pipe(writeStream));
};