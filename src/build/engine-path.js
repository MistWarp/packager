const fs = require('fs');
const path = require('path');

// The packaging engine lives in scratch-gui so that the editor and this site share
// one copy instead of two that drift apart. Check MistWarp/scratch-gui out beside
// this repository, or point SCRATCH_GUI at it. Only src/packager is ever read.
const scratchGUI = path.resolve(process.env.SCRATCH_GUI || path.join(__dirname, '..', '..', '..', 'scratch-gui'));
const engine = path.join(scratchGUI, 'src', 'packager');

if (!fs.existsSync(engine)) {
  throw new Error(`Cannot find the packaging engine at ${engine}. ` +
    'Clone MistWarp/scratch-gui beside this repository, or set SCRATCH_GUI to where it lives.');
}

module.exports = engine;
