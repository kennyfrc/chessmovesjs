const Board = require('./board.js').Board;
const BitHelper = require('./helpers.js').BitHelper;
const BoardHelper = require('./helpers.js').BoardHelper;
const Square = require('./square.js').Square;

class PieceBoard {
  static for(fenChar, pieceBit, parent) {
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
    return new PieceClass(pieceBit, parent);
  }

  getBlackBb() {
    let blackBb = BigInt(0)
    for (const [key, pieceBoard] of Object.entries(this.mainBoard.pieceBoardList)) {
      if ('kqrbnp'.includes(key)) {
        blackBb |= pieceBoard.bb;
      }
    }
    return blackBb;
  }

  getWhiteBb() {
    let whiteBb = BigInt(0)
    for (const [key, pieceBoard] of Object.entries(this.mainBoard.pieceBoardList)) {
      if ('KQRBNP'.includes(key)) {
        whiteBb |= pieceBoard.bb;
      }
    }
    return whiteBb;
  }

  getBlackKingBb() {
    return this.mainBoard.pieceBoardList.k.bb
  }

  getWhiteKingBb() {
    return this.mainBoard.pieceBoardList.K.bb
  }
}

class MoveList {
  static for(fenChar, fromIdx, toIdxs, pieceBoard) {
    const moveList = [];
    toIdxs.forEach((toIdx) => {
      moveList.push(Move.for(fenChar, fromIdx, toIdx, pieceBoard));
    });
    return moveList;
  }
}

class Move {
  static for(fenChar, fromIdx, toIdx, pieceBoard) {
    let MoveClass;
    switch(fenChar) {
      case 'P':
        MoveClass = WhitePawnMove;
        break;
      case 'p':
        MoveClass = BlackPawnMove;
        break;
    }
    return new MoveClass(fromIdx, toIdx, pieceBoard);
  }
}

class WhitePawnMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.pieceBoard = pieceBoard;
    this.check = this.isCheck(toIdx);
    this.capture = this.isCapture(toIdx);
    this.pieceBoard = BigInt(0); // reset it for memory?
  }

  isCheck(toIdx) {
    let pieceBb = BitHelper.setBit(BigInt(0), BigInt(toIdx));
    return ((Direction.wPawnAttacks(pieceBb) & this.pieceBoard.getBlackKingBb()) == BigInt(0) ? false : true);
  }

  isCapture(toIdx) {
    let pieceBb = BitHelper.setBit(BigInt(0), BigInt(toIdx));
    return ((pieceBb & this.pieceBoard.getBlackBb()) == BigInt(0) ? false : true );
  }
}

class BlackPawnMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.pieceBoard = pieceBoard;
    this.check = this.isCheck(toIdx);
    this.capture = this.isCapture(toIdx);
    this.pieceBoard = BigInt(0); // reset it for memory?
  }

  isCheck(toIdx) {
    let pieceBb = BitHelper.setBit(BigInt(0), BigInt(toIdx));
    return ((Direction.bPawnAttacks(pieceBb) & this.pieceBoard.getWhiteKingBb()) == BigInt(0) ? false : true);
  }

  isCapture(toIdx) {
    let pieceBb = BitHelper.setBit(BigInt(0), BigInt(toIdx));
    return ((pieceBb & this.pieceBoard.getWhiteBb()) == BigInt(0) ? false : true );
  }
}


// TODO: movegen for pawn using MoveClass
// en passant, king in check, etc
class WhitePawnBoard extends PieceBoard {
  constructor(bb, parent) {
    super();
    this.bb = bb;
    this.moveList = [];
    this.mainBoard = parent;
    this.moveBb;
  }

  generateMoves(pieceBb) {
    let pawnMoves = BigInt(0);
    const emptySq = ~this.mainBoard.bb;
    // start pos parsing
    if (pieceBb & BoardHelper.secondRank()) {
      pawnMoves |= Direction.wSinglePush(pieceBb, emptySq) | 
        Direction.wDoublePush(pieceBb, emptySq);
    } else {
      pawnMoves |= Direction.wSinglePush(pieceBb, emptySq);
    }
    // attack parsing
    pawnMoves |= (Direction.wPawnAttacks(pieceBb) & this.getBlackBb());
    return pawnMoves;
  }

  moves() {
    Square.indicesFor(this.bb).forEach((fromIdx) => {
      let pieceBb = BitHelper.setBit(BigInt(0), fromIdx);
      const toIdxs = Square.indicesFor(this.generateMoves(pieceBb));
      this.moveList.push(MoveList.for('P', fromIdx, toIdxs, this));
    });

    return this.moveList.flat();
  }
}

class BlackPawnBoard extends PieceBoard {
  constructor(bb, parent) {
    super();
    this.bb = bb;
    this.moveList = [];
    this.mainBoard = parent;
    this.moveBb;
  }

  generateMoves(pieceBb) {
    let pawnMoves = BigInt(0);
    const emptySq = ~this.mainBoard.bb;
    // start pos parsing
    if (pieceBb & BoardHelper.secondRank()) {
      pawnMoves |= Direction.bSinglePush(pieceBb, emptySq) | 
        Direction.wDoublePush(pieceBb, emptySq);
    } else {
      pawnMoves |= Direction.bSinglePush(pieceBb, emptySq);
    }
    // attack parsing
    pawnMoves |= (Direction.bPawnAttacks(pieceBb) & this.getWhiteBb());
    return pawnMoves;
  }

