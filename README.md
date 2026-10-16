# chessmoves.js (v0.1.0)

This is a chess move generator that uses native 64-bit integers (BigInts).

## Current Status

Passes perft on the standard test positions (`npm run perft`), and to full
published depth (e.g. startpos perft 6, kiwipete perft 5).

It also has a small alpha-beta search (`engine.search(depth)`) with a
material and piece-square eval. It isn't a full engine yet: there is no UCI
protocol and no time management.

## Usage

```js
import { Engine } from 'chessmovesjs' // or require('chessmovesjs')

const engine = new Engine('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
engine.perft(5) // 4865609

new Engine('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1').search(3)
// { move: 'd1d8', score: 30999, mate: 1, depth: 3, nodes: 126, pv: ['d1d8'] }
```

`score` is in centipawns for the side to move. `mate` counts moves to mate,
negative when the side to move gets mated.

## Development

The source is TypeScript with the strictest compiler settings. The file
`tsconfig.json` turns on `strict`, `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`, among others. Lint rules ban `any` and
`@ts-ignore`. With `noUncheckedIndexedAccess`, reading an array by index
gives `T | undefined`, so the hot code adds `!` there. The build erases it,
so it costs nothing at run time.

The toolchain is [Vite+](https://viteplus.dev) (`vp`). Node 22.18+, 24.11+ or
26+ runs `.ts` files as they are, so a script such as `scripts/find-magics.ts`
needs no build step.

- `npm run build`: bundle `dist/index.mjs` and `dist/index.cjs`, with type
  declarations (`vp pack`)
- `npm test`: all tests (`vp test`); `npm run perft` runs only the perft suite
- `npm run typecheck`: the type checker alone (`vp check --no-lint`)
- `npm run lint`: type errors plus the `standard` style and rules, through
  Oxlint (`lint/standard.ts`)
- `npm run check`: lint and type check in one run, as `vp check`; formatting
  is off because Oxfmt only formats Prettier style
- `npm run bench`: perft speed of the built bundle on the standard positions
- `npm run bench:search`: search speed and node counts of the built bundle at
  depth 7; pass another depth with `npm run bench:search -- 6`

## About the design

Almost every choice here comes from one question: how do you make BigInt
bitboards fast in V8? A BigInt is the natural type for a 64-square board.
But V8 usually stores each BigInt as its own object on the heap, so ordinary
BigInt code allocates memory on almost every operation. The first version of
this project ran perft at about 50K nodes per second. The current one runs at
100 to 230 million. Most of that gap comes from the choices below, and several
of them cost some readability.

| Choice | Example | Why | Cost |
|---|---|---|---|
| **Bitboards live in `BigUint64Array` slots and are read back as two 32-bit halves** | `GEN[MOVES] = KNIGHT_ATTACKS[from] & GEN[TARGETS]`, then `GEN32[2 * MOVES]` holds squares 0-31 and `GEN32[2 * MOVES + 1]` holds squares 32-63. | V8 keeps BigInt math unboxed only when the result goes straight into a typed array. The 32-bit halves let `Math.clz32` find set bits without any BigInt math. A loop over the bits of a BigInt in a local variable took about 7x longer. | Hot code writes to named scratch slots instead of plain variables, so it reads a bit like assembly. |
| **BigInts never cross a function call** | `Ray.setRookAttacks(GEN, MOVES, from, bbs, BoardSlot.OCCUPIED)` writes the rook's attacks into a slot instead of returning them. | A BigInt passed to or returned from a call that V8 doesn't inline becomes a heap object: about 330 ns and 80 bytes per call, against about 9 ns through a slot. Right shifts have a similar trap. `(x >> 8n) & mask` on a value read straight from a typed array takes about 3 ns, but `(x & mask) >> 9n` allocates and takes about 300 ns. | Lookups take slot numbers instead of arguments and return values, and pawn code has to shift before it masks. |
| **Sliders use magic bitboards** | `(occupied & ROOK_MASKS[sq]) * ROOK_MAGIC_BBS[sq]`. The top bits of the product pick the attack set out of `ROOK_TABLE`. | A rook or bishop attack set is one multiply and one lookup, whatever pieces are in the way. Doing the multiply in 32-bit halves with `Math.imul` was about 1.5x slower. | 841 KB of tables, built in about 25 ms when the module loads. The magic numbers come from `scripts/find-magics.ts`. |
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

## About the search

`engine.search(depth)` is an alpha-beta search. At the end of each line it
searches captures until the position is quiet, and a hash table keeps earlier
results. The eval is only material plus piece-square tables. The search keeps
that score up to date move by move, so evaluating a position takes two array
reads.

Alpha-beta gives the same score whatever order it tries the moves in. The
order decides how soon it meets a move that refutes a position, and so how
many positions it has to search and evaluate. That's why the ideas from
Smirnov's books went into the move order and not into the eval. Below, alpha
is the score the side to move is already sure of.

| Choice | Example | Why | Cost |
|---|---|---|---|
| **Moves come in stages: good captures, then quiet moves, then losing captures** | In the depth-7 bench, about 60% of the nodes at depth 1 (the last ply before the capture-only search) stop at a capture that refutes them. They never generate a quiet move. | Smirnov looks at forcing moves first (*Calculation*, p50). A refutation is usually a capture, so the quiet moves are often not needed. | Three generators (`generateCaptures`, `generateQuiets`, `generateQuietChecks`) that must match `generate`. Tests compare them on random games. |
| **A capture that loses material waits until after the quiet moves** | Qd1xd5 loses the queen for a pawn when a pawn on c6 defends d5. `Exchange.isLosing` plays out the captures on d5 to see that. | Smirnov counts a capture as forcing only when the opponent has to answer it (*Calculation*, p52-53). After a capture that loses material, the opponent just wins material. Moving these captures back cut the nodes by 18%. | A static exchange evaluation. It only runs when the capturing piece is worth more than the piece it takes. |
| **Quiet moves are sorted by how much more active the piece gets** | Ng1-f3 goes from 3 controlled squares to 8 and gains 40 centipawns. Ng1-h3 reaches 4 squares and gains 8, so Nf3 is tried first. | This is Smirnov's "maximum activity" (*Positional Understanding*, p13-22). The tables count the squares each piece controls, so one table serves both the eval and the move order. It cut the nodes by 3%. | Two table reads per quiet move. It mostly breaks ties: history scores, which learn from earlier cutoffs, soon outweigh it. |
| **Pawn and knight moves that attack a bigger piece come first among the quiet moves** | After 1.e4 Nf6, the push 2.e5 attacks the knight. | Attacking moves force an answer (*Calculation*, p31-34). This cut the nodes by 3.3% at depth 7. | One bitboard per node, then one bit test per quiet move. Doing the bitboard work for each move instead cut about as many nodes but cost 15% more instructions. |
| **At depth 1, a node that can't reach alpha only tries checks** | If the score plus 50 centipawns is still below alpha, only `generateQuietChecks` runs. | After a quiet move without check, the other side takes the static score or does better with a capture. No quiet move adds more than 50 (a pawn push to the 7th rank gains the most), so only checks can still reach alpha. This removed about 15% of the instructions. | `MAX_QUIET_GAIN` must stay a true bound if the tables change. It's computed from the tables when the module loads, and a test checks it on random games. |
| **The eval is updated before each move is made** | `Evaluation.update` writes the score after the move into a stack with one entry per ply. | The search knows a move's static score before playing it. At depth 1 and in the capture search, a move that can't reach alpha and gives no check is skipped without `makeMove`. That cut the nodes by 65% but the time by only about 15%, since most of the skipped nodes would only have returned their static score. | The search must call `update` before every `makeMove`. |

Smirnov's other rules didn't pay off here. The order above already tries the
refuting move first at 98.4% of the nodes that cut off. A perfect order would
save at most 19% of the nodes, and each rule below adds work at every node.
None of them changed the moves or scores, so speed alone decided. The numbers
are for depth 7. Brackets give depth 8 for the rules tested there too.

| Rule | Smirnov | Nodes | Cost |
|---|---|---|---|
| A piece that a cheaper piece attacks moves first, and no piece moves into such an attack | The blunder check (*Calculation*, p29, p109) | −0.2% (−0.4%) | +3.0% (+3.0%) instructions |
| Bishop moves that attack a rook or queen, and rook moves that attack a queen | Attacking moves force an answer (*Calculation*, p31-34) | −0.1% (+2.0%) | +0.9% (+2.9%) instructions |
| Moves that attack an undefended piece or pawn | Undefended pieces are weak (*Calculation*, p120) | +3.2% | +5.9% instructions |
| A knight move to a weak square on their half | *Positional Understanding*, p64 | −0.1% (+0.3%) | +1.4% (+1.9%) instructions |
| A rook move to a file without our pawns | *Positional Understanding*, p157 | +1.8% | +3.0% instructions |
| The quiet move that last refuted the same enemy move (a countermove), just below the killers | The opponent's strongest reply first (*Calculation*, p56-58) | +1.6% | +2.2% instructions |
| Attacking moves before the killers | Forcing moves first (*Calculation*, p50) | +12.6% | +10.7% instructions |
| Even trades after the quiet moves | Keep the tension unless a capture gains something (*Calculation*, p36-38) | +251% | +222% instructions |
| Losing captures last in the capture search too | A capture is forcing only when the opponent has to answer it (*Calculation*, p52-53) | −2.7% (−1.8%) | +0.2% (+1.0%) instructions |
| A bonus for quiet checks | Checks are forcing (*Calculation*, p50) | +3.8% | +21% time |
| The least active piece first | *Positional Understanding*, p19-22 | −1.4% | +8% instructions |
| The most forward moves first | Maximum activity (*Calculation*, p45-46) | −1.1% | +2% time |

Two results explain most of the table. Killers beat every forcing rule. A
quiet move that refuted a sibling position is a better guess than a move that
only threatens something. And most even trades in a search are recaptures,
which are often the only good move.

The last row was there from the start. That first version ordered moves by
the hash move, captures by value, killers and history alone. Against it, the
other five rows and a faster pawn-capture generator cut the instructions by
38% at depth 7 on the 29 positions in `npm run bench:search`. Both versions
return the same moves and scores.

## Speed

`npm run bench` on an M1 Pro, Node 22 to 26: about 105-135M nodes/s with bulk
counting (startpos perft 5 in 45-65 ms). Deeper runs reach about 180-195M
nodes/s (kiwipete perft 5 at 215-230M), since the warm-up share is smaller. For
comparison, chess-movegen-js's BigInt bitboard generator measured 3-4M
nodes/s on the same positions and machine.

`npm run bench:search` runs at about 2.5M nodes/s: 15.3M nodes at depth 7 in
about 6 s. Those nodes include the capture-only search.

Both benchmarks time the built bundle, which is the code the package ships.
The separate modules in `src/` run about a third slower when Node loads them
directly. In a test, copying the imported values into local constants won back
more than half of that loss, so reading imports is most of the cost. The
bundler removes it by putting every module in one scope.
