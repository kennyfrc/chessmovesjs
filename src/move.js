const BitHelper = require('./helpers.js').BitHelper;
const BoardHelper = require('./helpers.js').BoardHelper;
const SquareHelper = require('./helpers.js').SquareHelper;
const ViewHelper = require('./helpers.js').ViewHelper;
const U64 = require('./helpers.js').U64;
const U64Comp = require('./helpers.js').U64Comp;
const U64Neg = require('./helpers.js').U64Neg;
const Ray = require('./attack.js').Ray;
const Direction = require('./attack.js').Direction;
const Mask = require('./mask.js').Mask;

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
    switch (fenChar) {
      case 'P':
        MoveClass = WhitePawnMove;
        break;
      case 'p':
        MoveClass = BlackPawnMove;
        break;
      case 'N':
        MoveClass = WhiteKnightMove;
        break;
      case 'n':
        MoveClass = BlackKnightMove;
        break;
      case 'B':
        MoveClass = WhiteBishopMove;
        break;
      case 'b':
        MoveClass = BlackBishopMove;
        break;
      case 'R':
        MoveClass = WhiteRookMove;
        break;
      case 'r':
        MoveClass = BlackRookMove;
        break;
      case 'Q':
        MoveClass = WhiteQueenMove;
        break;
      case 'q':
        MoveClass = BlackQueenMove;
        break;
      case 'K':
        MoveClass = WhiteKingMove;
        break;
      case 'k':
        MoveClass = BlackKingMove;
        break;
    }
    return new MoveClass(fromIdx, toIdx, pieceBoard);
  }
}

class WhitePawnMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.ep = false;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.threat = this.isThreat(toIdx, pieceBoard);
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((Direction.wPawnAttacks(pieceBb) & pieceBoard.blackKingBb) ===
      U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    const capOrEp = pieceBb & (pieceBoard.blackBb | pieceBoard.epSqBb);
    const enPassant = pieceBb & pieceBoard.epSqBb;
    this.ep = enPassant === U64(0) ? false : true;
    return (capOrEp === U64(0) ? false : true );
  }

  isThreat(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return (Direction.wPawnAttacks(pieceBb) & (pieceBoard.blackMinorBb |
      pieceBoard.blackMajorBb)) === U64(0) ? false : true;
  }
}

class BlackPawnMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.ep = false;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.threat = this.isThreat(toIdx, pieceBoard);
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((Direction.bPawnAttacks(pieceBb) & pieceBoard.whiteKingBb) ===
      U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    const capOrEp = pieceBb & (pieceBoard.whiteBb | pieceBoard.epSqBb);
    const enPassant = pieceBb & pieceBoard.epSqBb;
    this.ep = enPassant === U64(0) ? false : true;
    return (capOrEp === U64(0) ? false : true );
  }

  isThreat(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return (Direction.bPawnAttacks(pieceBb) & (pieceBoard.whiteMinorBb |
      pieceBoard.whiteMajorBb)) === U64(0) ? false : true;
  }
}

class WhiteKnightMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.threat = this.isThreat(toIdx, pieceBoard);
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((Direction.knightAttacks(pieceBb) & pieceBoard.blackKingBb) ===
      U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.blackBb) === U64(0) ? false : true );
  }

  isThreat(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return (Direction.knightAttacks(pieceBb) & pieceBoard.blackMajorBb) ===
      U64(0) ? false : true;
  }
}

class BlackKnightMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.threat = this.isThreat(toIdx, pieceBoard);
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((Direction.knightAttacks(pieceBb) & pieceBoard.whiteKingBb) ===
      U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.whiteBb) === U64(0) ? false : true );
  }

  isThreat(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return (Direction.knightAttacks(pieceBb) & pieceBoard.whiteMajorBb) ===
      U64(0) ? false : true;
  }
}

class WhiteBishopMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.threat = this.isThreat(toIdx, pieceBoard);
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((Direction.bishopRays(pieceBb, pieceBoard.occupied, pieceBoard.occupiable) &
        pieceBoard.blackKingBb) === U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.blackBb) === U64(0) ? false : true );
  }

  isThreat(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    // ViewHelper.display(pieceBoard.occupied, 'pieceBoard.occupied')
    return (Direction.bishopRays(pieceBb, pieceBoard.occupied, pieceBoard.occupiable) &
        pieceBoard.blackMajorBb) === U64(0) ? false : true;
  }
}

class BlackBishopMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.threat = this.isThreat(toIdx, pieceBoard);
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((Direction.bishopRays(pieceBb, pieceBoard.occupied, pieceBoard.occupiable) &
      pieceBoard.whiteKingBb) === U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.whiteBb) === U64(0) ? false : true );
  }

  isThreat(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return (Direction.bishopRays(pieceBb, pieceBoard.occupied, pieceBoard.occupiable) &
      pieceBoard.whiteMajorBb) === U64(0) ? false : true;
  }
}

class WhiteRookMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.threat = this.isThreat(toIdx, pieceBoard);
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((Direction.rookRays(pieceBb, pieceBoard.occupied, pieceBoard.occupiable) &
          pieceBoard.blackKingBb) === U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.blackBb) === U64(0) ? false : true );
  }

  isThreat(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return (Direction.rookRays(pieceBb, pieceBoard.occupied, pieceBoard.occupiable) &
      pieceBoard.blackQueenBb) === U64(0) ? false : true;
  }
}

class BlackRookMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.threat = this.isThreat(toIdx, pieceBoard);
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((Direction.rookRays(pieceBb, pieceBoard.occupied, pieceBoard.occupiable) &
          pieceBoard.whiteKingBb) === U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.whiteBb) === U64(0) ? false : true );
  }

  isThreat(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return (Direction.rookRays(pieceBb, pieceBoard.occupied, pieceBoard.occupiable) &
      pieceBoard.whiteQueenBb) === U64(0) ? false : true;
  }
}

class WhiteQueenMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.threat = false;
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((Direction.queenRays(pieceBb, pieceBoard.occupied, pieceBoard.occupiable) &
          pieceBoard.blackKingBb) === U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.blackBb) === U64(0) ? false : true );
  }
}

class BlackQueenMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.to = toIdx;
    this.from = fromIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.threat = false;
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((Direction.queenRays(pieceBb, pieceBoard.occupied, pieceBoard.occupiable) &
          pieceBoard.whiteKingBb) === U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.whiteBb) === U64(0) ? false : true );
  }
}

class WhiteKingMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.castle = this.isCastle(fromIdx, toIdx);
    this.check = false;
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.threat = false;
  }

  // TODO: isCheck for castling with rook
  // TODO: isThreat for threats against other pawns / pieces

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.blackBb) === U64(0) ? false : true );
  }

  isCastle(fromIdx, toIdx) {
    const difference = toIdx - fromIdx;
    return (difference == 2 || difference == -2) ? true : false;
  }
}

class BlackKingMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.castle = this.isCastle(fromIdx, toIdx);
    this.check = false;
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.threat = false;
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.whiteBb) === U64(0) ? false : true );
  }

  isCastle(fromIdx, toIdx) {
    const difference = toIdx - fromIdx;
    return (difference == 2 || difference == -2) ? true : false;
  }
}

module.exports = {
  WhitePawnMove: WhitePawnMove,
  BlackPawnMove: BlackPawnMove,
  Move: Move,
  MoveList: MoveList,
};
