// Times bulk-counted perft on the standard positions. Run with: npm run bench
// It times the built bundle, which is the code users get. The separate modules in src/
// run about a third slower, and that is mostly the cost of reading imported values.
import type { Engine as EngineClass } from '../src/engine.ts'

const bundle = new URL('../dist/index.mjs', import.meta.url).href
const { Engine } = await import(bundle) as { Engine: typeof EngineClass }
const positions: Array<[string, string, number, number]> = [
  ['startpos', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 5, 4865609],
  ['kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 4, 4085603],
  ['pos3', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 5, 674624],
  ['pos4', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 4, 422333],
  ['pos5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 4, 2103487]
]
let totalNodes = 0
let totalMs = 0
for (const [name, fen, depth, expected] of positions) {
  const engine = new Engine(fen)
  engine.perft(depth - 1, false) // warmup
  const t0 = process.hrtime.bigint()
  const n = engine.perft(depth, false)
  const ms = Number(process.hrtime.bigint() - t0) / 1e6
  totalNodes += n
  totalMs += ms
  console.log(name.padEnd(9), 'd' + depth, n === expected ? 'OK ' : 'BAD', String(n).padStart(9), ms.toFixed(0).padStart(6) + 'ms', (n / ms / 1000).toFixed(2) + ' Mnps')
}
console.log('total', (totalNodes / totalMs / 1000).toFixed(2), 'Mnps')
