const fs = require('fs');
const crypto = require('crypto');

const BLOB_FILE_PREFIX = 'riot-stats.plot';

function doTask(chunk) {
    const filename = BLOB_FILE_PREFIX + '.' + crypto.randomBytes(4).toString('hex');
    fs.writeFile(filename, chunk, err => {
        if (err) console.error(err);
        else {
            process.stdout.json.write({
                filename: filename
            });
        }
    });
}

process.stdin.segment.on('data', doTask);
process.stdin.segment.on('end', () => process.exit());