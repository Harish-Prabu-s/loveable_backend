const fs = require('fs');
const path = require('path');
const srcDir = path.resolve(__dirname, 'src');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
            processDir(full);
        } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
            let content = fs.readFileSync(full, 'utf8');
            const rel = path.relative(path.dirname(full), srcDir);
            let pref = rel === '' ? '.' : rel.replace(/\\/g, '/');
            if (!pref.startsWith('.')) pref = './' + pref;

            const newC = content.replace(/['"]@\/([^'"]+)['"]/g, (match, p1) => `'${pref}/${p1}'`);
            if (content !== newC) {
                fs.writeFileSync(full, newC);
                console.log('Updated ' + full);
            }
        }
    }
}

processDir(srcDir);
