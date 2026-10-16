// Times the search on the perft positions and the Bratko-Kopec test.
// Run with: npm run bench:search -- [depth]
// It times the built bundle, like scripts/bench.ts.
import type { Engine as EngineClass } from '../src/engine.ts'

const bundle = new URL('../dist/index.mjs', import.meta.url).href
const { Engine } = await import(bundle) as { Engine: typeof EngineClass }
const positions: Array<[string, string]> = [
  ['startpos', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'],
  ['kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'],
  ['pos3', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'],
  ['pos4', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1'],
  ['pos5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8'],
  ['BK.01', '1k1r4/pp1b1R2/3q2pp/4p3/2B5/4Q3/PPP2B2/2K5 b - - 0 1'],
  ['BK.02', '3r1k2/4npp1/1ppr3p/p6P/P2PPPP1/1NR5/5K2/2R5 w - - 0 1'],
  ['BK.03', '2q1rr1k/3bbnnp/p2p1pp1/2pPp3/PpP1P1P1/1P2BNNP/2BQ1PRK/7R b - - 0 1'],
  ['BK.04', 'rnbqkb1r/p3pppp/1p6/2ppP3/3N4/2P5/PPP1QPPP/R1B1KB1R w KQkq - 0 1'],
  ['BK.05', 'r1b2rk1/2q1b1pp/p2ppn2/1p6/3QP3/1BN1B3/PPP3PP/R4RK1 w - - 0 1'],
  ['BK.06', '2r3k1/pppR1pp1/4p3/4P1P1/5P2/1P4K1/P1P5/8 w - - 0 1'],
  ['BK.07', '1nk1r1r1/pp2n1pp/4p3/q2pPp1N/b1pP1P2/B1P2R2/2P1B1PP/R2Q2K1 w - - 0 1'],
  ['BK.08', '4b3/p3kp2/6p1/3pP2p/2pP1P2/4K1P1/P3N2P/8 w - - 0 1'],
  ['BK.09', '2kr1bnr/pbpq4/2n1pp2/3p3p/3P1P1B/2N2N1Q/PPP3PP/2KR1B1R w - - 0 1'],
  ['BK.10', '3rr1k1/pp3pp1/1qn2np1/8/3p4/PP1R1P2/2P1NQPP/R1B3K1 b - - 0 1'],
  ['BK.11', '2r1nrk1/p2q1ppp/bp1p4/n1pPp3/P1P1P3/2PBB1N1/4QPPP/R4RK1 w - - 0 1'],
  ['BK.12', 'r3r1k1/ppqb1ppp/8/4p1NQ/8/2P5/PP3PPP/R3R1K1 b - - 0 1'],
  ['BK.13', 'r2q1rk1/4bppp/p2p4/2pP4/3pP3/3Q4/PP1B1PPP/R3R1K1 w - - 0 1'],
  ['BK.14', 'rnb2r1k/pp2p2p/2pp2p1/q2P1p2/8/1Pb2NP1/PB2PPBP/R2Q1RK1 w - - 0 1'],
  ['BK.15', '2r3k1/1p2q1pp/2b1pr2/p1pp4/6Q1/1P1PP1R1/P1PN2PP/5RK1 w - - 0 1'],
  ['BK.16', 'r1bqkb1r/4npp1/p1p4p/1p1pP1B1/8/1B6/PPPN1PPP/R2Q1RK1 w kq - 0 1'],
  ['BK.17', 'r2q1rk1/1ppnbppp/p2p1nb1/3Pp3/2P1P1P1/2N2N1P/PPB1QP2/R1B2RK1 b - - 0 1'],
  ['BK.18', 'r1bq1rk1/pp2ppbp/2np2p1/2n5/P3PP2/N1P2N2/1PB3PP/R1B1QRK1 b - - 0 1'],
  ['BK.19', '3rr3/2pq2pk/p2p1pnp/8/2QBPP2/1P6/P5PP/4RRK1 b - - 0 1'],
  ['BK.20', 'r4k2/pb2bp1r/1p1qp2p/3pNp2/3P1P2/2N3P1/PPP1Q2P/2KRR3 w - - 0 1'],
  ['BK.21', '3rn2k/ppb2rpp/2ppqp2/5N2/2P1P3/1P5Q/PB3PPP/3RR1K1 w - - 0 1'],
  ['BK.22', '2r2rk1/1bqnbpp1/1p1ppn1p/pP6/N1P1P3/P2B1N1P/1B2QPP1/R2R2K1 b - - 0 1'],
  ['BK.23', 'r1bqk2r/pp2bppp/2p5/3pP3/P2Q1P2/2N1B3/1PP3PP/R4RK1 b kq - 0 1'],
  ['BK.24', 'r2qnrnk/p2b2b1/1p1p2pp/2pPpp2/1PP1P3/PRNBB3/3QNPPP/5RK1 w - - 0 1']
]
const depth = Number(process.argv[2] || 7)
for (const [, fen] of positions.slice(0, 8)) { new Engine(fen).search(Math.max(depth - 2, 3)) } // warmup
let totalNodes = 0
let totalMs = 0
for (const [name, fen] of positions) {
  const engine = new Engine(fen)
  const t0 = process.hrtime.bigint()
  const result = engine.search(depth)
  const ms = Number(process.hrtime.bigint() - t0) / 1e6
  totalNodes += result.nodes
  totalMs += ms
  console.log(name.padEnd(9), String(result.move).padEnd(6), String(result.score).padStart(6), String(result.nodes).padStart(9), ms.toFixed(0).padStart(6) + 'ms')
}
console.log('total d' + depth, totalNodes, 'nodes', totalMs.toFixed(0) + 'ms', (totalNodes / totalMs).toFixed(0), 'knps')
