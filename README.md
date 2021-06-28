# torchess.js (v0.2)

This is a chess engine under development which aims to be a simple chess engine that uses neural networks.

## Goals:
* Neural Network Chess Engine with Alpha Beta Search
* Written in ES6 & Built in Webpack
* Neural Network in ONNX.js format
* Create Trainer in Python (either fastai or pytorch)

## How to Use:
```
// install dependencies
yarn install

// compile
yarn dev

// run server
npx webpack serve
```

You can then play the engine at localhost:8080

### TODO:
* DONE: Random mover & UI 
* DONE: Alpha Beta with Handcrafted Eval
* Alpha Beta with Neural Network Eval

### Credits:
* chess.js by Jeff Hlywa
* cm-chessboard by Stefan Haack
