const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const readline = require('readline');

module.exports.downloadMp3 = async (url, name) => {
    const stream = ytdl(url, {
        filter: 'audioonly',
        quality: 'highestaudio',
    });

    await new Promise((resolve, reject) => {
        ffmpeg(stream)
            .audioBitrate(128)
            .save(`${__dirname}/../original/${name}.mp3`)
            .on('progress', p => {
                readline.cursorTo(process.stdout, 0);
                process.stdout.write(`${name}.mp3 ${p.targetSize}kb downloaded`);
            })
            .on('end', () => {
                resolve();
                console.log(`\n${name}.mp3 downloaded`);
            })
            .on('error', reject);
    });
};
