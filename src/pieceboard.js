const BitHelper = require('./helpers.js').BitHelper;
const BoardHelper = require('./helpers.js').BoardHelper;
const SquareHelper = require('./helpers.js').SquareHelper;
const Direction = require('./move.js').Direction;
const MoveList = require('./move.js').MoveList;

class PieceBoard {
  static for(fenChar, pieceBit) {
    let PieceClass;
    switch (fenChar) {
      case 'k':
        PieceClass = BlackKingBoard;
        break;
      case 'q':
        PieceClass = BlackQueenBoard;
        break;
      case 'r':
        PieceClass = BlackRookBoard;
        break;
      case 'b':
        PieceClass = BlackBishopBoard;
        break;
      case 'n':
        PieceClass = BlackKnightBoard;
        break;
      case 'p':
        PieceClass = BlackPawnBoard;
        break;
      case 'K':
        PieceClass = WhiteKingBoard;
        break;
      case 'Q':
        PieceClass = WhiteQueenBoard;
        break;
      case 'R':
        PieceClass = WhiteRookBoard;
        break;
      case 'B':
        PieceClass = WhiteBishopBoard;
        break;
      case 'N':
        PieceClass = WhiteKnightBoard;
        break;
      case 'P':
        PieceClass = WhitePawnBoard;
        break;
    }
    return new PieceClass(pieceBit);
  }

  on(board) {
    this.mainBoardBb = board.bb;
    this.whiteBb = board.whiteBb;
    this.blackBb = board.blackBb;
    this.whiteKingBb = board.whiteKingBb;
    this.blackKingBb = board.blackKingBb;
    this.whiteMinorBb = board.whiteMinorBb;
    this.blackMinorBb = board.blackMinorBb;
    this.whiteMajorBb = board.whiteMajorBb;
    this.blackMajorBb = board.blackMajorBb;
  }

  makeMoveList(fenChar) {
    const moveList = [];
    SquareHelper.indicesFor(this.bb).forEach((fromIdx) => {
      const pieceBb = BitHelper.setBit(BigInt(0), fromIdx);
      const toIdxs = SquareHelper.indicesFor(this.generateMoves(pieceBb));
      moveList.push(MoveList.for(fenChar, fromIdx, toIdxs, this));
    });

    return moveList.flat();
  }
}

// TODO: movegen for pawn using MoveClass
// en passant, king in check, etc
class WhitePawnBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.moveList = [];
    this.moveBb = BigInt(0);
    this.emptySq = BigInt(0);
  }

  atSecondRank(pieceBb) {
    return pieceBb & BoardHelper.secondRank();
  }

  canDoublePush(pieceBb) {
    return Direction.wDoublePush(pieceBb, this.emptySq);
  }

  canSinglePush(pieceBb) {
    return Direction.wSinglePush(pieceBb, this.emptySq);
  }

  pawnAttacks(pieceBb) {
    return Direction.wPawnAttacks(pieceBb) & this.whiteBb;
  }

  generateMoves(pieceBb) {    
    this.moveBb = BigInt(0);
    this.moveBb |= this.canSinglePush(pieceBb) | this.pawnAttacks(pieceBb);
    if (this.atSecondRank(pieceBb)) {
      this.moveBb |= this.canDoublePush(pieceBb);
    } 
    return this.moveBb;
  }

  moves() {
    this.emptySq = ~this.mainBoardBb;
    this.moveList = this.makeMoveList('P');
    return this.moveList;
  }
}

class BlackPawnBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.moveList = [];
    this.moveBb = BigInt(0);
    this.emptySq = BigInt(0);
  }

  atSeventhRank(pieceBb) {
    return pieceBb & BoardHelper.seventhRank();
  }

  canDoublePush(pieceBb) {
    return Direction.bDoublePush(pieceBb, this.emptySq);
  }

  canSinglePush(pieceBb) {
    return Direction.bSinglePush(pieceBb, this.emptySq);
  }

  pawnAttacks(pieceBb) {
    return Direction.bPawnAttacks(pieceBb) & this.whiteBb;
  }

  generateMoves(pieceBb) {    
    this.moveBb = BigInt(0);
    this.moveBb |= this.canSinglePush(pieceBb) | this.pawnAttacks(pieceBb);
    if (this.atSeventhRank(pieceBb)) {
      this.moveBb |= this.canDoublePush(pieceBb);
    } 
    return this.moveBb;
  }

  moves() {
    this.emptySq = ~this.mainBoardBb;
    this.moveList = this.makeMoveList('p');
    return this.moveList;
  }
}

class WhiteKnightBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.moveList = [];
  }

  generateMoves(pieceBb) {

  }

  moves() {
    this.moveList = this.makeMoveList('N');
    return this.moveList;
  }
}

class WhiteBishopBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.moveList = [];
  }
}

class WhiteRookBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
  }
}

class WhiteQueenBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
  }
}

class WhiteKingBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
  }
}

class BlackKnightBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
  }
}

class BlackBishopBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
  }
}

class BlackRookBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
  }
}

class BlackQueenBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
  }
}

class BlackKingBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
  }
}

class PieceBoardList {
  constructor() {
    this.K = PieceBoard.for('K', BigInt(0));
    this.Q = PieceBoard.for('Q', BigInt(0));
    this.R = PieceBoard.for('R', BigInt(0));
    this.B = PieceBoard.for('B', BigInt(0));
    this.N = PieceBoard.for('N', BigInt(0));
    this.P = PieceBoard.for('P', BigInt(0));
    this.k = PieceBoard.for('k', BigInt(0));
    this.q = PieceBoard.for('q', BigInt(0));
    this.r = PieceBoard.for('r', BigInt(0));
    this.b = PieceBoard.for('b', BigInt(0));
    this.n = PieceBoard.for('n', BigInt(0));
    this.p = PieceBoard.for('p', BigInt(0));
  }
}

module.exports = {
  PieceBoard: PieceBoard,
  PieceBoardList: PieceBoardList,
};
