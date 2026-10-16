import { MoveList, MoveKind, Checks } from './move.ts'
import { Exchange } from './exchange.ts'
import { Evaluation, VALUES, PST, MAX_QUIET_GAIN } from './eval.ts'
import { KNIGHT_ATTACKS } from './attack.ts'
import { Piece, BoardSlot } from './pieces.ts'
import type { Board } from './board.ts'
import type { Engine } from './engine.ts'

// addAttackBonus: where a pawn or a knight of ours would attack a bigger piece
const HITS = new BigUint64Array(3)
const HITS32 = new Int32Array(HITS.buffer)
const PAWN_HITS = 0
const KNIGHT_HITS = 1
const TARGETS = 2
const ATTACK_BONUS = 1 << 22 // below the killers, above any history score

const EMPTY = -1
const MAX_PLY = 128
const MAX_MOVES = 256 // per position; the most any legal position has is 218
const INFINITY = 32000
const MATE = 31000 // mate in n plies scores MATE - n
const MATE_BOUND = MATE - MAX_PLY

// what a stored score says about the true score
const Bound = { NONE: 0, UPPER: 1, LOWER: 2, EXACT: 3 }

// move order: hash move, captures (most valuable victim first), killers, then quiets by history
const HASH_MOVE = 1 << 30
const CAPTURE = 1 << 28
const KILLER = 1 << 27
const HISTORY_LIMIT = 1 << 20

class TranspositionTable {
  shift: number
  entries: Int32Array

  constructor (bits: number) {
    this.shift = 32 - bits
    // 4 ints per entry: check, move, score, depth * 4 + bound
    this.entries = new Int32Array(4 << bits)
  }

  /**
   * The index comes from the key's high half. The board's keys come from an
   * LCG with a power-of-two modulus (see prng.ts), which leaves their low
   * bits nearly constant, so the low half only serves as the check.
   */
  indexFor (hi: number): number {
    return (Math.imul(hi, 0x9E3779B1) >>> this.shift) << 2
  }

  // the entry's offset for this key, or -1
  probe (lo: number, hi: number): number {
    const e = this.indexFor(hi)
    return this.entries[e] === lo && (this.entries[e + 3]! & 3) !== Bound.NONE ? e : -1
  }

  store (lo: number, hi: number, move: number, score: number, depth: number, bound: number): void {
    const e = this.indexFor(hi)
    const entries = this.entries
    entries[e] = lo
    entries[e + 1] = move
    entries[e + 2] = score
    entries[e + 3] = depth * 4 + bound
  }

  move (e: number): number { return this.entries[e + 1]! }
  score (e: number): number { return this.entries[e + 2]! }
  depth (e: number): number { return this.entries[e + 3]! >> 2 }
  bound (e: number): number { return this.entries[e + 3]! & 3 }

  clear (): void {
    this.entries.fill(0)
  }
}

class MoveScores {
  // most valuable victim first, then least valuable attacker
  static captures (): Int32Array {
    const scores = new Int32Array(12 * 12)
    for (let victim = 0; victim < 12; victim++) {
      for (let attacker = 0; attacker < 12; attacker++) {
        scores[victim * 12 + attacker] = CAPTURE + VALUES[victim % 6]! * 16 - VALUES[attacker % 6]! / 10
      }
    }
    return scores
  }
}

const CAPTURE_SCORES = MoveScores.captures()

/**
 * Fixed-depth alpha-beta search with iterative deepening, principal
 * variation search and a quiescence search over captures. Each node's
 * moves live in one shared buffer, right after its parent's, and the
 * score after each move comes from Evaluation.update, so a search
 * allocates nothing.
 */
interface SearchResult {
  move: string | null
  score: number
  mate: number | null
  depth: number
  nodes: number
  pv: string[]
}

class Search {
  engine: Engine
  board: Board
  table: TranspositionTable
  keys32: Int32Array
  sideKeys32: Int32Array
  epKeys32: Int32Array
  key: Int32Array
  moves: Int32Array
  moveScores: Int32Array
  evalStack: Int32Array
  checkSquares: Int32Array
  killers: Int32Array
  history: Int32Array
  pvTable: Int32Array
  pvLengths: Int32Array
  nodes: number

