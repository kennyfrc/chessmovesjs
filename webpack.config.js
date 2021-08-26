const path = require('path');

module.exports = {
  entry: './src/engine.js',
  module: {
    rules: [
      { 
        exclude: [
          path.resolve(__dirname, 'test'),
        ]
      }
    ]
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
