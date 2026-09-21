const engine = require('./src/build/engine-path');

module.exports = {
  // CI checks scratch-gui out inside this repository; its tests are not ours.
  roots: ['<rootDir>/test'],
  moduleNameMapper: {
    // The packaging engine lives in scratch-gui; see src/build/engine-path.js.
    '^@packager/(.*)$': `${engine}/$1`,
    '^virtual:packager-runtime$': '<rootDir>/src/build/packager-runtime.js'
  }
};
