const fs = require('fs');
const crypto = require('crypto');
const glob = require('glob');
const path = require('path');
const engine = require('./engine-path');

const hash = crypto.createHash('sha256');

const getAllFiles = (g, cwd = root) => glob.sync(g, {
  cwd,
  absolute: true
});

const root = path.join(__dirname, '..', '..');
const files = [
  __filename,
  // The engine is scratch-gui's; hash it from there so a change over here still
  // invalidates every packaged project's cached runtime.
  ...getAllFiles('./{scaffolding,addons,common,packager}/**/*', engine),
  path.join(root, 'src', 'build', 'packager-runtime.js'),
  path.join(root, 'src', 'packager', 'brand.js'),
  ...getAllFiles('./node_modules/scratch-vm/src/**/*'),
  ...getAllFiles('./node_modules/scratch-render/src/**/*'),
  path.join(root, 'webpack.config.js'),
  path.join(root, 'package.json'),
  path.join(root, 'package-lock.json')
];
for (const file of files) {
  const stat = fs.statSync(file);
  if (!stat.isDirectory()) {
    hash.update(fs.readFileSync(file, 'utf-8'));
  }
}

const hex = hash.digest('hex');
console.log('Scaffolding build ID: ' + hex);
module.exports = hex;
