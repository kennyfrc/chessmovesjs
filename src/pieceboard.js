const BitHelper = require('./helpers.js').BitHelper
const Pieces = require('./pieces.js').Pieces

/**
 * A PieceBoard is a live view of one piece's bitboard inside a Board.
 * setContext() snapshots what a move of this piece needs to describe
 * itself (check, capture, threat).
 */
class PieceBoard {
  static for (fenChar, board) {
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
    return new PieceClass(board, fenChar)
  }

  constructor (board, fenChar) {
    this.board = board
    this.fenChar = fenChar
    this.piece = Pieces.indexFor(fenChar)
  }

  get bb () {
    return this.board.bitboards[this.piece]
  }

  set bb (bb) {
    this.board.setPieceBb(this.piece, bb)
  }
}

class WhitePawnBoard extends PieceBoard {
  setContext (board) {
    this.blackBb = board.blackBb
    this.emptySq = ~board.bb
    this.blackKingBb = board.blackKingBb
    this.blackMinorBb = board.blackMinorBb
    this.blackMajorBb = board.blackMajorBb
    this.epSqIdx = board.epSqIdx
    this.epSqBb = this.epSqIdx === undefined ? 0n : BitHelper.setBit(0n, this.epSqIdx)
    this.occupied = board.bb
    this.occupiable = ~board.whiteBb
  }
}

class BlackPawnBoard extends PieceBoard {
  setContext (board) {
    this.whiteBb = board.whiteBb
    this.emptySq = ~board.bb
    this.whiteKingBb = board.whiteKingBb
    this.whiteMinorBb = board.whiteMinorBb
    this.whiteMajorBb = board.whiteMajorBb
    this.epSqIdx = board.epSqIdx
    this.epSqBb = this.epSqIdx === undefined ? 0n : BitHelper.setBit(0n, this.epSqIdx)
    this.occupied = board.bb
    this.occupiable = ~board.blackBb
  }
}

class WhiteKnightBoard extends PieceBoard {
  setContext (board) {
    this.blackKingBb = board.blackKingBb
    this.blackMajorBb = board.blackMajorBb
    this.blackBb = board.blackBb
  }
}

class BlackKnightBoard extends PieceBoard {
  setContext (board) {
    this.whiteKingBb = board.whiteKingBb
    this.whiteMajorBb = board.whiteMajorBb
    this.whiteBb = board.whiteBb
  }
}

class WhiteBishopBoard extends PieceBoard {
  setContext (board) {
    this.blackKingBb = board.blackKingBb
    this.blackMajorBb = board.blackMajorBb
    this.blackBb = board.blackBb
    this.occupied = board.bb
    this.occupiable = ~board.whiteBb
  }
}

class BlackBishopBoard extends PieceBoard {
  setContext (board) {
    this.whiteKingBb = board.whiteKingBb
    this.whiteMajorBb = board.whiteMajorBb
    this.whiteBb = board.whiteBb
    this.occupied = board.bb
    this.occupiable = ~board.blackBb
  }
}

class WhiteRookBoard extends PieceBoard {
  setContext (board) {
    this.blackKingBb = board.blackKingBb
    this.blackQueenBb = board.blackQueenBb
    this.blackBb = board.blackBb
    this.occupied = board.bb
    this.occupiable = ~board.whiteBb
  }
}

class BlackRookBoard extends PieceBoard {
  setContext (board) {
    this.whiteKingBb = board.whiteKingBb
    this.whiteQueenBb = board.whiteQueenBb
    this.whiteBb = board.whiteBb
    this.occupied = board.bb
    this.occupiable = ~board.blackBb
  }
}

class WhiteQueenBoard extends PieceBoard {
  setContext (board) {
    this.occupied = board.bb
    this.occupiable = ~board.whiteBb
    this.blackKingBb = board.blackKingBb
    this.blackBb = board.blackBb
  }
}

class BlackQueenBoard extends PieceBoard {
  setContext (board) {
    this.occupied = board.bb
    this.occupiable = ~board.blackBb
    this.whiteKingBb = board.whiteKingBb
    this.whiteBb = board.whiteBb
  }
}

class WhiteKingBoard extends PieceBoard {
  setContext (board) {
    this.blackBb = board.blackBb
  }
}

class BlackKingBoard extends PieceBoard {
  setContext (board) {
    this.whiteBb = board.whiteBb
  }
}

class PieceBoardList {
  constructor (board) {
    this.K = PieceBoard.for('K', board)
    this.Q = PieceBoard.for('Q', board)
    this.R = PieceBoard.for('R', board)
    this.B = PieceBoard.for('B', board)
    this.N = PieceBoard.for('N', board)
    this.P = PieceBoard.for('P', board)
    this.k = PieceBoard.for('k', board)
    this.q = PieceBoard.for('q', board)
    this.r = PieceBoard.for('r', board)
    this.b = PieceBoard.for('b', board)
    this.n = PieceBoard.for('n', board)
    this.p = PieceBoard.for('p', board)
  }
}

module.exports = {
  PieceBoard: PieceBoard,
  PieceBoardList: PieceBoardList
}
