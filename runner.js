const args = require('minimist')(process.argv.slice(2));
const { run, setlist, parallel } = require('./script.js');

if (args.setlist) {
    setlist(args['start-at'] || 0).then(() => process.exit(0));
} else if (args.parallel) {
    parallel().then(() => process.exit(0));
} else {
    run().then(() => process.exit(0));
}