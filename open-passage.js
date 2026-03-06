const path = require('path');
const { spawn } = require('child_process');

const filePath = process.argv[2];

if (!filePath) {
    console.error('No file path provided');
    process.exit(1);
}

const normalized = filePath.replace(/\\/g, '/');

// Try passages/groupName/passageID.psg format first
let match = normalized.match(/passages\/([^\/]+)\/(.+?)\.psg$/);

// If that doesn't match, try groupName/passageID.psg (for root-level groups like quickstart)
if (!match) {
    match = normalized.match(/\/([^\/]+)\/([^\/]+?)\.psg$/);
}

if (!match) {
    console.error('Not a valid passage file');
    console.error('Expected format: passages/groupName/passageID.psg or groupName/passageID.psg');
    process.exit(1);
}

const group = match[1];
const passageId = match[2].replace(/\//g, '_');
const passageName = `${group}_${passageId}`;

const url = `http://localhost:3000/#${passageName}`;

console.log(`Opening passage: ${passageName}`);
console.log(`URL: ${url}`);
console.log('');
console.log('⚠️  Make sure the server is running: npm start');
console.log('');

const command = process.platform === 'win32' ? 'start' : 
                process.platform === 'darwin' ? 'open' : 'xdg-open';

const shell = process.platform === 'win32';

spawn(command, [url], { shell, detached: true, stdio: 'ignore' }).unref();
