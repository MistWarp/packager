const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CopyWebpackPlugin = require('copy-webpack-plugin');
const AddBuildIDToOutputPlugin = require('./src/build/add-build-id-to-output-plugin');
const GenerateServiceWorkerPlugin = require('./src/build/generate-service-worker-plugin');
const EagerDynamicImportPlugin = require('./src/build/eager-dynamic-import-plugin');

const isProduction = process.env.NODE_ENV === 'production';
const isStandalone = !!process.env.STANDALONE;
const base = {
  mode: isProduction ? 'production' : 'development'
};
const dist = path.resolve(__dirname, 'dist');

const engine = require('./src/build/engine-path');
// Engine sources sit outside this repository, so plain node resolution would read
// scratch-gui's node_modules when it happens to have one. Ours always wins.
const engineModules = [path.resolve(__dirname, 'node_modules'), 'node_modules'];
// fake-indexeddb, an engine dependency, ships class fields, which webpack 4
// cannot parse. rotur-sdk has the same problem and its own rule below.
const engineUntranspiled = /node_modules[\\/]fake-indexeddb[\\/]/;
const engineAliases = {
  '@packager': engine,
  'virtual:packager-runtime$': path.resolve(__dirname, 'src', 'build', 'packager-runtime.js')
};
const buildId = isProduction ? require('./src/build/generate-scaffolding-build-id') : null;

const getVersion = () => {
  if (process.env.VERSION) {
    return process.env.VERSION;
  }
  if (isStandalone) {
    const now = new Date();
    const dateString = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    const packageJSON = require('./package.json');
    const version = packageJSON.version;
    return `Standalone v${version} (${dateString})`;
  }
  return null;
};
const version = getVersion();

// webpack 4's parser predates nullish coalescing, which src/packager/packager.js
// uses. Every config that pulls in src/ needs babel-loader, not just scaffolding.
// rotur-sdk, pulled in by scratch-vm, ships class fields in both its ESM and
// CommonJS builds, which webpack 4's parser cannot read. javascript/auto keeps
// .mjs out of webpack's stricter ESM mode, where the CommonJS interop the rest
// of the bundle relies on is unavailable. Matched by pattern rather than
// resolved path so a hoisted or symlinked install still gets transpiled.
const makeRoturSdkRule = () => ({
  test: /\.m?js$/,
  type: 'javascript/auto',
  loader: 'babel-loader',
  include: /[\\/]node_modules[\\/]rotur-sdk[\\/]/,
  options: {
    babelrc: false,
    configFile: false,
    presets: ['@babel/preset-env']
  }
});

const makeJavascriptRule = () => ({
  test: /\.jsx?$/,
  loader: 'babel-loader',
  include: [
    path.resolve(__dirname, 'src'),
    engine,
    engineUntranspiled,
    /node_modules[\\/]scratch-[^\\/]+[\\/]src/
  ],
  options: {
    babelrc: false,
    presets: ['@babel/preset-env']
  }
});

const makeScaffolding = ({full}) => ({
  ...base,
  devtool: isProduction ? '' : 'source-map',
  output: {
    filename: 'scaffolding/[name].js',
    path: dist
  },
  entry: full ? {
    'scaffolding-full': path.join(engine, 'scaffolding', 'export.js'),
    addons: path.join(engine, 'addons', 'index.js')
  } : {
    'scaffolding-min': path.join(engine, 'scaffolding', 'export.js')
  },
  resolve: {
    symlinks: false,
    modules: engineModules,
    alias: {
      ...engineAliases,
      'text-encoding$': path.join(engine, 'scaffolding', 'text-encoding'),
      'htmlparser2$': path.join(engine, 'scaffolding', 'htmlparser2'),
      'scratch-translate-extension-languages$': path.join(engine, 'scaffolding', 'scratch-translate-extension-languages', 'languages.json'),
      'scratch-parser$': path.join(engine, 'scaffolding', 'scratch-parser')
    }
  },
  module: {
    rules: [
      makeJavascriptRule(),
      makeRoturSdkRule(),
      {
        test: /\.(svg|png)$/i,
        use: [{
          loader: 'url-loader'
        }]
      },
      ...(full ? [{
        test: /\.mp3$/i,
        use: [{
          loader: 'url-loader',
          options: {
            esModule: false
          }
        }]
      }] : [{
        test: /\.mp3$/i,
        use: [{
          loader: path.resolve(__dirname, 'src', 'build', 'noop-loader.js')
        }]
      }]),
      {
        test: /\.css$/i,
        use: [
          {
            loader: 'style-loader',
            options: {
              // This function is stringified and run in a web environment
              insert: (styleElement) => {
                var el = document.head || document.body || document.documentElement;
                el.insertBefore(styleElement, el.firstChild);
              }
            }
          },
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: 'sc-[local]',
                exportLocalsConvention: 'camelCase',
              },
            }
          }
        ],
      }
    ]
  },
  resolveLoader: {
    // Replace worker-loader with our own modified version. Inline loaders in
    // engine sources resolve against our node_modules, like their imports.
    modules: [path.resolve(__dirname, 'src', 'build', 'inline-worker-loader'), ...engineModules],
  },
  plugins: [
    ...(buildId ? [new AddBuildIDToOutputPlugin(buildId)] : []),
    ...(process.env.BUNDLE_ANALYZER === (full ? 'scaffolding-full' : 'scaffolding-min') ? [new BundleAnalyzerPlugin()] : [])
  ]
});

