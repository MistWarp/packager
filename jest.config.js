const path = require('path');
const engine = require('./src/build/engine-path');

module.exports = {
  // CI checks scratch-gui out inside this repository; its tests are not ours.
  roots: ['<rootDir>/test'],
  // As in webpack.config.js: engine sources resolve against our dependencies,
  // wherever the engine is checked out.
  moduleDirectories: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
  moduleNameMapper: {
    // The packaging engine lives in scratch-gui; see src/build/engine-path.js.
    '^@packager/(.*)$': `${engine}/$1`,
    '^virtual:packager-runtime$': '<rootDir>/src/build/packager-runtime.js'
  }
};
