const Pieces = require('./pieces.js').Pieces
const Piece = require('./pieces.js').Piece
const BoardSlot = require('./pieces.js').BoardSlot
const Ray = require('./attack.js').Ray
const KNIGHT_ATTACKS = require('./attack.js').KNIGHT_ATTACKS
const KING_ATTACKS = require('./attack.js').KING_ATTACKS
const PAWN_ATTACKS = require('./attack.js').PAWN_ATTACKS

const THREATS = new BigUint64Array(1)
const THREATS32 = new Int32Array(THREATS.buffer)

class ThreatBoard {
  /**
   * Is sq attacked by the side that is not `color`? (0 = white, 1 = black)
   * Pass a different occupancy to look through pieces, e.g. a moving king.
   */
  static isAttacked (board, sq, color, occupied) {
    const bbs = board.bitboards
    const them = 6 - color * 6
    // one long BigInt expression is several times slower than short steps
    // through THREATS, so leapers and each slider type are tested apart
    THREATS[0] = (KNIGHT_ATTACKS[sq] & bbs[them + Piece.KNIGHT]) |
      (PAWN_ATTACKS[color * 64 + sq] & bbs[them + Piece.PAWN]) |
      (KING_ATTACKS[sq] & bbs[them + Piece.KING])
    if ((THREATS32[0] | THREATS32[1]) !== 0) { return true }
    THREATS[0] = Ray.bishopAttacks(sq, occupied) & (bbs[them + Piece.BISHOP] | bbs[them + Piece.QUEEN])
    if ((THREATS32[0] | THREATS32[1]) !== 0) { return true }
    THREATS[0] = Ray.rookAttacks(sq, occupied) & (bbs[them + Piece.ROOK] | bbs[them + Piece.QUEEN])
    return (THREATS32[0] | THREATS32[1]) !== 0
  }

  // bitboard of the given pieces that attack sq
  static attackersOf (board, sq, byPieceOrSide = 'all', occupied = board.bb) {
    return Pieces.for(byPieceOrSide)
      .map((fenPiece) => this.attacksTo(board, sq, Pieces.indexFor(fenPiece), occupied))
      .reduce((accThreats, currThreats) => accThreats | currThreats, 0n)
  }

  static attacksTo (board, sq, piece, occupied) {
    const pieceBb = board.bitboards[piece]
    switch (piece % 6) {
      case Piece.KING:
        return KING_ATTACKS[sq] & pieceBb
      case Piece.QUEEN:
        return Ray.queenAttacks(sq, occupied) & pieceBb
      case Piece.ROOK:
        return Ray.rookAttacks(sq, occupied) & pieceBb
      case Piece.BISHOP:
        return Ray.bishopAttacks(sq, occupied) & pieceBb
      case Piece.KNIGHT:
        return KNIGHT_ATTACKS[sq] & pieceBb
      default:
        // a white pawn attacks sq from where a black pawn on sq would attack
        return PAWN_ATTACKS[(piece < 6 ? 64 : 0) + sq] & pieceBb
    }
  }

  static checkers (board) {
    const kingSq = board.kingSqs[board.whiteToMove ? 0 : 1]
    return this.attackersOf(board, kingSq, board.whiteToMove ? 'b' : 'w')
  }

  // their sliders that would hit our king if our own pieces were not in the way
  static xraysTo (board, kingSq, theirSide, ourPieces) {
    const occupied = board.bb ^ ourPieces
    return this.attackersOf(board, kingSq, theirSide === 'w' ? 'ws' : 'bs', occupied)
  }

  static isOurKingXrayed (board) {
    const kingSq = board.kingSqs[board.whiteToMove ? 0 : 1]
    const ourPieces = board.bitboards[board.whiteToMove ? BoardSlot.WHITE : BoardSlot.BLACK]
    return this.xraysTo(board, kingSq, board.whiteToMove ? 'b' : 'w', ourPieces) !== 0n
  }

  static isTheirKingXrayed (board) {
    const kingSq = board.kingSqs[board.whiteToMove ? 1 : 0]
    const theirPieces = board.bitboards[board.whiteToMove ? BoardSlot.BLACK : BoardSlot.WHITE]
    return this.xraysTo(board, kingSq, board.whiteToMove ? 'w' : 'b', theirPieces) !== 0n
  }

  static isSqAttacked (board, sq, byPieceOrSide = 'all') {
    return this.attackersOf(board, sq, byPieceOrSide) !== 0n
  }
}

module.exports = {
  ThreatBoard: ThreatBoard
}
