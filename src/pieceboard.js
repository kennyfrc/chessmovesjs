const BitHelper = require('./helpers.js').BitHelper;
const BoardHelper = require('./helpers.js').BoardHelper;
const SquareHelper = require('./helpers.js').SquareHelper;
const ViewHelper = require('./helpers.js').ViewHelper;
const Direction = require('./attack.js').Direction;
const MoveList = require('./move.js').MoveList;
const U64 = require('./helpers.js').U64;
const U64Comp = require('./helpers.js').U64Comp;

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
}

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

  canDoublePush(pieceBb, emptySq) {
    emptySq = emptySq;
    return Direction.wDoublePush(pieceBb, emptySq);
  }

  canSinglePush(pieceBb, emptySq) {
    emptySq = emptySq;
    return Direction.wSinglePush(pieceBb, emptySq);
  }

  // TODO: looks like a duplicate for pawns
  // but all pieceboards will be abstracted later
  attacks(pieceBb, blackBb, epSqBb) {
    blackBb = blackBb;
    epSqBb = epSqBb;
    return Direction.wPawnAttacks(pieceBb) & (blackBb | epSqBb);
  }

  attacksBb(pieceBb, epIdx, theirBb, mainBoardBb, theirKingBb, theirMinorBb,
    theirMajorBb) {
    this.blackBb = theirBb;
    this.epSqIdx = epIdx;
    this.mainBoardBb = mainBoardBb;

    this.emptySq = ~this.mainBoardBb;

    this.blackKingBb = theirKingBb;
    this.blackMinorBb = theirMinorBb;
    this.blackMajorBb = theirMajorBb;
    this.epSqBb = this.epSqIdx === undefined ? U64(0) : BitHelper.setBit(U64(0), this.epSqIdx);

    const singlePushBb = this.canSinglePush(pieceBb, this.emptySq);
    const attacks = this.attacks(pieceBb, this.blackBb, this.epSqBb)
    const doublePushBb = this.atSecondRank(pieceBb) ? this.canDoublePush(pieceBb, this.emptySq) : U64(0);
    return singlePushBb | attacks | doublePushBb;
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

  canDoublePush(pieceBb, emptySq) {
    emptySq = emptySq;
    return Direction.bDoublePush(pieceBb, emptySq);
  }

  canSinglePush(pieceBb, emptySq) {
    emptySq = emptySq;
    return Direction.bSinglePush(pieceBb, emptySq);
  }

  attacks(pieceBb, whiteBb, epSqBb) {
    whiteBb = whiteBb;
    epSqBb = epSqBb;
    return Direction.bPawnAttacks(pieceBb) & (whiteBb | epSqBb);
  }

  attacksBb(pieceBb, epIdx, theirBb, mainBoardBb, theirKingBb, theirMinorBb,
    theirMajorBb) {
    this.whiteBb = theirBb;
    this.epSqIdx = epIdx;
    this.mainBoardBb = mainBoardBb;

    this.emptySq = U64(~this.mainBoardBb);

    this.whiteKingBb = theirKingBb;
    this.whiteMinorBb = theirMinorBb;
    this.whiteMajorBb = theirMajorBb;

    this.epSqBb = this.epSqIdx === undefined ? U64(0) : BitHelper.setBit(U64(0), this.epSqIdx);

    const singlePushBb = this.canSinglePush(pieceBb, this.emptySq);
    const attacks = this.attacks(pieceBb, this.whiteBb, this.epSqBb);
    const doublePushBb = this.atSeventhRank(pieceBb) ? this.canDoublePush(pieceBb, this.emptySq) : U64(0);
    return singlePushBb | attacks | doublePushBb;
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

  attacksBb(pieceBb, occupiable, blackKingBb, blackMajorBb, blackBb) {
    this.blackKingBb = blackKingBb;
    this.blackMajorBb = blackMajorBb;
    this.blackBb = blackBb;
    this.occupiable = occupiable;

    return Direction.knightAttacks(pieceBb) & occupiable;
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

  attacksBb(pieceBb, occupiable, whiteKingBb, whiteMajorBb, whiteBb) {
    this.whiteKingBb = whiteKingBb;
    this.whiteMajorBb = whiteMajorBb;
    this.whiteBb = whiteBb;
    this.occupiable = occupiable;

    return Direction.knightAttacks(pieceBb) & occupiable;
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

  attacksBb(pieceBb, occupied, occupiable, blackKingBb, blackMajorBb, blackBb) {
    this.blackKingBb = blackKingBb || this.blackKingBb;
    this.blackMajorBb = blackMajorBb || this.blackMajorBb;
    this.blackBb = blackBb || this.blackBb;
    this.occupied = occupied;
    this.occupiable = occupiable;

    return Direction.bishopRays(pieceBb, occupied, occupiable);
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

  attacksBb(pieceBb, occupied, occupiable, whiteKingBb, whiteMajorBb, whiteBb) {
    this.whiteKingBb = whiteKingBb || this.whiteKingBb;
    this.whiteMajorBb = whiteMajorBb || this.whiteMajorBb;
    this.whiteBb = whiteBb || this.whiteBb;
    this.occupied = occupied;
    this.occupiable = occupiable;

    return Direction.bishopRays(pieceBb, occupied, occupiable);
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

  attacksBb(pieceBb, occupied, occupiable, blackKingBb, blackQueenBb, blackBb) {
    this.blackKingBb = blackKingBb;
    this.blackQueenBb = blackQueenBb;
    this.blackBb = blackBb;
    this.occupied = occupied;
    this.occupiable = occupiable;
    return Direction.rookRays(pieceBb, occupied, occupiable);
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

  attacksBb(pieceBb, occupied, occupiable, whiteKingBb, whiteQueenBb, whiteBb) {
    this.whiteKingBb = whiteKingBb;
    this.whiteQueenBb = whiteQueenBb;
    this.whiteBb = whiteBb;
    this.occupied = occupied;
    this.occupiable = occupiable;
    return Direction.rookRays(pieceBb, occupied, occupiable);
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

  attacksBb(pieceBb, occupied, occupiable, blackKingBb, blackBb) {
    this.occupied = occupied || this.occupied;
    this.occupiable  = occupiable || this.occupiable;
    this.blackKingBb = blackKingBb || this.blackKingBb;
    this.blackBb = blackBb || this.blackBb;

    return Direction.queenRays(pieceBb, occupied, occupiable);
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

  attacksBb(pieceBb, occupied, occupiable, whiteKingBb, whiteBb) {
    this.occupied = occupied || this.occupied;
    this.occupiable  = occupiable || this.occupiable;
    this.whiteKingBb = whiteKingBb || this.whiteKingBb;
    this.whiteBb = whiteBb || this.whiteBb;

    return Direction.queenRays(pieceBb, occupied, occupiable);
  }
}

// does not factor situations where the king is in check
class WhiteKingBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.moveList = [];
    this.moveBb = U64(0);
    this.occupied = U64(0);
    this.occupiable = U64(0);
  }

  attacksBb(pieceBb, occupied, occupiable, myRookBb, castleStatus, blackBb) {
    this.blackBb = blackBb || this.blackBb;
    return Direction.kingMoves(pieceBb, occupied, occupiable, myRookBb, castleStatus);
  }
}

class BlackKingBoard extends PieceBoard {
  constructor(bb) {
    super();
    this.bb = bb;
    this.moveList = [];
    this.moveBb = U64(0);
    this.occupied = U64(0);
    this.occupiable = U64(0);
  }

  attacksBb(pieceBb, occupied, occupiable, myRookBb, castleStatus, whiteBb) {
    this.whiteBb = whiteBb || this.whiteBb;
    return Direction.kingMoves(pieceBb, occupied, occupiable, myRookBb, castleStatus);
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
