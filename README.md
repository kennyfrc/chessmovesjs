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

## About the design

Almost every choice here comes from one question: how do you make BigInt
bitboards fast in V8? A BigInt is the natural type for a 64-square board.
But V8 usually stores each BigInt as its own object on the heap, so ordinary
BigInt code allocates memory on almost every operation. The first version of
this project ran perft at about 50K nodes per second. The current one runs at
90 to 190 million. Most of that gap comes from the choices below, and several
of them cost some readability.

| Choice | Example | Why | Cost |
|---|---|---|---|
| **Bitboards live in `BigUint64Array` slots and are read back as two 32-bit halves** | `GEN[MOVES] = KNIGHT_ATTACKS[from] & GEN[TARGETS]`, then `GEN32[2 * MOVES]` holds squares 0-31 and `GEN32[2 * MOVES + 1]` holds squares 32-63. | V8 keeps BigInt math unboxed only when the result goes straight into a typed array. The 32-bit halves let `Math.clz32` find set bits without any BigInt math. A loop over the bits of a BigInt in a local variable took about 7x longer. | Hot code writes to named scratch slots instead of plain variables, so it reads a bit like assembly. |
| **BigInt expressions stay short** | A queen's moves take two steps: `GEN[MOVES] = rook & GEN[TARGETS]`, then `GEN[MOVES] = GEN[MOVES] \| (bishop & GEN[TARGETS])`. | One long chain of `\|` and `&` cost about 65 ns per call. The same work split into short steps cost 6 to 8 ns. | More lines for the same logic. |
| **Sliders use magic bitboards** | `(occupied & ROOK_MASKS[sq]) * ROOK_MAGIC_BBS[sq]`. The top bits of the product pick the attack set out of `ROOK_TABLE`. | A rook or bishop attack set is one multiply and one lookup, whatever pieces are in the way. Doing the multiply in 32-bit halves with `Math.imul` was about 1.5x slower. | 841 KB of tables, built in about 25 ms when the module loads. The magic numbers come from `scripts/find-magics.js`. |
| **Only legal moves are generated** | White king on e5, white pawn on d5, black rook on a5. Black plays c7-c5. Taking en passant (dxc6) removes both pawns from rank 5 and opens the rank to the king, so `EnPassant.isLegal` rejects it. | Perft never has to play a last-ply move just to test it. Generating every possible move and rejecting the illegal ones is simpler, but each move has to be made and unmade first. | Rare cases like the one in the example need their own code. |
| **The last ply counts moves instead of listing them** | `GEN[PUSHES] = (GEN[PAWNS] << 8n) & GEN[EMPTY_SQS]` gives every unpinned pawn's single push at once. A bit count then gives the total. | At the last ply, perft only needs the number of moves. Building the list and taking its length writes moves that nothing reads. | Two code paths (`generate` and `count`) that must always agree. The perft suite is what keeps them in step. |
| **The king's squares are checked one at a time** | A king on g1 with three free squares makes three `KingSafety.isAttacked` calls. A slider lookup only runs when one of their sliders is on an open line to the square. | The king has at most 8 squares, so testing each one is cheaper than mapping every attacked square. The full map was about 6% slower. | Castling has to reuse the king-move result for f1 or d1 to stay cheap. |

These choices depend on each other. Counting at the last ply only works
because every generated move is legal. If some moves could be illegal, you'd
have to play each one before you knew whether to count it. Counting is also
only cheap because of the 32-bit halves from the first row: a bit count on two
ints is a pair of fast lookups, while the same count on a BigInt is much
slower. If you take the first row away, most of the speed in the other rows
goes with it.

## Speed

`npm run bench` on an M1 Pro, Node 22 to 26: about 85-90M nodes/s with bulk
counting (startpos perft 5 in ~75 ms). Deeper runs reach about 145M nodes/s
(kiwipete perft 5 at ~190M), since the warm-up share is smaller. For
comparison, chess-movegen-js's BigInt bitboard generator measured 3-4M
nodes/s on the same positions and machine.
