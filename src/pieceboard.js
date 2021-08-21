const BitHelper = require('./helpers.js').BitHelper
const BoardHelper = require('./helpers.js').BoardHelper
// const SquareHelper = require('./helpers.js').SquareHelper
const ViewHelper = require('./helpers.js').ViewHelper
const Direction = require('./attack.js').Direction
// const MoveList = require('./move.js').MoveList
const U64 = require('./helpers.js').U64
// const U64Comp = require('./helpers.js').U64Comp
const Mask = require('./mask.js').Mask

class PieceBoard {
  static for (fenChar, pieceBit) {
    let PieceClass
    switch (fenChar) {
      case 'k':
        PieceClass = BlackKingBoard
        break
      case 'q':
        PieceClass = BlackQueenBoard
        break
      case 'r':
        PieceClass = BlackRookBoard
        break
      case 'b':
        PieceClass = BlackBishopBoard
        break
      case 'n':
        PieceClass = BlackKnightBoard
        break
      case 'p':
        PieceClass = BlackPawnBoard
        break
      case 'K':
        PieceClass = WhiteKingBoard
        break
      case 'Q':
        PieceClass = WhiteQueenBoard
        break
      case 'R':
        PieceClass = WhiteRookBoard
        break
      case 'B':
        PieceClass = WhiteBishopBoard
        break
      case 'N':
        PieceClass = WhiteKnightBoard
        break
      case 'P':
        PieceClass = WhitePawnBoard
        break
    }
    return new PieceClass(pieceBit)
  }
}

class WhitePawnBoard extends PieceBoard {
  constructor (bb) {
    super()
    this.bb = bb
    this.fenChar = 'P'
  }

  atSecondRank (pieceBb) {
    return pieceBb & BoardHelper.secondRank()
  }

  canDoublePush (pieceBb) {
    return Direction.wDoublePush(pieceBb, this.emptySq)
  }

  canSinglePush (pieceBb) {
    return Direction.wSinglePush(pieceBb, this.emptySq)
  }

  rawPawnAttacks (pieceBb, board) {
    this.setContext(board)
    return this.pawnAttacks(pieceBb)
  }

  pawnAttacks (pieceBb) {
    return Direction.wPawnAttacks(pieceBb) & (this.blackBb | this.epSqBb)
  }

  setContext (board) {
    this.blackBb = board.blackBb
    this.mainBoardBb = board.bb
    this.emptySq = ~board.bb
    this.blackKingBb = board.blackKingBb
    this.blackMinorBb = board.blackMinorBb
    this.blackMajorBb = board.blackMajorBb
    this.epSqIdx = board.epSqIdx
    this.epSqBb = this.epSqIdx === undefined ? U64(0) : BitHelper.setBit(U64(0), this.epSqIdx)
    this.occupied = board.bb
    this.occupiable = ~board.whiteBb
  }

  initialMoves (pieceBb) {
    return this.canSinglePush(pieceBb) | this.pawnAttacks(pieceBb)
  }

  doublePushMoves (pieceBb) {
    return this.atSecondRank(pieceBb) ? this.canDoublePush(pieceBb) : U64(0)
  }

  attacks (pieceBb, board) {
    this.setContext(board)
    return this.initialMoves(pieceBb) | this.doublePushMoves(pieceBb)
  }

  defends (pieceBb, board) {
    this.setContext(board)
    return Direction.wPawnAttacks(pieceBb) & (board.whiteBb)
  }
}

class BlackPawnBoard extends PieceBoard {
  constructor (bb) {
    super()
    this.bb = bb
    this.fenChar = 'p'
  }

  atSeventhRank (pieceBb) {
    return pieceBb & BoardHelper.seventhRank()
  }

  canDoublePush (pieceBb) {
    return Direction.bDoublePush(pieceBb, this.emptySq)
  }

  canSinglePush (pieceBb) {
    return Direction.bSinglePush(pieceBb, this.emptySq)
  }

  rawPawnAttacks (pieceBb, board) {
    this.setContext(board)
    return this.pawnAttacks(pieceBb)
  }

  pawnAttacks (pieceBb) {
    return Direction.bPawnAttacks(pieceBb) & (this.whiteBb | this.epSqBb)
  }

  setContext (board) {
    this.whiteBb = board.whiteBb
    this.mainBoardBb = board.bb
    this.emptySq = ~board.bb
    this.whiteKingBb = board.whiteKingBb
    this.whiteMinorBb = board.whiteMinorBb
    this.whiteMajorBb = board.whiteMajorBb
    this.epSqIdx = board.epSqIdx
    this.epSqBb = this.epSqIdx === undefined ? U64(0) : BitHelper.setBit(U64(0), this.epSqIdx)
    this.occupied = board.bb
    this.occupiable = ~board.blackBb
  }

