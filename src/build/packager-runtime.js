// scratch-gui's src/packager asks its host for the few things it cannot know on its
// own. In the editor a Vite plugin answers; here webpack aliases the module to this
// file. Keep the exports in step with scratch-gui/scripts/vite-packager.mjs.

const brand = require('../packager/brand');

// webpack emits the scaffolding bundles next to the app, and generate-standalone.js
// inlines them by globbing that directory.
export const runtimeUrl = (name) => `scaffolding/${name}`;

export const buildId = process.env.SCAFFOLDING_BUILD_ID;

export const development = process.env.NODE_ENV !== 'production';

// Packaged projects credit whoever packaged them, so they must say the packager
// rather than the editor.
export const appName = brand.APP_NAME;
export const website = brand.WEBSITE;
export const accentColor = brand.ACCENT_COLOR;
export const copyrightNotice = brand.COPYRIGHT_NOTICE;
