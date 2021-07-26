const BitHelper = require('./helpers.js').BitHelper;
const BoardHelper = require('./helpers.js').BoardHelper;
const SquareHelper = require('./helpers.js').SquareHelper;
const ViewHelper = require('./helpers.js').ViewHelper;
const Direction = require('./move.js').Direction;
const MoveList = require('./move.js').MoveList;
const U64 = require('./helpers.js').U64;

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
    this.whiteQueenBb = board.whiteQueenBb;
    this.blackQueenBb = board.blackQueenBb;
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
      const pieceBb = BitHelper.setBit(U64(0), fromIdx);
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
    this.moveBb = U64(0);
    this.emptySq = U64(0);
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
    this.moveBb = U64(0);
    this.moveBb = this.canSinglePush(pieceBb) | this.pawnAttacks(pieceBb);
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
    this.moveBb = U64(0);
    this.emptySq = U64(0);
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
    this.moveBb = U64(0);
    this.moveBb = this.canSinglePush(pieceBb) | this.pawnAttacks(pieceBb);
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
    this.moveBb = U64(0);
    this.occupiable = U64(0);
  }

  knightAttacks(pieceBb) {
    return Direction.knightAttacks(pieceBb) & this.occupiable;
  }

  generateMoves(pieceBb) {
    this.moveBb = U64(0);
    this.moveBb = this.knightAttacks(pieceBb);
    
    return this.moveBb;
  }

  moves() {
    this.occupiable = ~this.whiteBb;
    this.moveList = this.makeMoveList('N');
    return this.moveList;
  }
}

class BlackKnightBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.moveList = [];
    this.moveBb = U64(0);
    this.occupiable = U64(0);
  }

  knightAttacks(pieceBb) {
    return Direction.knightAttacks(pieceBb) & this.occupiable;
  }

  generateMoves(pieceBb) {
    this.moveBb = U64(0);
    this.moveBb = this.knightAttacks(pieceBb);
    return this.moveBb;
  }

  moves() {
    this.occupiable = ~this.blackBb;
    this.moveList = this.makeMoveList('n');
    return this.moveList;
  }
}

class WhiteBishopBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.moveList = [];
    this.moveBb = U64(0);
    this.occupied = U64(0);
    this.occupiable = U64(0);
  }

  bishopAttacks(sq, occupied, occupiable) {
    return Direction.bishopRays(sq, occupied, occupiable);
  }

  generateMoves(pieceBb) {
    this.moveBb = U64(0);
    let sq = SquareHelper.indicesFor(pieceBb);
    this.moveBb = this.bishopAttacks(sq, this.occupied, this.occupiable);
    return this.moveBb;
  }

  moves() {
    this.occupied = this.mainBoardBb;
    this.occupiable = ~this.whiteBb;
    this.moveList = this.makeMoveList('B');
    return this.moveList;
  }
}

class BlackBishopBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.moveList = [];
    this.moveBb = U64(0);
    this.occupied = U64(0);
    this.occupiable = U64(0);
  }

  bishopAttacks(sq, occupied, occupiable) {
    return Direction.bishopRays(sq, occupied, occupiable);
  }

  generateMoves(pieceBb) {
    this.moveBb = U64(0);
    let sq = SquareHelper.indicesFor(pieceBb);
    this.moveBb = this.bishopAttacks(sq, this.occupied, this.occupiable);
    return this.moveBb;
  }

  moves() {
    this.occupied = this.mainBoardBb;
    this.occupiable = ~this.blackBb;
    this.moveList = this.makeMoveList('b');
    return this.moveList;
  }
}

class WhiteRookBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.moveList = [];
    this.moveBb = U64(0);
    this.occupied = U64(0);
    this.occupiable = U64(0);
  }

  rookAttacks(sq, occupied, occupiable) {
    return Direction.rookRays(sq, occupied, occupiable);
  }

  generateMoves(pieceBb) {
    this.moveBb = U64(0);
    let sq = SquareHelper.indicesFor(pieceBb);
    this.moveBb = this.rookAttacks(sq, this.occupied, this.occupiable);
    return this.moveBb;
  }

  moves() {
    this.occupied = this.mainBoardBb;
    this.occupiable = ~this.whiteBb;
    this.moveList = this.makeMoveList('R');
    return this.moveList;
  }
}

class BlackRookBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.moveBb = U64(0);
    this.occupied = U64(0);
    this.occupiable = U64(0);
  }

  rookAttacks(sq, occupied, occupiable) {
    return Direction.rookRays(sq, occupied, occupiable);
  }

  generateMoves(pieceBb) {
    this.moveBb = U64(0);
    let sq = SquareHelper.indicesFor(pieceBb);
    this.moveBb = this.rookAttacks(sq, this.occupied, this.occupiable);
    return this.moveBb;
  }

  moves() {
    this.occupied = this.mainBoardBb;
    this.occupiable = ~this.blackBb;
    this.moveList = this.makeMoveList('r');
    return this.moveList;
  }
}

class WhiteQueenBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.moveList = [];
    this.moveBb = U64(0);
    this.occupied = U64(0);
    this.occupiable = U64(0);
  }

  queenAttacks(sq, occupied, occupiable) {
    return Direction.queenRays(sq, occupied, occupiable);
  }

  generateMoves(pieceBb) {
    this.moveBb = U64(0);
    let sq = SquareHelper.indicesFor(pieceBb);
    this.moveBb = this.queenAttacks(sq, this.occupied, this.occupiable);
    return this.moveBb;
  }

  moves() {
    this.occupied = this.mainBoardBb;
    this.occupiable = ~this.whiteBb;
    this.moveList = this.makeMoveList('Q');
    return this.moveList;
  }
}

class BlackQueenBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.moveList = [];
    this.moveBb = U64(0);
    this.occupied = U64(0);
    this.occupiable = U64(0);
  }

  queenAttacks(sq, occupied, occupiable) {
    return Direction.queenRays(sq, occupied, occupiable);
  }

  generateMoves(pieceBb) {
    this.moveBb = U64(0);
    let sq = SquareHelper.indicesFor(pieceBb);
    this.moveBb = this.queenAttacks(sq, this.occupied, this.occupiable);
    return this.moveBb;
  }

  moves() {
    this.occupied = this.mainBoardBb;
    this.occupiable = ~this.blackBb;
    this.moveList = this.makeMoveList('q');
    return this.moveList;
  }
}

// does not factor situations where the king is in check
class WhiteKingBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.moveList = [];
    this.moveBb = U64(0);
    this.occupiable = U64(0);
  }

  kingAttacks(sq, occupiable) {
    return Direction.kingMoves(sq, occupiable);
  }

  generateMoves(pieceBb) {
    this.moveBb = U64(0);
    this.moveBb = this.kingAttacks(pieceBb, this.occupiable);
    return this.moveBb;
  }

  moves() {
   this.occupiable = ~this.whiteBb;
   this.moveList = this.makeMoveList('K');
   return this.moveList;
  }
}

class BlackKingBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.moveList = [];
    this.moveBb = U64(0);
    this.occupiable = U64(0);
  }

  kingAttacks(sq, occupiable) {
    return Direction.kingMoves(sq, occupiable);
  }

  generateMoves(pieceBb) {
    this.moveBb = U64(0);
    this.moveBb = this.kingAttacks(pieceBb, this.occupiable);
    return this.moveBb;
  }

  moves() {
   this.occupiable = ~this.blackBb;
   this.moveList = this.makeMoveList('k');
   return this.moveList;
  }
}

class PieceBoardList {
  constructor() {
    this.K = PieceBoard.for('K', U64(0));
    this.Q = PieceBoard.for('Q', U64(0));
    this.R = PieceBoard.for('R', U64(0));
    this.B = PieceBoard.for('B', U64(0));
    this.N = PieceBoard.for('N', U64(0));
    this.P = PieceBoard.for('P', U64(0));
    this.k = PieceBoard.for('k', U64(0));
    this.q = PieceBoard.for('q', U64(0));
    this.r = PieceBoard.for('r', U64(0));
    this.b = PieceBoard.for('b', U64(0));
    this.n = PieceBoard.for('n', U64(0));
    this.p = PieceBoard.for('p', U64(0));
  }
}

module.exports = {
  PieceBoard: PieceBoard,
  PieceBoardList: PieceBoardList,
};