  initialMoves (pieceBb) {
    return this.canSinglePush(pieceBb) | this.pawnAttacks(pieceBb)
  }

  doublePushMoves (pieceBb) {
    return this.atSeventhRank(pieceBb) ? this.canDoublePush(pieceBb) : U64(0)
  }

  attacks (pieceBb, board) {
    if (board.epSqIdx === 46) { throw new Error('wtf?')}
    this.setContext(board)
    return this.initialMoves(pieceBb) | this.doublePushMoves(pieceBb)
  }

  defends (pieceBb, board) {
    this.setContext(board)
    return Direction.bPawnAttacks(pieceBb) & (board.blackBb)
  }
}

class WhiteKnightBoard extends PieceBoard {
  constructor (bb) {
    super()
    this.bb = bb
    this.fenChar = 'N'
  }

  setContext (board) {
    this.blackKingBb = board.blackKingBb
    this.blackMajorBb = board.blackMajorBb
    this.blackBb = board.blackBb
    this.occupied = board.bb
    this.occupiable = ~board.whiteBb
  }

  attacks (pieceBb, board) {
    this.setContext(board)
    return Direction.knightAttacks(pieceBb) & this.occupiable
  }

  defends (pieceBb, board) {
    this.setContext(board)
    return Direction.knightAttacks(pieceBb) & board.whiteBb
  }
}

class BlackKnightBoard extends PieceBoard {
  constructor (bb) {
    super()
    this.bb = bb
    this.fenChar = 'n'
  }

  setContext (board) {
    this.whiteKingBb = board.whiteKingBb
    this.whiteMajorBb = board.whiteMajorBb
    this.whiteBb = board.whiteBb
    this.occupied = board.bb
    this.occupiable = ~board.blackBb
  }

  attacks (pieceBb, board) {
    this.setContext(board)
    return Direction.knightAttacks(pieceBb) & this.occupiable
  }

  defends (pieceBb, board) {
    this.setContext(board)
    return Direction.knightAttacks(pieceBb) & board.blackBb
  }
}

class WhiteBishopBoard extends PieceBoard {
  constructor (bb) {
    super()
    this.bb = bb
    this.fenChar = 'B'
  }

  setContext (board) {
    this.blackKingBb = board.blackKingBb
    this.blackMajorBb = board.blackMajorBb
    this.blackBb = board.blackBb
    this.occupied = board.bb
    this.occupiable = ~board.whiteBb
  }

  attacks (pieceBb, board) {
    this.setContext(board)
    return Direction.bishopRays(pieceBb, this.occupied, this.occupiable)
  }

  defends (pieceBb, board) {
    this.setContext(board)
    return Direction.bishopRays(pieceBb, this.occupied, board.whiteBb)
  }
}

class BlackBishopBoard extends PieceBoard {
  constructor (bb) {
    super()
    this.bb = bb
    this.fenChar = 'b'
  }

  setContext (board) {
    this.whiteKingBb = board.whiteKingBb
    this.whiteMajorBb = board.whiteMajorBb
    this.whiteBb = board.whiteBb
    this.occupied = board.bb
    this.occupiable = ~board.blackBb
  }

  attacks (pieceBb, board) {
    this.setContext(board)
    return Direction.bishopRays(pieceBb, this.occupied, this.occupiable)
  }

  defends (pieceBb, board) {
    this.setContext(board)
    return Direction.bishopRays(pieceBb, this.occupied, board.blackBb)
  }
}

class WhiteRookBoard extends PieceBoard {
  constructor (bb) {
    super()
    this.bb = bb
    this.fenChar = 'R'
  }

  setContext (board) {
    this.blackKingBb = board.blackKingBb
    this.blackQueenBb = board.blackQueenBb
    this.blackBb = board.blackBb
    this.occupied = board.bb
    this.occupiable = ~board.whiteBb
  }

  attacks (pieceBb, board) {
    this.setContext(board)
    return Direction.rookRays(pieceBb, this.occupied, this.occupiable)
  }

  defends (pieceBb, board) {
    this.setContext(board)
    return Direction.rookRays(pieceBb, this.occupied, board.whiteBb)
  }
}

class BlackRookBoard extends PieceBoard {
  constructor (bb) {
    super()
    this.bb = bb
    this.fenChar = 'r'
  }

