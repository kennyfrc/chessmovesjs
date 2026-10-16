import { BitHelper } from './helpers.ts'
import { KNIGHT_ATTACKS, KING_ATTACKS, ROOK_RAYS, BISHOP_RAYS } from './attack.ts'
import { MoveKind } from './move.ts'
import { Piece } from './pieces.ts'
import type { Board } from './board.ts'

const EMPTY = -1

// centipawns by piece type: king, queen, rook, bishop, knight, pawn
const VALUES = [0, 900, 500, 330, 320, 100]

// how much each piece type counts toward the middlegame; the start is 24
const PHASES = [0, 4, 2, 1, 1, 0]
const MAX_PHASE = 24

// a castled king sits by the corner, away from the center files
const KING_SHELTER = [20, 30, 10, 0, 0, 10, 30, 20]

// center pawns gain space as they advance; wing pawns shelter the king
const PAWN_SPACE = [0, 0, 5, 10, 10, 5, 0, 0]

// in the endgame a pawn is worth more the closer it is to promoting
const PAWN_RACE = [0, 0, 10, 20, 35, 60, 100, 0]

/**
 * Piece-square tables built from Smirnov's measure of activity: the number
 * of squares a piece controls (Positional Understanding, p5). A knight on
 * h1 controls 2 squares and one on d5 controls 8, so the tables count
 * those squares instead of listing hand-picked values.
 *
 * Each entry packs both game phases into one int, endgame * 65536 +
 * middlegame, so one add moves both scores. Black's entries are white's,
 * mirrored and negated, so every sum is white minus black.
 */
class PieceSquareTables {
  static build (): Int32Array {
    const pst = new Int32Array(12 * 64)
    for (let type = Piece.KING; type <= Piece.PAWN; type++) {
      for (let sq = 0; sq < 64; sq++) {
        const mg = VALUES[type]! + this.middlegame(type, sq)
        const eg = VALUES[type]! + this.endgame(type, sq)
        pst[type * 64 + sq] = eg * 65536 + mg
        pst[(6 + type) * 64 + (sq ^ 56)] = -(eg * 65536 + mg)
      }
    }
    return pst
  }

  static middlegame (type: number, sq: number): number {
    const rank = sq >> 3
    switch (type) {
      case Piece.KING:
        return KING_SHELTER[sq & 7]! - 25 * rank
      case Piece.QUEEN: // an early queen only needs a nudge
        return 2 * (this.squaresControlled(type, sq) - 23)
      case Piece.ROOK: // on the 7th rank a rook attacks pawns from the side
        return rank === 6 ? 20 : 0
      case Piece.PAWN:
        return PAWN_SPACE[sq & 7]! * (rank - 1) + (rank === 6 ? 40 : 0)
      default:
        return this.minorActivity(type, sq)
    }
  }

  static endgame (type: number, sq: number): number {
    switch (type) {
      case Piece.KING: // the king becomes a fighting piece and heads for the center
        return 12 * (2 - this.centerDistance(sq))
      case Piece.QUEEN:
        return 4 * (this.squaresControlled(type, sq) - 23)
      case Piece.ROOK:
        return (sq >> 3) === 6 ? 10 : 0
      case Piece.PAWN:
        return PAWN_RACE[sq >> 3]!
      default:
        return this.minorActivity(type, sq)
    }
  }

  // about 8 centipawns per square a knight controls, 5 per bishop square
  static minorActivity (type: number, sq: number): number {
    return type === Piece.KNIGHT
      ? 8 * (this.squaresControlled(type, sq) - 4)
      : 5 * (this.squaresControlled(type, sq) - 9)
  }

  // squares a piece controls from sq on an empty board
  static squaresControlled (type: number, sq: number): number {
    switch (type) {
      case Piece.QUEEN:
        return BitHelper.popCount(ROOK_RAYS[sq]! | BISHOP_RAYS[sq]!)
      case Piece.BISHOP:
        return BitHelper.popCount(BISHOP_RAYS[sq]!)
      default:
        return BitHelper.popCount(KNIGHT_ATTACKS[sq]!)
    }
  }

  // king steps from the 4 center squares: 0 on d4, 3 on a corner
  static centerDistance (sq: number): number {
    const file = sq & 7
    const rank = sq >> 3
    return Math.max(file < 4 ? 3 - file : file - 4, rank < 4 ? 3 - rank : rank - 4)
  }

