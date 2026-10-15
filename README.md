# chessmoves.js (v0.1.0)

This is a chess move generator that uses native 64-bit integers (BigInts).

## Current Status

Passes perft on the standard test positions (`npm run perft`), and to full
published depth (e.g. startpos perft 6, kiwipete perft 5).

## Usage

```js
import { Engine } from 'chessmovesjs' // or require('chessmovesjs')

const engine = new Engine('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
engine.perft(5) // 4865609
```

## Development

The toolchain is [Vite+](https://viteplus.dev) (`vp`). Node 22.18+, 24.11+ or 26+.

- `npm run build`: bundle `dist/index.mjs` and `dist/index.cjs` (`vp pack`)
- `npm test`: all tests (`vp test`); `npm run perft` runs only the perft suite
- `npm run lint`: `standard` style and rules through Oxlint (`lint/standard.mjs`)
- `npm run check`: lint, as `vp check`; formatting is off because Oxfmt
  only formats Prettier style
- `npm run bench`: perft speed on the standard positions

## How it works

- Sliders use magic bitboards. `scripts/find-magics.js` generates `src/magic.js`.
- Moves are generated legal: check evasion targets, pins and en passant are
  resolved before a move is written, so perft never has to make the leaf moves.
- Board state lives in typed arrays (`BigUint64Array` for bitboards, an
  `Int8Array` mailbox), and moves are ints, so perft does not allocate.
- V8 only keeps BigInt math fast when each result goes straight into a
  `BigUint64Array` and expressions stay short. A long chain of `|` and `&` on
  BigInts was several times slower than the same work split into steps.

## Speed

`npm run bench` on an M1 Pro, Node 22 to 26: about 55-90M nodes/s with bulk
counting (startpos perft 5 in ~85 ms). For comparison, chess-movegen-js's
BigInt bitboard generator measured 3-4M nodes/s on the same positions and
machine.