  moves() {
    Square.indicesFor(this.bb).forEach((fromIdx) => {
      let pieceBb = BitHelper.setBit(BigInt(0), fromIdx);
      const toIdxs = Square.indicesFor(this.generateMoves(pieceBb));
      this.moveList.push(MoveList.for('p', fromIdx, toIdxs, this));
    });

    return this.moveList.flat();
  }
}

class WhiteKnightBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.pbList;
  }
}

class WhiteBishopBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.pbList;
  }
}

class WhiteRookBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.pbList;
  }
}

class WhiteQueenBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.pbList;
  }
}

class WhiteKingBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.pbList;
  }
}

class BlackKnightBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.pbList;
  }
}

class BlackBishopBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.pbList;
  }
}

class BlackRookBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.pbList;
  }
}

class BlackQueenBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.pbList;
  }
}

class BlackKingBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.pbList;
  }
}

class Direction {
  static wSinglePush(bb, emptySq) {
    return Compass.northOne(bb) & emptySq;
  }

  static wDoublePush(bb, emptySq) {
    const singlePushBb = this.wSinglePush(bb, emptySq);
    return Compass.northOne(singlePushBb) & emptySq & BoardHelper.fourthRank();
  }

  static bSinglePush(bb, emptySq) {
    return Compass.southOne(bb) & emptySq;
  }

  static bDoublePush(bb, emptySq) {
    const singlePushBb = this.bSinglePush(bb, emptySq);
    return Compass.southOne(singlePushBb) & emptySq & BoardHelper.fifthRank();
  }

  static wPawnAttacks(bb) {
    return ( Compass.northWestOne(bb & ~BoardHelper.aFile()) |
     Compass.northEastOne(bb & ~BoardHelper.hFile()) );
  }

  static bPawnAttacks(bb) {
    return ( Compass.southWestOne(bb & ~BoardHelper.aFile()) |
     Compass.southEastOne(bb & ~BoardHelper.hFile()) );
  }
}

class Compass {
  static northOne(bb) {
    return bb << BigInt(8);
  }

  static northEastOne(bb) {
    return bb << BigInt(9);
  }

  static eastOne(bb) {
    return bb << BigInt(1);
  }

  static southEastOne(bb) {
    return bb >> BigInt(7);
  }

  static southOne(bb) {
    return bb >> BigInt(8);
  }

  static southWestOne(bb) {
    return bb >> BigInt(9);
  }

  static westOne(bb) {
    return bb >> BigInt(1);
  }

  static northWestOne(bb) {
    return bb << BigInt(7);
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

class ViewHelper {
  static display(bb, message) {
    const bbToView = bb;
    const userView = [];
    for (let i = 0; i < 64; i++) {
      userView[i] = BitHelper.getBit(bbToView, i);
    }

    console.log(`=BEGIN ${message}` + '\n' +
      userView[Square.for('A8')] + userView[Square.for('B8')] +
      userView[Square.for('C8')] + userView[Square.for('D8')] +
      userView[Square.for('E8')] + userView[Square.for('F8')] +
      userView[Square.for('G8')] + userView[Square.for('H8')] + '\n' +
      userView[Square.for('A7')] + userView[Square.for('B7')] +
      userView[Square.for('C7')] + userView[Square.for('D7')] +
      userView[Square.for('E7')] + userView[Square.for('F7')] +
      userView[Square.for('G7')] + userView[Square.for('H7')] + '\n' +
      userView[Square.for('A6')] + userView[Square.for('B6')] +
      userView[Square.for('C6')] + userView[Square.for('D6')] +
      userView[Square.for('E6')] + userView[Square.for('F6')] +
      userView[Square.for('G6')] + userView[Square.for('H6')] + '\n' +
      userView[Square.for('A5')] + userView[Square.for('B5')] +
      userView[Square.for('C5')] + userView[Square.for('D5')] +
      userView[Square.for('E5')] + userView[Square.for('F5')] +
      userView[Square.for('G5')] + userView[Square.for('H5')] + '\n' +
      userView[Square.for('A4')] + userView[Square.for('B4')] +
      userView[Square.for('C4')] + userView[Square.for('D4')] +
      userView[Square.for('E4')] + userView[Square.for('F4')] +
      userView[Square.for('G4')] + userView[Square.for('H4')] + '\n' +
      userView[Square.for('A3')] + userView[Square.for('B3')] +
      userView[Square.for('C3')] + userView[Square.for('D3')] +
      userView[Square.for('E3')] + userView[Square.for('F3')] +
      userView[Square.for('G3')] + userView[Square.for('H3')] + '\n' +
      userView[Square.for('A2')] + userView[Square.for('B2')] +
      userView[Square.for('C2')] + userView[Square.for('D2')] +
      userView[Square.for('E2')] + userView[Square.for('F2')] +
      userView[Square.for('G2')] + userView[Square.for('H2')] + '\n' +
      userView[Square.for('A1')] + userView[Square.for('B1')] +
      userView[Square.for('C1')] + userView[Square.for('D1')] +
      userView[Square.for('E1')] + userView[Square.for('F1')] +
      userView[Square.for('G1')] + userView[Square.for('H1')] + '\n' +
      '=END');
  }
}

module.exports = {
  PieceBoard: PieceBoard,
  PieceBoardList: PieceBoardList,
  ViewHelper: ViewHelper,
};