  constructor (engine: Engine, hashBits = 20) {
    const board = engine.board
    this.engine = engine
    this.board = board
    this.table = new TranspositionTable(hashBits)
    // the position key as two ints, plus the keys the search mixes into it
    this.keys32 = new Int32Array(board.bitboards.buffer)
    this.sideKeys32 = new Int32Array(board.sideKey.buffer)
    this.epKeys32 = new Int32Array(board.enPassantKeys.buffer)
    this.key = new Int32Array(2)
    this.moves = new Int32Array(MAX_MOVES * MAX_PLY)
    this.moveScores = new Int32Array(MAX_MOVES * MAX_PLY)
    this.evalStack = new Int32Array(2 * (MAX_PLY + 1))
    this.checkSquares = new Int32Array(10 * MAX_PLY) // see Checks.setSquares
    this.killers = new Int32Array(2 * MAX_PLY)
    this.history = new Int32Array(12 * 64)
    this.pvTable = new Int32Array(MAX_PLY * MAX_PLY)
    this.pvLengths = new Int32Array(MAX_PLY + 1)
    this.nodes = 0
  }

  run (depth: number): SearchResult {
    const board = this.board
    this.nodes = 0
    this.evalStack[0] = Evaluation.packedScore(board)
    this.evalStack[1] = Evaluation.phase(board)
    this.killers.fill(0)
    this.history.fill(0)
    let score = 0
    for (let d = 1; d <= depth; d++) {
      score = this.alphaBeta(d, 0, -INFINITY, INFINITY, 0)
    }
    const pv = Array.from(this.pvTable.subarray(0, this.pvLengths[0]), (code) => MoveList.uciFor(code))
    return {
      move: pv.length > 0 ? pv[0]! : null,
      score: score,
      mate: this.mateIn(score),
      depth: depth,
      nodes: this.nodes,
      pv: pv
    }
  }

  // moves to mate, negative when the side to move gets mated; null without a mate
  mateIn (score: number): number | null {
    if (score > MATE_BOUND) { return Math.ceil((MATE - score) / 2) }
    if (score < -MATE_BOUND) { return 0 - Math.ceil((MATE + score) / 2) }
    return null
  }

