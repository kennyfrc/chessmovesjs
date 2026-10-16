import assert from 'node:assert'
import { Engine } from '../src/engine.ts'
import { Search, MATE } from '../src/search.ts'
import { MoveList, MoveKind, Checks } from '../src/move.ts'
import { Exchange } from '../src/exchange.ts'
import { Evaluation, VALUES, MAX_QUIET_GAIN } from '../src/eval.ts'
import { describe, it } from 'vite-plus/test'

const FENS = [
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
  '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
  'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
  'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8'
]

/**
 * Plays seeded random games from fen, calling visit(engine, code) before
 * each move. Castling, en passant and promotions are picked half the time
 * they come up, so every move kind gets covered.
 */
function playRandomGames (fen: string, games: number, plies: number,
  visit: (engine: Engine, code: number, ply: number) => void): void {
  let seed = 12345
  const random = (n: number): number => {
    seed = (Math.imul(seed, 1103515245) + 12345) | 0
    return (seed >>> 8) % n
  }
  const moves = new Int32Array(256)
  for (let game = 0; game < games; game++) {
    const engine = new Engine(fen)
    for (let ply = 0; ply < plies; ply++) {
      const n = MoveList.generate(engine.board, moves, 0)
      if (n === 0) { break }
      let code = moves[random(n)]!
      for (let i = 0; i < n; i++) {
        if ((moves[i]! >>> 12) >= MoveKind.CASTLE && random(2) === 0) {
          code = moves[i]!
          break
        }
      }
      visit(engine, code, ply)
      engine.makeMove(code)
    }
  }
}

// the search's draw rules, written out again with BigInt keys
function isDrawn (engine: Engine): boolean {
  const board = engine.board
  if (board.halfMoveClock >= 100) { return true }
  const m = engine.movesMade
  for (let i = m - 4; i >= Math.max(m - board.halfMoveClock, 0); i -= 2) {
    if (engine.keyHistory[i] === engine.keyHistory[m]) { return true }
  }
  return false
}

// plain minimax with the search's rules: check extension, quiescence, draws
function minimax (engine: Engine, depth: number, ply: number): number {
  if (depth <= 0) { return quiesceMinimax(engine, ply) }
  if (ply > 0 && isDrawn(engine)) { return 0 }
  const inCheck = MoveList.isInCheck(engine.board)
  const moves = new Int32Array(256)
  const n = MoveList.generate(engine.board, moves, 0)
  if (n === 0) { return inCheck ? ply - MATE : 0 }
  let best = -Infinity
  for (let i = 0; i < n; i++) {
    engine.makeMove(moves[i]!)
    best = Math.max(best, -minimax(engine, inCheck ? depth : depth - 1, ply + 1))
    engine.unmakeMove()
  }
  return best
}

/**
 * Every capture sequence, searched exactly: alpha-beta with a full window
 * returns the minimax score. Without the cutoffs a busy position like
 * kiwipete takes millions of nodes per leaf.
 */
function quiesceMinimax (engine: Engine, ply: number, alpha = -Infinity, beta = Infinity): number {
  const board = engine.board
  const moves = new Int32Array(256)
  let best = -Infinity
  let n: number
  if (MoveList.isInCheck(board)) {
    n = MoveList.generate(board, moves, 0)
    if (n === 0) { return ply - MATE }
  } else {
    best = Evaluation.evaluate(board)
    if (best >= beta) { return best }
    alpha = Math.max(alpha, best)
    n = MoveList.generateCaptures(board, moves, 0)
  }
  const victim = (code: number): number => board.squares[(code >> 6) & 63] === -1 ? 0 : VALUES[board.squares[(code >> 6) & 63]! % 6]!
  const ordered = Array.from(moves.subarray(0, n)).sort((a, b) => victim(b) - victim(a))
  for (const code of ordered) {
    engine.makeMove(code)
    best = Math.max(best, -quiesceMinimax(engine, ply + 1, -beta, -alpha))
    engine.unmakeMove()
    alpha = Math.max(alpha, best)
    if (alpha >= beta) { break }
  }
  return best
}

