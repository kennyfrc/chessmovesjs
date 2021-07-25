const BitHelper = require('./helpers.js').BitHelper;
const BoardHelper = require('./helpers.js').BoardHelper;
const SquareHelper = require('./helpers.js').SquareHelper;
const ViewHelper = require('./helpers.js').ViewHelper;
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

class WhiteBishopMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.attack = this.isAttack(toIdx, pieceBoard);
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    const sq = SquareHelper.indicesFor(pieceBb);
    return ((Direction.bishopRays(sq, pieceBoard.occupied, pieceBoard.occupiable) &
        pieceBoard.blackKingBb) == U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.blackBb) == U64(0) ? false : true );
  }

  isAttack(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    const sq = SquareHelper.indicesFor(pieceBb);
    return (Direction.bishopRays(sq, pieceBoard.occupied, pieceBoard.occupiable) &
        pieceBoard.blackMajorBb) == U64(0) ? false : true;
  }
}

class BlackBishopMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.attack = this.isAttack(toIdx, pieceBoard);
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    const sq = SquareHelper.indicesFor(pieceBb);
    return ((Direction.bishopRays(sq, pieceBoard.occupied, pieceBoard.occupiable) &
      pieceBoard.whiteKingBb) == U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.whiteBb) == U64(0) ? false : true );
  }

  isAttack(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    const sq = SquareHelper.indicesFor(pieceBb);
    return (Direction.bishopRays(sq, pieceBoard.occupied, pieceBoard.occupiable) &
      pieceBoard.whiteMajorBb) == U64(0) ? false : true;
  }
}

class WhiteRookMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.attack = this.isAttack(toIdx, pieceBoard);
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    const sq = SquareHelper.indicesFor(pieceBb);
    return ((Direction.rookRays(sq, pieceBoard.occupied, pieceBoard.occupiable) &
          pieceBoard.blackKingBb) == U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.blackBb) == U64(0) ? false : true );
  }

  isAttack(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    const sq = SquareHelper.indicesFor(pieceBb);
    return (Direction.rookRays(sq, pieceBoard.occupied, pieceBoard.occupiable) &
      pieceBoard.blackQueenBb) == U64(0) ? false : true;
  }
}

class BlackRookMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.attack = this.isAttack(toIdx, pieceBoard);
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    const sq = SquareHelper.indicesFor(pieceBb);
    return ((Direction.rookRays(sq, pieceBoard.occupied, pieceBoard.occupiable) &
          pieceBoard.whiteKingBb) == U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.whiteBb) == U64(0) ? false : true );
  }

  isAttack(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    const sq = SquareHelper.indicesFor(pieceBb);
    return (Direction.rookRays(sq, pieceBoard.occupied, pieceBoard.occupiable) &
      pieceBoard.whiteQueenBb) == U64(0) ? false : true;
  }
}

class WhiteQueenMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.attack = false;
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    const sq = SquareHelper.indicesFor(pieceBb);
    return ((Direction.queenRays(sq, pieceBoard.occupied, pieceBoard.occupiable) &
          pieceBoard.blackKingBb) == U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.blackBb) == U64(0) ? false : true );
  }
}

class BlackQueenMove {
  constructor(fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx;
    this.to = toIdx;
    this.check = this.isCheck(toIdx, pieceBoard);
    this.capture = this.isCapture(toIdx, pieceBoard);
    this.attack = false;
  }

  isCheck(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    const sq = SquareHelper.indicesFor(pieceBb);
    return ((Direction.queenRays(sq, pieceBoard.occupied, pieceBoard.occupiable) &
          pieceBoard.whiteKingBb) == U64(0) ? false : true);
  }

  isCapture(toIdx, pieceBoard) {
    const pieceBb = BitHelper.setBit(U64(0), U64(toIdx));
    return ((pieceBb & pieceBoard.whiteBb) == U64(0) ? false : true );
  }
}

class Direction {
  static wSinglePush(bb, emptySq) {
    return Mask.northOne(bb) & emptySq;
  }

  static wDoublePush(bb, emptySq) {
    const singlePushBb = this.wSinglePush(bb, emptySq);
    return Mask.northOne(singlePushBb) & emptySq & BoardHelper.fourthRank();
  }