  /**
   * Returns the score of the position for the side to move, searched depth
   * plies deep. Fail-soft: a score <= alpha or >= beta is a bound. This
   * node's moves go into moves[start...].
   */
  alphaBeta (depth: number, ply: number, alpha: number, beta: number, start: number): number {
    if (depth <= 0) { return this.quiesce(ply, alpha, beta, start) }
    const board = this.board
    this.nodes++
    this.pvLengths[ply] = 0
    if (ply > 0 && this.isDraw()) { return 0 }
    if (ply >= MAX_PLY - 1) { return this.evaluate(ply) }
    const inCheck = MoveList.isInCheck(board)
    if (inCheck) { depth++ } // look one ply further at every check

    this.setKey()
    const lo = this.key[0]!
    const hi = this.key[1]!
    const table = this.table
    const entry = table.probe(lo, hi)
    let hashMove = 0
    if (entry >= 0) {
      hashMove = table.move(entry)
      // a PV node keeps searching, so the principal variation stays whole
      if (beta - alpha === 1 && table.depth(entry) >= depth) {
        const score = this.scoreFromTable(table.score(entry), ply)
        const bound = table.bound(entry)
        if (bound === Bound.EXACT || (bound === Bound.LOWER ? score >= beta : score <= alpha)) { return score }
      }
    }

    /**
     * Moves come in three stages, so a refutation found early saves
     * generating the rest: captures that keep material, then quiet moves,
     * then losing captures and underpromotions (Smirnov: forcing moves
     * first, but only those that gain something). A quiet hash move, or
     * check, needs every move at once.
     */
    const moves = this.moves
    const staged = !inCheck && (hashMove === 0 || !this.isQuiet(hashMove))
    const alphaStart = alpha
    let bestScore = -INFINITY
    let bestMove = hashMove
    let checksReady = false
    let searched = 0
    let end = start // the children's moves go into moves[end...]
    let losingEnd = start // the losing captures wait in moves[start...losingEnd]
    for (let stage = staged ? 0 : 1; stage < 3; stage++) {
      let first = end
      let last = end
      if (stage === 0) {
        last = end = MoveList.generateCaptures(board, moves, first)
        this.scoreMoves(first, last, hashMove, ply)
      } else if (stage === 1) {
        /**
         * At depth 1, a quiet move that gives no check scores at most the
         * static score after it, and no quiet move adds more than
         * MAX_QUIET_GAIN to that. When even the best case misses alpha,
         * only the checks need a look. A capture was found, so the node
         * cannot be stalemate.
         */
        const futile = depth === 1 && staged && end > start
        const ceiling = futile ? this.evaluate(ply) + MAX_QUIET_GAIN : INFINITY
        if (ceiling <= alpha) {
          last = end = MoveList.generateQuietChecks(board, moves, first, this.checkSquares, 10 * ply)
          checksReady = true
          if (ceiling > bestScore) { bestScore = ceiling }
        } else {
          last = end = staged ? MoveList.generateQuiets(board, moves, first) : MoveList.generate(board, moves, first)
          if (end === start) { return inCheck ? ply - MATE : 0 }
        }
        this.scoreMoves(first, last, hashMove, ply)
        this.addAttackBonus(first, last)
      } else {
        first = start
        last = losingEnd
      }
      for (let i = first; i < last; i++) {
        const code = stage === 2 ? moves[i]! : this.pickMove(i, last)
        // slots before i are used up, so the move can wait in one of them
        if (stage === 0 && code !== hashMove && this.isLosing(code, i)) {
          moves[losingEnd++] = code
          continue
        }
        Evaluation.update(board, code, this.evalStack, ply)
        // the children are quiescence nodes, so the same test as there applies
        if (depth === 1) {
          const standPat = this.evaluate(ply + 1)
          if (standPat <= alpha) {
            if (!checksReady) {
              Checks.setSquares(board, this.checkSquares, 10 * ply)
              checksReady = true
            }
            if (!Checks.givesCheck(board, this.checkSquares, 10 * ply, code)) {
              if (standPat > bestScore) { bestScore = standPat }
              continue
            }
          }
        }
        this.engine.makeMove(code)
        let score: number
        if (searched++ === 0) {
          score = -this.alphaBeta(depth - 1, ply + 1, -beta, -alpha, end)
        } else {
          // prove the move is no better than the best one with a null window first
          score = -this.alphaBeta(depth - 1, ply + 1, -alpha - 1, -alpha, end)
          if (score > alpha && score < beta) {
            score = -this.alphaBeta(depth - 1, ply + 1, -beta, -alpha, end)
          }
        }
        this.engine.unmakeMove()

        if (score > bestScore) {
          bestScore = score
          if (score > alpha) {
            alpha = score
            bestMove = code
            this.updatePv(ply, code)
            if (score >= beta) {
              if (this.isQuiet(code)) { this.rememberCutoff(code, depth, ply) }
              stage = 3
              break
            }
          }
        }
      }
    }

    let bound = Bound.UPPER
    if (bestScore >= beta) {
      bound = Bound.LOWER
    } else if (bestScore > alphaStart) {
      bound = Bound.EXACT
    }
    table.store(lo, hi, bestMove, this.scoreToTable(bestScore, ply), depth, bound)
    return bestScore
  }

  /**
   * Searches captures until the position is quiet, so a line never ends
   * halfway through an exchange. The side to move may stand pat on the
   * static score, except in check, where every evasion is searched.
   */
  quiesce (ply: number, alpha: number, beta: number, start: number): number {
    const board = this.board
    this.nodes++
    this.pvLengths[ply] = 0
    if (ply >= MAX_PLY - 1) { return this.evaluate(ply) }
    const moves = this.moves
    let bestScore: number
    let end: number
    if (MoveList.isInCheck(board)) {
      end = MoveList.generate(board, moves, start)
      if (end === start) { return ply - MATE }
      bestScore = -INFINITY
    } else {
      bestScore = this.evaluate(ply)
      if (bestScore >= beta) { return bestScore }
      if (bestScore > alpha) { alpha = bestScore }
      end = MoveList.generateCaptures(board, moves, start)
    }
    this.scoreMoves(start, end, 0, ply)

    let checksReady = false
    for (let i = start; i < end; i++) {
      const code = this.pickMove(i, end)
      Evaluation.update(board, code, this.evalStack, ply)
      /**
       * The score after the move is known before making it. When that score
       * cannot beat alpha and the move gives no check, the child would stand
       * pat on it and return at once, so take its answer without the move.
       */
      const standPat = this.evaluate(ply + 1)
      if (standPat <= alpha) {
        if (!checksReady) {
          Checks.setSquares(board, this.checkSquares, 10 * ply)
          checksReady = true
        }
        if (!Checks.givesCheck(board, this.checkSquares, 10 * ply, code)) {
          if (standPat > bestScore) { bestScore = standPat }
          continue
        }
      }
      this.engine.makeMove(code)
      const score = -this.quiesce(ply + 1, -beta, -alpha, end)
      this.engine.unmakeMove()
      if (score > bestScore) {
        bestScore = score
        if (score > alpha) {
          alpha = score
          if (score >= beta) { break }
        }
      }
    }
    return bestScore
  }