  /**
   * The most one quiet move can add to the mover's score: a step of one
   * piece, or castling's king and rook. A quiet move changes no material
   * and no phase, so the blend of the two phases gains no more than the
   * larger of its two gains. Black's tables mirror white's, so white's
   * moves are enough.
   */
  static maxQuietGain (pst: Int32Array): number {
    const king = new Int32Array(KING_ATTACKS.buffer)
    const knight = new Int32Array(KNIGHT_ATTACKS.buffer)
    const rook = new Int32Array(ROOK_RAYS.buffer)
    const bishop = new Int32Array(BISHOP_RAYS.buffer)
    const has = (table: Int32Array, from: number, to: number) => ((table[2 * from + (to >> 5)]! >>> (to & 31)) & 1) === 1
    let best = Math.max(
      this.gain(pst[6]! - pst[4]! + pst[2 * 64 + 5]! - pst[2 * 64 + 7]!), // e1-g1, h1-f1
      this.gain(pst[2]! - pst[4]! + pst[2 * 64 + 3]! - pst[2 * 64]!) // e1-c1, a1-d1
    )
    for (let type = Piece.KING; type <= Piece.PAWN; type++) {
      for (let from = 0; from < 64; from++) {
        for (let to = 0; to < 64; to++) {
          let reaches: boolean
          switch (type) {
            case Piece.KING: reaches = has(king, from, to); break
            case Piece.QUEEN: reaches = has(rook, from, to) || has(bishop, from, to); break
            case Piece.ROOK: reaches = has(rook, from, to); break
            case Piece.BISHOP: reaches = has(bishop, from, to); break
            case Piece.KNIGHT: reaches = has(knight, from, to); break
            default: // pushes that do not promote
              reaches = from > 7 && to < 56 && (to === from + 8 || (from >> 3 === 1 && to === from + 16))
          }
          if (reaches) { best = Math.max(best, this.gain(pst[type * 64 + to]! - pst[type * 64 + from]!)) }
        }
      }
    }
    return best
  }

  // the larger phase of a packed change in white's score
  static gain (change: number): number {
    const mg = (change << 16) >> 16
    return Math.max(mg, (change - mg) >> 16)
  }

  static phases (): Int8Array {
    const phases = new Int8Array(12)
    for (let piece = 0; piece < 12; piece++) { phases[piece] = PHASES[piece % 6]! }
    return phases
  }
}

const PST = PieceSquareTables.build()
const PIECE_PHASES = PieceSquareTables.phases()
const MAX_QUIET_GAIN = PieceSquareTables.maxQuietGain(PST)

/**
 * Material plus piece-square tables, kept up to date move by move. The
 * search stores [packed score, phase] for each ply in one Int32Array and
 * calls update() before each move, so evaluating a position is two reads
 * and a blend.
 */
class Evaluation {
  // centipawns for the side to move
  static evaluate (board: Board): number {
    const score = this.taper(this.packedScore(board), this.phase(board))
    return board.whiteToMove ? score : -score
  }

  static packedScore (board: Board): number {
    let score = 0
    for (let sq = 0; sq < 64; sq++) {
      const piece = board.squares[sq]!
      if (piece !== EMPTY) { score += PST[piece * 64 + sq]! }
    }
    return score
  }

  static phase (board: Board): number {
    let phase = 0
    for (let sq = 0; sq < 64; sq++) {
      const piece = board.squares[sq]!
      if (piece !== EMPTY) { phase += PIECE_PHASES[piece]! }
    }
    return phase
  }

  /**
   * Blends the middlegame and endgame scores packed in score, from white's
   * side. The low 16 bits hold the middlegame score, sign included.
   */
  static taper (score: number, phase: number): number {
    const mg = (score << 16) >> 16
    const eg = (score - mg) >> 16
    const mgWeight = phase < MAX_PHASE ? phase : MAX_PHASE // promotions can push it past 24
    return ((mg * mgWeight + eg * (MAX_PHASE - mgWeight)) / MAX_PHASE) | 0
  }

  /**
   * Writes the score and phase after code into stack[2 * ply + 2] and
   * stack[2 * ply + 3]. Call it before the move is made: it reads the
   * pieces off the board.
   */
  static update (board: Board, code: number, stack: Int32Array, ply: number): void {
    const squares = board.squares
    const from = code & 63
    const to = (code >> 6) & 63
    const kind = code >>> 12
    const piece = squares[from]!
    const captured = squares[to]!
    let score = stack[2 * ply]! - PST[piece * 64 + from]!
    let phase = stack[2 * ply + 1]!
    if (captured !== EMPTY) {
      score -= PST[captured * 64 + to]!
      phase -= PIECE_PHASES[captured]!
    }
    if (kind < MoveKind.PROMOTE_QUEEN) {
      score += PST[piece * 64 + to]!
      if (kind === MoveKind.CASTLE) {
        score += this.castleRookDelta(piece - Piece.KING + Piece.ROOK, from, to)
      } else if (kind === MoveKind.EN_PASSANT) {
        const pawnSq = piece < 6 ? to - 8 : to + 8
        score -= PST[squares[pawnSq]! * 64 + pawnSq]!
      }
    } else {
      const promoted = piece - Piece.PAWN + kind - MoveKind.PROMOTE_QUEEN + Piece.QUEEN
      score += PST[promoted * 64 + to]!
      phase += PIECE_PHASES[promoted]!
    }
    stack[2 * ply + 2] = score
    stack[2 * ply + 3] = phase
  }

  // the rook jumps over the king: h1 to f1, or a1 to d1
  static castleRookDelta (rook: number, kingFrom: number, kingTo: number): number {
    const rookFrom = kingTo > kingFrom ? kingTo + 1 : kingTo - 2
    const rookTo = kingTo > kingFrom ? kingTo - 1 : kingTo + 1
    return PST[rook * 64 + rookTo]! - PST[rook * 64 + rookFrom]!
  }
}

export {
  Evaluation,
  MAX_QUIET_GAIN,
  PST,
  VALUES
}
