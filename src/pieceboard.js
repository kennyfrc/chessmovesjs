const BitHelper = require('./helpers.js').BitHelper;
const BoardHelper = require('./helpers.js').BoardHelper;
const Square = require('./square.js').Square;

class PieceBoard {
  constructor() {
    this.mainBb;
    this.whiteBbContext;
    this.blackBbContext;
  }

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
}

class WhitePawnBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
  }

  moves() {
    let pawnMoves = BigInt(0);
    // start pos parsing
    if (this.bb & BoardHelper.secondRank()) {
      pawnMoves |= Moves.wSinglePush(this) | Moves.wDoublePush(this);
    } else {
      pawnMoves |= Moves.wSinglePush(this);
    }
    // attack parsing
    pawnMoves |= (Moves.wPawnAttacks(this.bb) & this.blackBbContext);
    return pawnMoves;
  }
}

class WhiteKnightBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
  }
}

class WhiteBishopBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
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

class BlackPawnBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
  }

  moves() {
    let pawnMoves = BigInt(0);
    // start pos parsing
    if (this.bb & BoardHelper.seventhRank()) {
      pawnMoves |= Moves.bSinglePush(this) | Moves.bDoublePush(this);
    } else {
      pawnMoves |= Moves.bSinglePush(this);
    }
    // attack parsing
    pawnMoves |= (Moves.bPawnAttacks(this.bb) & this.whiteBbContext);
    return pawnMoves;
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

class Moves {
  static wSinglePush(pawnBoard) {
    return Compass.northOne(pawnBoard.bb) & ~pawnBoard.mainBb;
  }

  static wDoublePush(pawnBoard) {
    const singlePushBb = this.wSinglePush(pawnBoard);
    return Compass.northOne(singlePushBb) & ~pawnBoard.mainBb & BoardHelper.fourthRank();
  }

  static bSinglePush(pawnBoard) {
    return Compass.southOne(pawnBoard.bb) & ~pawnBoard.mainBb;
  }

  static bDoublePush(pawnBoard) {
    const singlePushBb = this.bSinglePush(pawnBoard);
    return Compass.southOne(singlePushBb) & ~pawnBoard.mainBb & BoardHelper.fifthRank();
  }

  static wPawnAttacks(pawnBoard) {
    return ( Compass.northWestOne(pawnBoard & ~BoardHelper.aFile()) |
     Compass.northEastOne(pawnBoard & ~BoardHelper.hFile()) );
  }

  static bPawnAttacks(pawnBoard) {
    return ( Compass.southWestOne(pawnBoard & ~BoardHelper.aFile()) |
     Compass.southEastOne(pawnBoard & ~BoardHelper.hFile()) );
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

  static merge(whitePieceBoardList, blackPieceBoardList) {
    const pieceBoardList = new PieceBoardList();
    const whiteKeys = ['K', 'Q', 'R', 'B', 'N', 'P'];
    const blackKeys = ['k', 'q', 'r', 'b', 'n', 'p'];

    whiteKeys.forEach((wKey) => {
      pieceBoardList[wKey] = whitePieceBoardList[wKey];
    });
    blackKeys.forEach((bKey) => {
      pieceBoardList[bKey] = blackPieceBoardList[bKey];
    });

    return pieceBoardList;
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
  ViewHelper: ViewHelper,
};