  evaluate (ply: number): number {
    const score = Evaluation.taper(this.evalStack[2 * ply]!, this.evalStack[2 * ply + 1]!)
    return this.board.whiteToMove ? score : -score
  }

  // fifty moves without a capture or pawn move, or a position seen before
  isDraw (): boolean {
    const board = this.board
    if (board.halfMoveClock >= 100) { return true }
    const keys = this.engine.keyHistory32
    const m = this.engine.movesMade
    const oldest = Math.max(m - board.halfMoveClock, 0)
    for (let i = m - 4; i >= oldest; i -= 2) {
      if (keys[2 * i] === keys[2 * m] && keys[2 * i + 1] === keys[2 * m + 1]) { return true }
    }
    return false
  }

  // makeMove leaves the side to move and en passant out of the position key
  setKey (): void {
    const board = this.board
    let lo = this.keys32[2 * BoardSlot.POS_KEY]!
    let hi = this.keys32[2 * BoardSlot.POS_KEY + 1]!
    if (!board.whiteToMove) {
      lo ^= this.sideKeys32[2]!
      hi ^= this.sideKeys32[3]!
    }
    if (board.epSq !== EMPTY) {
      lo ^= this.epKeys32[2 * board.epSq]!
      hi ^= this.epKeys32[2 * board.epSq + 1]!
    }
    this.key[0] = lo
    this.key[1] = hi
  }

  // the table keeps mate scores as plies from the stored node, not the root
  scoreToTable (score: number, ply: number): number {
    if (score > MATE_BOUND) { return score + ply }
    if (score < -MATE_BOUND) { return score - ply }
    return score
  }

  scoreFromTable (score: number, ply: number): number {
    if (score > MATE_BOUND) { return score - ply }
    if (score < -MATE_BOUND) { return score + ply }
    return score
  }

  scoreMoves (start: number, end: number, hashMove: number, ply: number): void {
    const squares = this.board.squares
    const moves = this.moves
    const scores = this.moveScores
    const killer1 = this.killers[2 * ply]
    const killer2 = this.killers[2 * ply + 1]
    for (let i = start; i < end; i++) {
      const code = moves[i]!
      const to = (code >> 6) & 63
      const kind = code >>> 12
      const captured = squares[to]!
      let score: number
      if (code === hashMove) {
        score = HASH_MOVE
      } else if (kind >= MoveKind.PROMOTE_QUEEN) {
        // a queen promotion goes with the best captures; the rest last
        score = kind === MoveKind.PROMOTE_QUEEN ? CAPTURE_SCORES[1 * 12 + 5]! + (captured === EMPTY ? 0 : 1) : -1
      } else if (captured !== EMPTY) {
        score = CAPTURE_SCORES[captured * 12 + squares[code & 63]!]!
      } else if (kind === MoveKind.EN_PASSANT) {
        score = CAPTURE_SCORES[5 * 12 + 5]!
      } else if (code === killer1) {
        score = KILLER + 1
      } else if (code === killer2) {
        score = KILLER
      } else {
        score = this.history[squares[code & 63]! * 64 + to]! + this.activityGain(squares[code & 63]!, code & 63, to)
      }
      scores[i] = score
    }
  }

  /**
   * How much more active the piece gets, in middlegame centipawns from its
   * own side's view: Smirnov's "maximum activity" as a tiebreak for quiet
   * moves that history knows nothing about yet.
   */
  activityGain (piece: number, from: number, to: number): number {
    const gain = ((PST[piece * 64 + to]! - PST[piece * 64 + from]!) << 16) >> 16
    return piece < 6 ? gain : -gain
  }

