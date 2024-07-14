const { Readable } = require('stream');
const fs = require('fs');

module.exports.downloadFile = async (link, params, outpath) => {
    const response = await fetch(`${link}?${new URLSearchParams(params).toString()}`);
    const body = Readable.fromWeb(response.body);
    const writeStream = fs.createWriteStream(outpath);
    await new Promise((resolve, reject) => (
        body.pipe(writeStream)
            .on('finish', () => resolve)
            .on('error', reject))
    );
}
