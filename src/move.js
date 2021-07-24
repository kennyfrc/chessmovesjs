const BitHelper = require('./helpers.js').BitHelper;
const BoardHelper = require('./helpers.js').BoardHelper;

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

class MoveList {
  static for(fenChar, fromIdx, toIdxs, pieceBoard) {
    const moveList = [];
    toIdxs.forEach((toIdx) => {
      moveList.push(Move.for(fenChar, fromIdx, toIdx, pieceBoard));
    });
    return moveList;
  }
}

class WhitePawnMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
  }

  isCheck(toIdx, pieceBoard) {
    let pieceBb = BitHelper.setBit(BigInt(0), BigInt(toIdx));
    return ((Direction.wPawnAttacks(pieceBb) & pieceBoard.blackKingBb) == BigInt(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    let pieceBb = BitHelper.setBit(BigInt(0), BigInt(toIdx));
    return ((pieceBb & pieceBoard.blackBb) == BigInt(0) ? false : true );
  }
}

class BlackPawnMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
  }

  isCheck(toIdx, pieceBoard) {
    let pieceBb = BitHelper.setBit(BigInt(0), BigInt(toIdx));
    return ((Direction.bPawnAttacks(pieceBb) & pieceBoard.whiteKingBb) == BigInt(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    let pieceBb = BitHelper.setBit(BigInt(0), BigInt(toIdx));
    return ((pieceBb & pieceBoard.whiteBb) == BigInt(0) ? false : true );
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

module.exports = {
  WhitePawnMove: WhitePawnMove,
  BlackPawnMove: BlackPawnMove,
  Move: Move,
  MoveList: MoveList,
  Direction: Direction,
  Compass: Compass,
}