  /**
   * Smirnov's attacking moves (Calculation, p31-34): a pawn move that
   * attacks one of their pieces, or a knight move that attacks a rook or
   * queen, forces an answer, so it goes before the other quiet moves.
   */
  addAttackBonus (start: number, end: number): void {
    const board = this.board
    const bbs = board.bitboards
    const them = board.whiteToMove ? 6 : 0
    HITS[TARGETS] = bbs[them + Piece.QUEEN]! | bbs[them + Piece.ROOK]! | bbs[them + Piece.BISHOP]! | bbs[them + Piece.KNIGHT]!
    // our pawns attack from one rank behind, on the files next door
    if (them === 6) {
      HITS[PAWN_HITS] = ((HITS[TARGETS] >> 9n) & 0x7F7F7F7F7F7F7F7Fn) | ((HITS[TARGETS] >> 7n) & 0xFEFEFEFEFEFEFEFEn)
    } else {
      HITS[PAWN_HITS] = ((HITS[TARGETS] << 7n) & 0x7F7F7F7F7F7F7F7Fn) | ((HITS[TARGETS] << 9n) & 0xFEFEFEFEFEFEFEFEn)
    }
    HITS[TARGETS] = bbs[them + Piece.QUEEN]! | bbs[them + Piece.ROOK]!
    HITS[KNIGHT_HITS] = 0n
    for (let half = 0; half < 2; half++) {
      let targets = HITS32[2 * TARGETS + half]!
      while (targets !== 0) {
        HITS[KNIGHT_HITS] = HITS[KNIGHT_HITS] | KNIGHT_ATTACKS[(half << 5) | (31 - Math.clz32(targets & -targets))]!
        targets &= targets - 1
      }
    }
    const squares = board.squares
    const moves = this.moves
    const scores = this.moveScores
    for (let i = start; i < end; i++) {
      if (scores[i]! >= KILLER) { continue }
      const code = moves[i]!
      const to = (code >> 6) & 63
      const type = squares[code & 63]! % 6
      const hits = type === Piece.PAWN ? PAWN_HITS : (type === Piece.KNIGHT ? KNIGHT_HITS : -1)
      if (hits >= 0 && ((HITS32[2 * hits + (to >> 5)]! >>> (to & 31)) & 1) !== 0) { scores[i]! += ATTACK_BONUS }
    }
  }

  // swaps the best-scored move left in moves[i...end] into slot i
  pickMove (i: number, end: number): number {
    const moves = this.moves
    const scores = this.moveScores
    let best = i
    for (let j = i + 1; j < end; j++) {
      if (scores[j]! > scores[best]!) { best = j }
    }
    const code = moves[best]!
    moves[best] = moves[i]!
    moves[i] = code
    const score = scores[best]!
    scores[best] = scores[i]!
    scores[i] = score
    return code
  }

  // after generateCaptures: does the move at moves[i] belong after the quiet moves?
  isLosing (code: number, i: number): boolean {
    if ((code >>> 12) !== MoveKind.QUIET) { return this.moveScores[i]! < 0 }
    return Exchange.isLosing(this.board, code)
  }

  isQuiet (code: number): boolean {
    return this.board.squares[(code >> 6) & 63] === EMPTY && (code >>> 12) < MoveKind.EN_PASSANT
  }

  // a quiet move that refuted this node is likely to refute its siblings too
  rememberCutoff (code: number, depth: number, ply: number): void {
    const killers = this.killers
    if (killers[2 * ply] !== code) {
      killers[2 * ply + 1] = killers[2 * ply]!
      killers[2 * ply] = code
    }
    const history = this.history
    const slot = this.board.squares[code & 63]! * 64 + ((code >> 6) & 63)
    history[slot]! += depth * depth
    if (history[slot]! > HISTORY_LIMIT) {
      for (let i = 0; i < history.length; i++) { history[i]! >>= 1 }
    }
  }

  updatePv (ply: number, code: number): void {
    const pv = this.pvTable
    const row = ply * MAX_PLY
    const childRow = row + MAX_PLY
    const childLength = this.pvLengths[ply + 1]!
    pv[row] = code
    for (let i = 0; i < childLength; i++) { pv[row + 1 + i] = pv[childRow + i]! }
    this.pvLengths[ply] = childLength + 1
  }
}

export {
  Search,
  MATE
}
export type { SearchResult }
