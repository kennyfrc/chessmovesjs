import { SQUARE_BB, KNIGHT_ATTACKS, KING_ATTACKS, PAWN_ATTACKS, Ray } from './attack.ts'
import { Piece, BoardSlot } from './pieces.ts'
import { VALUES } from './eval.ts'
import type { Board } from './board.ts'

// scratch bitboards, read back as int halves like move.ts does with GEN
const OCCUPIED = 0 // the board as the exchange goes on
const ATTACKERS = 1 // pieces of both sides that attack the square
const SIDE = 2 // the attackers of the side about to take
const PIECES = 3
const RAYS = 4
const ROOKS = 5 // rooks and queens of both sides
const BISHOPS = 6 // bishops and queens of both sides
const SEE = new BigUint64Array(7)
const SEE32 = new Int32Array(SEE.buffer)

// trading a bishop for a knight is even, so a capture must lose more than this
const MARGIN = 50

/**
 * Static exchange evaluation (SEE). Plays out the captures on one square,
 * each side taking back with its cheapest piece and free to stop, without
 * making any move. Sliders behind a capturer join in once it has gone.
 * Pins are ignored. The swap logic follows Stockfish's see_ge.
 */
class Exchange {
  // does the capture leave the side to move more than MARGIN behind?
  static isLosing (board: Board, code: number): boolean {
    const squares = board.squares
    const from = code & 63
    const to = (code >> 6) & 63
    // swap: what the side that just took must not lose, as the exchange goes on
    let swap = VALUES[squares[to]! % 6]! + MARGIN
    swap = VALUES[squares[from]! % 6]! - swap
    if (swap <= 0) { return false }
    const bbs = board.bitboards
    SEE[OCCUPIED] = bbs[BoardSlot.OCCUPIED]! ^ SQUARE_BB[from]! ^ SQUARE_BB[to]!
    SEE[ROOKS] = bbs[Piece.ROOK]! | bbs[Piece.QUEEN]! | bbs[6 + Piece.ROOK]! | bbs[6 + Piece.QUEEN]!
    SEE[BISHOPS] = bbs[Piece.BISHOP]! | bbs[Piece.QUEEN]! | bbs[6 + Piece.BISHOP]! | bbs[6 + Piece.QUEEN]!
    Ray.setRookAttacks(SEE, RAYS, to, SEE, OCCUPIED)
    SEE[ATTACKERS] = SEE[RAYS]! & SEE[ROOKS]
    Ray.setBishopAttacks(SEE, RAYS, to, SEE, OCCUPIED)
    // a pawn attacks the square from where a pawn of the other color there would attack
    SEE[ATTACKERS] = SEE[ATTACKERS] | (SEE[RAYS]! & SEE[BISHOPS]) |
      (KNIGHT_ATTACKS[to]! & (bbs[Piece.KNIGHT]! | bbs[6 + Piece.KNIGHT]!)) |
      (KING_ATTACKS[to]! & (bbs[Piece.KING]! | bbs[6 + Piece.KING]!)) |
      (PAWN_ATTACKS[64 + to]! & bbs[Piece.PAWN]!) |
      (PAWN_ATTACKS[to]! & bbs[6 + Piece.PAWN]!)
    let color = board.whiteToMove ? 0 : 1
    let ahead = 1 // 1 while the side to move is within the margin
    while (true) {
      color ^= 1
      SEE[ATTACKERS] = SEE[ATTACKERS] & SEE[OCCUPIED]
      SEE[SIDE] = SEE[ATTACKERS] & bbs[BoardSlot.WHITE + color]!
      if ((SEE32[2 * SIDE]! | SEE32[2 * SIDE + 1]!) === 0) { break }
      ahead ^= 1
      let type = Piece.PAWN
      while (type > Piece.KING) {
        SEE[PIECES] = SEE[SIDE] & bbs[color * 6 + type]!
        if ((SEE32[2 * PIECES]! | SEE32[2 * PIECES + 1]!) !== 0) { break }
        type--
      }
      if (type === Piece.KING) {
        // the king may only take when nothing can take it back
        SEE[SIDE] = SEE[ATTACKERS] & bbs[BoardSlot.BLACK - color]!
        if ((SEE32[2 * SIDE]! | SEE32[2 * SIDE + 1]!) !== 0) { ahead ^= 1 }
        break
      }
      swap = VALUES[type]! - swap
      if (swap < ahead) { break }
      this.removeOne()
      if (type === Piece.PAWN || type === Piece.BISHOP || type === Piece.QUEEN) {
        Ray.setBishopAttacks(SEE, RAYS, to, SEE, OCCUPIED)
        SEE[ATTACKERS] = SEE[ATTACKERS] | (SEE[RAYS]! & SEE[BISHOPS])
      }
      if (type === Piece.ROOK || type === Piece.QUEEN) {
        Ray.setRookAttacks(SEE, RAYS, to, SEE, OCCUPIED)
        SEE[ATTACKERS] = SEE[ATTACKERS] | (SEE[RAYS]! & SEE[ROOKS])
      }
    }
    return ahead === 0
  }

  // takes the lowest piece in PIECES off the board
  static removeOne (): void {
    const lo = SEE32[2 * PIECES]!
    if (lo !== 0) {
      SEE32[2 * OCCUPIED]! ^= lo & -lo
    } else {
      const hi = SEE32[2 * PIECES + 1]!
      SEE32[2 * OCCUPIED + 1]! ^= hi & -hi
    }
  }
}

export {
  Exchange,
  MARGIN
}
