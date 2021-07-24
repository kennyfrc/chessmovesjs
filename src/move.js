const BitHelper = require('./helpers.js').BitHelper;
const BoardHelper = require('./helpers.js').BoardHelper;
const U64 = require('./helpers.js').U64;
const U64Comp = require('./helpers.js').U64Comp;
const U64Neg = require('./helpers.js').U64Neg;

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
    }
    return new MoveClass(fromIdx, toIdx, pieceBoard);
  }
}

class WhitePawnMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.attack = this.isAttack(toIdx, pieceBoard);
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((Direction.wPawnAttacks(pieceBb) & pieceBoard.blackKingBb) ==
      U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.blackBb) == U64(0) ? false : true );
  }

  isAttack(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return (Direction.wPawnAttacks(pieceBb) & (pieceBoard.blackMinorBb |
      pieceBoard.blackMajorBb)) == U64(0) ? false : true;
  }
}

class BlackPawnMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.bb = U64(0);
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.attack = this.isAttack(toIdx, pieceBoard);
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((Direction.bPawnAttacks(pieceBb) & pieceBoard.whiteKingBb) ==
      U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.whiteBb) == U64(0) ? false : true );
  }

  isAttack(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return (Direction.bPawnAttacks(pieceBb) & (pieceBoard.whiteMinorBb |
      pieceBoard.whiteMajorBb)) == U64(0) ? false : true;
  }
}

class WhiteKnightMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.attack = this.isAttack(toIdx, pieceBoard);
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((Direction.knightAttacks(pieceBb) & pieceBoard.blackKingBb) ==
      U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.blackBb) == U64(0) ? false : true );
  }

  isAttack(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return (Direction.knightAttacks(pieceBb) & pieceBoard.blackMajorBb) ==
      U64(0) ? false : true;
  }
}

class BlackKnightMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.attack = this.isAttack(toIdx, pieceBoard);
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((Direction.knightAttacks(pieceBb) & pieceBoard.whiteKingBb) ==
      U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.whiteBb) == U64(0) ? false : true );
  }

  isAttack(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return (Direction.knightAttacks(pieceBb) & pieceBoard.whiteMajorBb) ==
      U64(0) ? false : true;
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
    return ( Compass.northWestOne(bb & U64Comp(BoardHelper.aFile())) |
     Compass.northEastOne(bb & U64Comp(BoardHelper.hFile())) );
  }

  static bPawnAttacks(bb) {
    return ( Compass.southWestOne(bb & U64Comp(BoardHelper.aFile())) |
     Compass.southEastOne(bb & U64Comp(BoardHelper.hFile())) );
  }

  static knightAttacks(bb) {
    return Compass.noNoEast(bb & U64Comp((BoardHelper.hFile()) | BoardHelper.seventhRank() | BoardHelper.eighthRank())) |
      Compass.noEaEast(bb & U64Comp((BoardHelper.gFile()) | BoardHelper.hFile() | BoardHelper.eighthRank())) |
      Compass.soEaEast(bb & U64Comp((BoardHelper.gFile()) | BoardHelper.hFile() | BoardHelper.firstRank())) |
      Compass.soSoEast(bb & U64Comp((BoardHelper.hFile()) | BoardHelper.firstRank() | BoardHelper.secondRank())) |
      Compass.noNoWest(bb & U64Comp((BoardHelper.aFile()) | BoardHelper.seventhRank() | BoardHelper.eighthRank())) |
      Compass.noWeWest(bb & U64Comp((BoardHelper.aFile()) | BoardHelper.bFile() | BoardHelper.eighthRank())) |
      Compass.soWeWest(bb & U64Comp((BoardHelper.aFile()) | BoardHelper.bFile() | BoardHelper.firstRank())) |
      Compass.soSoWest(bb & U64Comp((BoardHelper.aFile()) | BoardHelper.firstRank() | BoardHelper.secondRank()))
  }
}

/**
 * Compass
 *
 * noWe         nort         noEa
 *         +7    +8    +9
 *             \  |  /
 * west    -1 <-  0 -> +1    east
 *             /  |  \
 *         -9    -8    -7
 * soWe         sout         soEa
 **/
class Compass {
  // basic compass
  static northOne(bb) {
    return bb << U64(8);
  }

  static northEastOne(bb) {
    return bb << U64(9);
  }

  static eastOne(bb) {
    return bb << U64(1);
  }

  static southEastOne(bb) {
    return bb >> U64(7);
  }

  static southOne(bb) {
    return bb >> U64(8);
  }

  static southWestOne(bb) {
    return bb >> U64(9);
  }

  static westOne(bb) {
    return bb >> U64(1);
  }

  static northWestOne(bb) {
    return bb << U64(7);
  }

  // knight moves
  static noNoEast(bb) {
    return bb << U64(17);
  }
  static noEaEast(bb) {
    return bb << U64(10);
  }
  static soEaEast(bb) {
    return bb >> U64(6);
  }
  static soSoEast(bb) {
    return bb >> U64(15);
  }
  static noNoWest(bb) {
    return bb << U64(15);
  }
  static noWeWest(bb) {
    return bb << U64(6);
  }
  static soWeWest(bb) {
    return bb >> U64(10);
  }
  static soSoWest(bb) {
    return bb >> U64(17);
  }
}

module.exports = {
  WhitePawnMove: WhitePawnMove,
  BlackPawnMove: BlackPawnMove,
  Move: Move,
  MoveList: MoveList,
  Direction: Direction,
  Compass: Compass,
};
