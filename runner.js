const args = require('minimist')(process.argv.slice(2));
const { run, setlist } = require('./script.js');

if (args.setlist) {
    setlist().then(() => process.exit(0));
} else {
    run().then(() => process.exit(0));
}