  static bSinglePush(bb, emptySq) {
    return Mask.southOne(bb) & emptySq;
  }

  static bDoublePush(bb, emptySq) {
    const singlePushBb = this.bSinglePush(bb, emptySq);
    return Mask.southOne(singlePushBb) & emptySq & BoardHelper.fifthRank();
  }

  static wPawnAttacks(bb) {
    return ( Mask.northWestOne(bb & U64Comp(BoardHelper.aFile())) |
     Mask.northEastOne(bb & U64Comp(BoardHelper.hFile())) );
  }

  static bPawnAttacks(bb) {
    return ( Mask.southWestOne(bb & U64Comp(BoardHelper.aFile())) |
     Mask.southEastOne(bb & U64Comp(BoardHelper.hFile())) );
  }

  static knightAttacks(bb) {
    return Mask.noNoEast(bb & U64Comp((BoardHelper.hFile()) | BoardHelper.seventhRank() | BoardHelper.eighthRank())) |
      Mask.noEaEast(bb & U64Comp((BoardHelper.gFile()) | BoardHelper.hFile() | BoardHelper.eighthRank())) |
      Mask.soEaEast(bb & U64Comp((BoardHelper.gFile()) | BoardHelper.hFile() | BoardHelper.firstRank())) |
      Mask.soSoEast(bb & U64Comp((BoardHelper.hFile()) | BoardHelper.firstRank() | BoardHelper.secondRank())) |
      Mask.noNoWest(bb & U64Comp((BoardHelper.aFile()) | BoardHelper.seventhRank() | BoardHelper.eighthRank())) |
      Mask.noWeWest(bb & U64Comp((BoardHelper.aFile()) | BoardHelper.bFile() | BoardHelper.eighthRank())) |
      Mask.soWeWest(bb & U64Comp((BoardHelper.aFile()) | BoardHelper.bFile() | BoardHelper.firstRank())) |
      Mask.soSoWest(bb & U64Comp((BoardHelper.aFile()) | BoardHelper.firstRank() | BoardHelper.secondRank()))
  }

  static bishopRays(sq, occupied, occupiable) {
    return (this.bishopNegAttacks(sq, occupied) | 
        this.bishopPosAttacks(sq, occupied)) & occupiable;
  }

  static bishopPosAttacks(sq, occupied) {
    let posRayAttacks = this.bishopPosRays(U64(sq));
    let posRayBlocker = posRayAttacks & occupied;
    while (posRayBlocker != U64(0)) {
      let sqOfBlocker = BitHelper.bitScanFwd(posRayBlocker);
      posRayBlocker = BitHelper.clearBit(posRayBlocker, sqOfBlocker);
      let rayBehindBlocker = this.bishopPosRays(U64(sqOfBlocker)) & posRayAttacks;
      posRayAttacks ^= rayBehindBlocker;
    }
    return posRayAttacks;
  }

  static bishopNegAttacks(sq, occupied) {
    let negRayAttacks = this.bishopNegRays(U64(sq));
    let negRayBlocker = negRayAttacks & occupied;
    while (negRayBlocker != U64(0)) {
      let sqOfBlocker = BitHelper.bitScanRev(negRayBlocker);
      negRayBlocker = BitHelper.clearBit(negRayBlocker, sqOfBlocker);
      let rayBehindBlocker = this.bishopNegRays(U64(sqOfBlocker)) & negRayAttacks;
      negRayAttacks ^= rayBehindBlocker;
    }
    return negRayAttacks;
  }

  static bishopAttacks(sq) {
    return Mask.diag(sq) ^ Mask.antiDiag(sq);
  }

  static bishopPosRays(sq) {
    return Mask.posRays(sq) & this.bishopAttacks(sq);
  }

  static bishopNegRays(sq) {
    return Mask.negRays(sq) & this.bishopAttacks(sq);
  }

  static rookRays(sq, occupied, occupiable) {
    return (this.rookNegAttacks(sq, occupied) | 
        this.rookPosAttacks(sq, occupied)) & occupiable;
  }