  setContext (board) {
    this.whiteKingBb = board.whiteKingBb
    this.whiteQueenBb = board.whiteQueenBb
    this.whiteBb = board.whiteBb
    this.occupied = board.bb
    this.occupiable = ~board.blackBb
  }

  attacks (pieceBb, board) {
    this.setContext(board)
    return Direction.rookRays(pieceBb, this.occupied, this.occupiable)
  }

  defends (pieceBb, board) {
    this.setContext(board)
    return Direction.rookRays(pieceBb, this.occupied, board.blackBb)
  }
}

class WhiteQueenBoard extends PieceBoard {
  constructor (bb) {
    super()
    this.bb = bb
    this.fenChar = 'Q'
  }

  setContext (board) {
    this.occupied = board.bb
    this.occupiable = ~board.whiteBb
    this.blackKingBb = board.blackKingBb
    this.blackBb = board.blackBb
  }

  attacks (pieceBb, board) {
    this.setContext(board)
    return Direction.queenRays(pieceBb, this.occupied, this.occupiable)
  }

  defends (pieceBb, board) {
    this.setContext(board)
    return Direction.queenRays(pieceBb, this.occupied, board.whiteBb)
  }
}

class BlackQueenBoard extends PieceBoard {
  constructor (bb) {
    super()
    this.bb = bb
    this.fenChar = 'q'
  }

  setContext (board) {
    this.occupied = board.bb
    this.occupiable = ~board.blackBb
    this.whiteKingBb = board.whiteKingBb
    this.whiteBb = board.whiteBb
  }

  attacks (pieceBb, board) {
    this.setContext(board)
    return Direction.queenRays(pieceBb, this.occupied, this.occupiable)
  }

  defends (pieceBb, board) {
    this.setContext(board)
    return Direction.queenRays(pieceBb, this.occupied, board.blackBb)
  }
}

class WhiteKingBoard extends PieceBoard {
  constructor (bb) {
    super()
    this.bb = bb
    this.fenChar = 'K'
  }

  setContext (board) {
    this.blackBb = board.blackBb
    this.occupied = board.bb
    this.occupiable = ~board.whiteBb ^ board.whiteKingDangerSquares
    this.whiteRookBb = board.whiteRookBb
    this.castleStatus = board.castleStatus
    this.inCheck = board.sideInCheck
  }

  attacks (pieceBb, board) {
    this.setContext(board)
    return Direction.kingMoves(pieceBb, this.occupied, this.occupiable,
      this.whiteRookBb, this.castleStatus, this.inCheck)
  }

  defends (pieceBb, board) {
    this.setContext(board)
    return Mask.mooreNeighborhood(pieceBb) & board.whiteBb
  }
}

class BlackKingBoard extends PieceBoard {
  constructor (bb) {
    super()
    this.bb = bb
    this.fenChar = 'k'
  }

  setContext (board) {
    this.whiteBb = board.whiteBb
    this.occupied = board.bb
    this.occupiable = ~board.blackBb ^ board.blackKingDangerSquares
    this.blackRookBb = board.blackRookBb
    this.castleStatus = board.castleStatus
    this.inCheck = board.sideInCheck
  }

  attacks (pieceBb, board) {
    this.setContext(board)
    return Direction.kingMoves(pieceBb, this.occupied, this.occupiable,
      this.blackRookBb, this.castleStatus, this.inCheck)
  }

  defends (pieceBb, board) {
    this.setContext(board)
    return Mask.mooreNeighborhood(pieceBb) & board.blackBb
  }
}

class NullPieceBoard {
  constructor () {
    this.bb = U64(0)
  }
}

class PieceBoardList {
  constructor () {
    this.K = PieceBoard.for('K', U64(0))
    this.Q = PieceBoard.for('Q', U64(0))
    this.R = PieceBoard.for('R', U64(0))
    this.B = PieceBoard.for('B', U64(0))
    this.N = PieceBoard.for('N', U64(0))
    this.P = PieceBoard.for('P', U64(0))
    this.k = PieceBoard.for('k', U64(0))
    this.q = PieceBoard.for('q', U64(0))
    this.r = PieceBoard.for('r', U64(0))
    this.b = PieceBoard.for('b', U64(0))
    this.n = PieceBoard.for('n', U64(0))
    this.p = PieceBoard.for('p', U64(0))
  }

  forEach (callback) {
    for (const piece in this) {
      callback(this[piece])
    }
  }

  firstMatch (callback) {
    for (const piece in this) {
      if (callback(this[piece])) {
        return this[piece]
      }
    }
    return new NullPieceBoard()
  }
}

module.exports = {
  PieceBoard: PieceBoard,
  PieceBoardList: PieceBoardList
}