describe('Evaluation', function () {
  it('scores the start position as equal', function () {
    assert.equal(Evaluation.evaluate(new Engine(FENS[0]).board), 0)
  })

  it('updates move by move to the same score as a full count', function () {
    const stack = new Int32Array(2 * 200)
    let checked = 0
    FENS.forEach((fen) => {
      playRandomGames(fen, 40, 100, (engine, code, ply) => {
        if (ply === 0) {
          stack[0] = Evaluation.packedScore(engine.board)
          stack[1] = Evaluation.phase(engine.board)
        }
        Evaluation.update(engine.board, code, stack, ply)
        engine.makeMove(code)
        assert.equal(stack[2 * ply + 2], Evaluation.packedScore(engine.board))
        assert.equal(stack[2 * ply + 3], Evaluation.phase(engine.board))
        engine.unmakeMove()
        checked++
      })
    })
    assert.ok(checked > 10000)
  })

  // the search skips quiet moves on this bound, so it must hold after rounding too
  it('never gains more than MAX_QUIET_GAIN with a quiet move', function () {
    const moves = new Int32Array(256)
    let most = -Infinity
    FENS.forEach((fen) => {
      playRandomGames(fen, 20, 80, (engine) => {
        const board = engine.board
        const before = Evaluation.evaluate(board)
        const n = MoveList.generateQuiets(board, moves, 0)
        for (let i = 0; i < n; i++) {
          engine.makeMove(moves[i]!)
          most = Math.max(most, -Evaluation.evaluate(engine.board) - before)
          engine.unmakeMove()
        }
      })
    })
    assert.ok(most <= MAX_QUIET_GAIN, String(most))
    assert.ok(most > MAX_QUIET_GAIN / 2, String(most))
  })
})

describe('MoveList', function () {
  const sorted = (codes: Int32Array, from: number, to: number): number[] => Array.from(codes.subarray(from, to)).sort((a, b) => a - b)

  it('generates the same captures and promotions as generate()', function () {
    const all = new Int32Array(256)
    const captures = new Int32Array(256)
    FENS.forEach((fen) => {
      playRandomGames(fen, 20, 80, (engine) => {
        const board = engine.board
        const n = MoveList.generate(board, all, 0)
        const expected = Array.from(all.subarray(0, n)).filter((code) => {
          return board.squares[(code >> 6) & 63] !== -1 || (code >>> 12) >= MoveKind.EN_PASSANT
        }).sort((a, b) => a - b)
        const m = MoveList.generateCaptures(board, captures, 0)
        assert.deepEqual(sorted(captures, 0, m), expected)
        assert.equal(MoveList.isInCheck(board), board.sideInCheck)
      })
    })
  })

  it('generates the other moves with generateQuiets()', function () {
    const all = new Int32Array(256)
    const split = new Int32Array(256)
    FENS.forEach((fen) => {
      playRandomGames(fen, 20, 80, (engine) => {
        const n = MoveList.generate(engine.board, all, 0)
        const m = MoveList.generateQuiets(engine.board, split, MoveList.generateCaptures(engine.board, split, 0))
        assert.deepEqual(sorted(split, 0, m), sorted(all, 0, n))
      })
    })
  })

  it('writes every quiet move that gives check with generateQuietChecks()', function () {
    const all = new Int32Array(256)
    const written = new Int32Array(256)
    const squares = new Int32Array(10)
    // the rook gives check after castling; random games almost never find one
    const castleChecks = ['5k2/8/8/8/8/8/8/4K2R w K - 0 1', 'r3k3/8/8/8/8/8/8/3K4 b q - 0 1']
    let checks = 0
    FENS.concat(castleChecks).forEach((fen) => {
      playRandomGames(fen, 20, 80, (engine) => {
        const board = engine.board
        const n = MoveList.generate(board, all, 0)
        const quiets = Array.from(all.subarray(0, n)).filter((code) => {
          return board.squares[(code >> 6) & 63] === -1 && (code >>> 12) < MoveKind.EN_PASSANT
        })
        const m = MoveList.generateQuietChecks(board, written, 0, squares, 0)
        const candidates = Array.from(written.subarray(0, m))
        candidates.forEach((code) => assert.ok(quiets.includes(code)))
        quiets.forEach((code) => {
          engine.makeMove(code)
          const check = MoveList.isInCheck(engine.board)
          engine.unmakeMove()
          if (check) {
            assert.ok(candidates.includes(code), MoveList.uciFor(code))
            checks++
          }
        })
      })
    })
    assert.ok(checks > 100)
  })

  it('knows which moves give check', function () {
    const squares = new Int32Array(10)
    let checks = 0
    FENS.forEach((fen) => {
      playRandomGames(fen, 20, 80, (engine, code) => {
        Checks.setSquares(engine.board, squares, 0)
        const says = Checks.givesCheck(engine.board, squares, 0, code)
        engine.makeMove(code)
        const check = MoveList.isInCheck(engine.board)
        engine.unmakeMove()
        // castling, en passant and promotions may say yes without a check
        if (says !== check) { assert.ok(says && (code >>> 12) >= MoveKind.CASTLE) }
        if (check) { checks++ }
      })
    })
    assert.ok(checks > 100)
  })
})

