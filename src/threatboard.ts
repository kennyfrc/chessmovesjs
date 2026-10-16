import { Pieces, Piece, BoardSlot } from './pieces.ts'
import { Ray, KNIGHT_ATTACKS, KING_ATTACKS, PAWN_ATTACKS } from './attack.ts'
import type { Board } from './board.ts'

const THREATS = new BigUint64Array(1)
const THREATS32 = new Int32Array(THREATS.buffer)

class ThreatBoard {
  /**
   * Is sq attacked by the side that is not `color`? (0 = white, 1 = black)
   * Pass a different occupancy to look through pieces, e.g. a moving king.
   */
  static isAttacked (board: Board, sq: number, color: number, occupied: bigint): boolean {
    const bbs = board.bitboards
    const them = 6 - color * 6
    // one long BigInt expression is several times slower than short steps
    // through THREATS, so leapers and each slider type are tested apart
    THREATS[0] = (KNIGHT_ATTACKS[sq]! & bbs[them + Piece.KNIGHT]!) |
      (PAWN_ATTACKS[color * 64 + sq]! & bbs[them + Piece.PAWN]!) |
      (KING_ATTACKS[sq]! & bbs[them + Piece.KING]!)
    if ((THREATS32[0]! | THREATS32[1]!) !== 0) { return true }
    THREATS[0] = Ray.bishopAttacks(sq, occupied) & (bbs[them + Piece.BISHOP]! | bbs[them + Piece.QUEEN]!)
    if ((THREATS32[0]! | THREATS32[1]!) !== 0) { return true }
    THREATS[0] = Ray.rookAttacks(sq, occupied) & (bbs[them + Piece.ROOK]! | bbs[them + Piece.QUEEN]!)
    return (THREATS32[0]! | THREATS32[1]!) !== 0
  }

  // bitboard of the given pieces that attack sq
  static attackersOf (board: Board, sq: number, byPieceOrSide = 'all', occupied = board.bb): bigint {
    return Pieces.for(byPieceOrSide)
      .map((fenPiece) => this.attacksTo(board, sq, Pieces.indexFor(fenPiece), occupied))
      .reduce((accThreats, currThreats) => accThreats | currThreats, 0n)
  }

  static attacksTo (board: Board, sq: number, piece: number, occupied: bigint): bigint {
    const pieceBb = board.bitboards[piece]!
    switch (piece % 6) {
      case Piece.KING:
        return KING_ATTACKS[sq]! & pieceBb
      case Piece.QUEEN:
        return Ray.queenAttacks(sq, occupied) & pieceBb
      case Piece.ROOK:
        return Ray.rookAttacks(sq, occupied) & pieceBb
      case Piece.BISHOP:
        return Ray.bishopAttacks(sq, occupied) & pieceBb
      case Piece.KNIGHT:
        return KNIGHT_ATTACKS[sq]! & pieceBb
      default:
        // a white pawn attacks sq from where a black pawn on sq would attack
        return PAWN_ATTACKS[(piece < 6 ? 64 : 0) + sq]! & pieceBb
    }
  }

  static checkers (board: Board): bigint {
    const kingSq = board.kingSqs[board.whiteToMove ? 0 : 1]!
    return this.attackersOf(board, kingSq, board.whiteToMove ? 'b' : 'w')
  }

  // their sliders that would hit our king if our own pieces were not in the way
  static xraysTo (board: Board, kingSq: number, theirSide: string, ourPieces: bigint): bigint {
    const occupied = board.bb ^ ourPieces
    return this.attackersOf(board, kingSq, theirSide === 'w' ? 'ws' : 'bs', occupied)
  }

  static isOurKingXrayed (board: Board): boolean {
    const kingSq = board.kingSqs[board.whiteToMove ? 0 : 1]!
    const ourPieces = board.bitboards[board.whiteToMove ? BoardSlot.WHITE : BoardSlot.BLACK]!
    return this.xraysTo(board, kingSq, board.whiteToMove ? 'b' : 'w', ourPieces) !== 0n
  }

  static isTheirKingXrayed (board: Board): boolean {
    const kingSq = board.kingSqs[board.whiteToMove ? 1 : 0]!
    const theirPieces = board.bitboards[board.whiteToMove ? BoardSlot.BLACK : BoardSlot.WHITE]!
    return this.xraysTo(board, kingSq, board.whiteToMove ? 'w' : 'b', theirPieces) !== 0n
  }

  static isSqAttacked (board: Board, sq: number, byPieceOrSide = 'all'): boolean {
    return this.attackersOf(board, sq, byPieceOrSide) !== 0n
  }
}

export {
  ThreatBoard
}