  static rookPosAttacks(sq, occupied) {
    let posRayAttacks = this.rookPosRays(U64(sq));
    let posRayBlocker = posRayAttacks & occupied;
    while (posRayBlocker != U64(0)) {
      let sqOfBlocker = BitHelper.bitScanFwd(posRayBlocker);
      posRayBlocker = BitHelper.clearBit(posRayBlocker, sqOfBlocker);
      let rayBehindBlocker = this.rookPosRays(U64(sqOfBlocker)) & posRayAttacks;
      posRayAttacks ^= rayBehindBlocker;
    }
    return posRayAttacks;
  }

  static rookNegAttacks(sq, occupied) {
    let negRayAttacks = this.rookNegRays(U64(sq));
    let negRayBlocker = negRayAttacks & occupied;
    while (negRayBlocker != U64(0)) {
      let sqOfBlocker = BitHelper.bitScanRev(negRayBlocker);
      negRayBlocker = BitHelper.clearBit(negRayBlocker, sqOfBlocker);
      let rayBehindBlocker = this.rookNegRays(U64(sqOfBlocker)) & negRayAttacks;
      negRayAttacks ^= rayBehindBlocker;
    }
    return negRayAttacks;
  }

  static rookAttacks(sq) {
    return Mask.file(sq) | Mask.rank(sq);
  }

  static rookPosRays(sq) {
    return Mask.posRays(sq) & this.rookAttacks(sq);
  }

  static rookNegRays(sq) {
    return Mask.negRays(sq) & this.rookAttacks(sq);
  }

  static queenRays(sq, occupied, occupiable) {
      return this.rookRays(sq, occupied, occupiable) | this.bishopRays(sq, occupied, occupiable)
  }

  // static queenPosAttacks(sq, occupied) {
  //   return this.rookPosAttacks(sq, occupied) | this.bishopPosAttacks(sq, occupied);
  // }

  // static queenNegAttacks(sq, occupied) {
  //   return this.rookNegAttacks(sq, occupied) | this.bishopNegAttacks(sq, occupied);
  // }

  // static queenAttacks(sq) {
  //   return this.rookAttacks(sq) | this.bishopAttacks(sq);
  // }

  // static queenPosRays(sq) {
  //   return this.rookPosRays(sq) | this.bishopPosRays(sq);
  // }

  // static queenNegRays(sq) {
  //   return this.rookNegRays(sq) | this.bishopNegRays(sq);
  // }
}

/**
 * Mask
 *
 * noWe         nort         noEa
 *         +7    +8    +9
 *             \  |  /
 * west    -1 <-  0 -> +1    east
 *             /  |  \
 *         -9    -8    -7
 * soWe         sout         soEa
 **/
class Mask {
  // basic Mask
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

  // rays
  static posRays(sq) {
    return U64(-2) << sq;
  }

  static negRays(sq) {
    return ((U64(1) << sq) - U64(1));
  }

  static rank(sq) {
    return BoardHelper.firstRank() << (sq & U64(56));
  }

  static file(sq) {
    return BoardHelper.aFile() << (sq & U64(7));
  }

  static diag(sq) {
    const diag = U64(8) * (sq & U64(7)) - (sq & U64(56));
    const nort = U64Neg(diag) & (diag >> U64(31));
    const sout = diag & (U64Neg(diag) >> U64(31));
    return (BoardHelper.a1H8Diagonal() >> sout) << nort;
  }

  static antiDiag(sq) {
    const diag = U64(56) - U64(8) * (sq & U64(7)) - (sq & U64(56));
    const nort = U64Neg(diag) & (diag >> U64(31));
    const sout = diag & (U64Neg(diag) >> U64(31));
    return (BoardHelper.h1A8Diagonal() >> sout) << nort;
  }

  // static testMask(sq) {
  //   return (U64(-2) << sq)
  // }

  // U64('0x0102040810204080');

  // static noMaskExt(sq) {
  //   return U64('0x0101010101010100') << sq;
  // }

  // static noEaFill(sq) {
  //   return (U64(-2) << sq);
  // }

  // static noEaMaskExt(sq) {
  //   return this.noEaFill(sq);
  // }
}

module.exports = {
  WhitePawnMove: WhitePawnMove,
  BlackPawnMove: BlackPawnMove,
  Move: Move,
  MoveList: MoveList,
  Direction: Direction,
  Mask: Mask,
};