describe('Exchange', function () {
  const capture = (fen: string, uci: string): boolean => {
    const engine = new Engine(fen)
    const move = engine.board.legalMoves().find((m) => MoveList.uciFor(m.code) === uci)
    return Exchange.isLosing(engine.board, move!.code)
  }

  it('knows a queen that takes a defended pawn loses material', function () {
    assert.equal(capture('4k3/8/2p5/3p4/8/8/8/3QK3 w - - 0 1', 'd1d5'), true)
  })

  it('never calls taking a bigger piece with a pawn losing', function () {
    assert.equal(capture('4k3/8/4p3/3n4/4P3/8/8/4K3 w - - 0 1', 'e4d5'), false)
  })

  it('treats a bishop for a knight as an even trade', function () {
    assert.equal(capture('4k3/8/4p3/3n4/8/1B6/8/4K3 w - - 0 1', 'b3d5'), false)
  })

  it('counts the rook behind a rook', function () {
    assert.equal(capture('3r2k1/8/8/3p4/8/8/3R4/3R2K1 w - - 0 1', 'd2d5'), false)
    assert.equal(capture('3r2k1/8/8/3p4/8/8/3R4/6K1 w - - 0 1', 'd2d5'), true)
  })

  it('lets the king take back only on a safe square', function () {
    assert.equal(capture('8/8/4k3/3p4/8/1B6/8/3QK3 w - - 0 1', 'd1d5'), false)
    assert.equal(capture('8/8/4k3/3p4/8/8/8/3QK3 w - - 0 1', 'd1d5'), true)
  })
})

describe('Engine', function () {
  // what unmake must restore: the bitboards with the position key, and the state kept on the stacks
  const state = (engine: Engine): [bigint[], number, number, number] => [
    Array.from(engine.board.bitboards), engine.board.epSq, engine.board.castleRights, engine.board.halfMoveClock
  ]

  // the stacks start at 256 moves, so a longer game has to grow them without losing a move
  it('unmakes every move of a game longer than its stacks', function () {
    const engine = new Engine(FENS[2])
    const moves = new Int32Array(256)
    const before: Array<[bigint[], number, number, number]> = []
    for (let ply = 0; ply < 600; ply++) {
      const n = MoveList.generate(engine.board, moves, 0)
      if (n === 0) { break }
      before.push(state(engine))
      engine.makeMove(moves[(ply * 7 + 3) % n]!)
    }
    assert.ok(engine.movesMade > 512, String(engine.movesMade)) // the stacks grew twice
    assert.equal(engine.keyHistory32.buffer, engine.keyHistory.buffer)
    while (engine.movesMade > 0) {
      engine.unmakeMove()
      assert.deepEqual(state(engine), before[engine.movesMade])
    }
  })
})

describe('Search', function () {
  it('finds a back-rank mate in one', function () {
    const result = new Engine('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1').search(3)
    assert.equal(result.move, 'd1d8')
    assert.equal(result.mate, 1)
  })

  it('finds mate in two', function () {
    const result = new Engine('7k/8/5K2/8/8/8/8/6R1 w - - 0 1').search(4)
    assert.equal(result.move, 'f6f7')
    assert.equal(result.mate, 2)
  })

  it('mates instead of stalemating', function () {
    const result = new Engine('7k/8/6K1/8/8/8/8/5Q2 w - - 0 1').search(3)
    assert.equal(result.move, 'f1f8')
  })

  it('scores stalemate as a draw', function () {
    const result = new Engine('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').search(3)
    assert.equal(result.move, null)
    assert.equal(result.score, 0)
  })

  it('wins a hanging queen', function () {
    const result = new Engine('4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1').search(4)
    assert.equal(result.move, 'd1d5')
    assert.ok(result.score > 800)
  })

  it('treats a repeated position as a draw', function () {
    const engine = new Engine(FENS[0])
    const search = new Search(engine)
    const play = (uci: string): void => engine.make(engine.board.legalMoves().find((move) => MoveList.uciFor(move.code) === uci)!)
    play('g1f3')
    play('g8f6')
    assert.equal(search.isDraw(), false)
    play('f3g1')
    play('f6g8')
    assert.equal(search.isDraw(), true)
  })

  it('scores the same as plain minimax when the hash table is off', function () {
    const cases: Array<[string, number]> = [[FENS[0]!, 3], [FENS[2]!, 4], [FENS[4]!, 2]]
    cases.forEach(([fen, depth]) => {
      const engine = new Engine(fen)
      const search = new Search(engine, 1)
      search.table.probe = () => -1 // move order alone must not change the score
      assert.equal(search.run(depth).score, minimax(engine, depth, 0), fen)
    })
  })

  it('leaves the board as it found it', function () {
    const engine = new Engine(FENS[1])
    const before = Array.from(engine.board.bitboards)
    engine.search(4)
    assert.deepEqual(Array.from(engine.board.bitboards), before)
    assert.equal(engine.movesMade, 0)
  })
})
