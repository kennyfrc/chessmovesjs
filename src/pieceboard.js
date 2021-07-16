const BitHelper = require('./helpers.js').BitHelper;
const BoardHelper = require('./helpers.js').BoardHelper;
const Board = require('./board.js').Board;

class PieceBoard {
  constructor(pieceBit) {
    this.bb = pieceBit || BigInt(0);
    this.mainBoard;
  }

  static for(fenChar, fenIndex) {
    let PieceClass;
    if ('rR'.includes(fenChar)) {
      PieceClass = RookBoard;
    }
    if ('pP'.includes(fenChar)) {
      PieceClass = PawnBoard;
    }

    return new PieceClass(BigInt(0), fenIndex);
  }

  on(board) {
    this.mainBoard = board;
    return this
  }
}

class RookBoard extends PieceBoard {
  constructor(bb, fenIndex) {
    super();
    this.bb = BitHelper.setBit(bb, fenIndex);
  }
}

class PawnBoard extends PieceBoard {
  constructor(bb, fenIndex, fenChar) {
    super();
    this.bb = BitHelper.setBit(bb, fenIndex);
    this.fenChar = fenChar;
  }

  moves() {
    if (!(this.bb & BoardHelper.hFile())) {
      if (this.bb & BoardHelper.secondRank()) {
        return Attacks.wSinglePush(this) | Attacks.wDoublePUsh(this)
      } else {
        return Attacks.wSinglePush(this)
      }
    }
  }
}

class Attacks {
  static wSinglePush(pawnBoard) {
    return Attacks.northOne(pawnBoard.bb) & ~pawnBoard.mainBoard;
  }

  static wDoublePUsh(pawnBoard) {
    const singlePushBb = this.wSinglePush(pawnBoard);
    return Attacks.northOne(singlePushBb) & ~pawnBoard.mainBoard & BoardHelper.fourthRank();
  }

  static northOne(bb) {
    return bb << BigInt(8);
  }
}

class PieceBoardList {
  constructor() {
    this.K = new PieceBoard()
    this.Q = new PieceBoard()
    this.R = new PieceBoard()
    this.B = new PieceBoard()
    this.N = new PieceBoard()
    this.P = new PieceBoard()
    this.k = new PieceBoard()
    this.q = new PieceBoard()
    this.r = new PieceBoard()
    this.b = new PieceBoard()
    this.n = new PieceBoard()
    this.p = new PieceBoard()
  }
}

// class RookBoard {
//   constructor(fenIndex) {
//     this.fenIndex = fenIndex;
//   }
// }

// class Attack {
//   static northFill(bb) {
//     bb |= (bb << BigInt(8));
//     bb |= (bb << BigInt(16));
//     bb |= (bb << BigInt(32));
//     return bb;
//   }
// }

// Pawn.moves(idx)

module.exports = {
  PieceBoard: PieceBoard,
  PieceBoardList: PieceBoardList,
};