const commonFrontendPlugins = () => [
  new webpack.DefinePlugin({
    'process.env.SCAFFOLDING_BUILD_ID': buildId ? JSON.stringify(buildId) : '("development-" + Math.random().toString().substring(2))',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  })
];

const makeWebsite = () => ({
  ...base,
  devtool: isStandalone ? '' : 'source-map',
  output: {
    filename: isProduction ? 'js/[name].[contenthash].js' : 'js/[name].js',
    path: dist
  },
  entry: {
    p4: './src/p4/index.js'
  },
  resolve: {
    symlinks: false,
    modules: engineModules,
    alias: {
      ...engineAliases,
      svelte: path.resolve('node_modules', 'svelte')
    },
    extensions: ['.mjs', '.js', '.svelte'],
    mainFields: ['svelte', 'browser', 'module', 'main']
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      minChunks: 2
    }
  },
  module: {
    rules: [
      makeJavascriptRule(),
      makeRoturSdkRule(),
      {
        test: /\.png|\.svg$/i,
        use: isStandalone ? {
          loader: 'url-loader'
        } : {
          loader: 'file-loader',
          options: {
            name: 'assets/[name].[contenthash].[ext]'
          }
        }
      },
      {
        test: /\.(html|svelte)$/,
        use: 'svelte-loader'
      },
    ]
  },
  plugins: [
    ...commonFrontendPlugins(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'static'
        }
      ]
    }),
    new webpack.DefinePlugin({
      'process.env.ENABLE_SERVICE_WORKER': JSON.stringify(process.env.ENABLE_SERVICE_WORKER),
      'process.env.STANDALONE': JSON.stringify(isStandalone ? true : false),
      'process.env.VERSION': JSON.stringify(version),
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './src/p4/template.ejs',
      chunks: ['p4']
    }),
    new GenerateServiceWorkerPlugin(),
    ...(isStandalone ? [new EagerDynamicImportPlugin()] : []),
    ...(process.env.BUNDLE_ANALYZER === 'p4' ? [new BundleAnalyzerPlugin()] : [])
  ],
  devServer: {
    contentBase: './dist/',
    compress: true,
    overlay: true,
    inline: false,
    host: '0.0.0.0',
    port: 8947
  },
});

const makeNode = () => ({
  ...base,
  devtool: '',
  target: 'node',
  output: {
    filename: '[name].js',
    path: dist,
    library: 'packager',
    libraryTarget: 'umd'
  },
  node: {
    __dirname: false,
  },
  entry: {
    packager: './src/packager/node/export.js'
  },
  resolve: {
    symlinks: false,
    modules: engineModules,
    alias: engineAliases
  },
  externals: {
    '@turbowarp/jszip': '@turbowarp/jszip',
    '@turbowarp/sbdl': '@turbowarp/sbdl',
    '@fiahfy/icns': '@fiahfy/icns',
    'cross-fetch': 'cross-fetch',
    'sha.js': 'sha.js',
  },
  module: {
    rules: [
      makeJavascriptRule(),
      makeRoturSdkRule(),
      {
        test: /\.png|\.svg$/i,
        use: 'file-loader'
      },
    ]
  },
  plugins: [
    ...commonFrontendPlugins(),
    ...(process.env.BUNDLE_ANALYZER === 'node' ? [new BundleAnalyzerPlugin()] : [])
  ],
});

module.exports = [
  makeScaffolding({full: true}),
  makeScaffolding({full: false}),
  ...(process.env.BUILD_MODE === 'node' ? [
    makeNode()
  ] : [
    makeWebsite()
  ])
];
