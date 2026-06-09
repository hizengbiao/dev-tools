const fs = require('fs');
const path = require('path');

const distIndexPath = path.join(__dirname, '..', 'dist', 'index.html');
const html = fs.readFileSync(distIndexPath, 'utf8');

if (html.includes('src="../../nav.js"')) {
  process.exit(0);
}

if (!html.includes('src="../nav.js"')) {
  throw new Error('Expected dist/index.html to contain src="../nav.js"');
}

const fixedHtml = html.replace('src="../nav.js"', 'src="../../nav.js"');
fs.writeFileSync(distIndexPath, fixedHtml, 'utf8');
