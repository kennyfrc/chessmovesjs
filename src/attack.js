const BitHelper = require('./helpers.js').BitHelper;
const BoardHelper = require('./helpers.js').BoardHelper;
const SquareHelper = require('./helpers.js').SquareHelper;
const ViewHelper = require('./helpers.js').ViewHelper;
const U64 = require('./helpers.js').U64;
const U64Comp = require('./helpers.js').U64Comp;
const U64Neg = require('./helpers.js').U64Neg;
const Mask = require('./mask.js').Mask;

class Ray {
  // basic board rays
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

  // positive & negative rays
  static posRays(sq) {
    return U64(-2) << sq;
  }

  static negRays(sq) {
    return ((U64(1) << sq) - U64(1));
  }

  // piece specific
  static sliderAttacks(sq, occupied, bitScanCallback, rayCallback) {
    let rayAttacks = rayCallback(U64(sq));
    let rayBlocker = rayAttacks & occupied;
    while (rayBlocker != U64(0)) {
      let sqOfBlocker = bitScanCallback(rayBlocker);
      rayBlocker = BitHelper.clearBit(rayBlocker, sqOfBlocker);
      let rayBehindBlocker = rayCallback(U64(sqOfBlocker)) & rayAttacks;
      rayAttacks ^= rayBehindBlocker;
    }
    return rayAttacks;
  }

  static bishopPosAttacks(sq, occupied) {
    return Ray.sliderAttacks(sq, occupied, BitHelper.bitScanFwd, Ray.bishopPosRays);
  }

  static bishopNegAttacks(sq, occupied) {
    return Ray.sliderAttacks(sq, occupied, BitHelper.bitScanRev, Ray.bishopNegRays);
  }

  static bishopAttacks(sq) {
    return Ray.diag(sq) ^ Ray.antiDiag(sq);
  }

  static bishopPosRays(sq) {
    return Ray.posRays(sq) & Ray.bishopAttacks(sq);
  }

  static bishopNegRays(sq) {
    return Ray.negRays(sq) & Ray.bishopAttacks(sq);
  }

  static castlingPosRays(sq, occupied) {
    return Ray.sliderAttacks(sq, occupied, BitHelper.bitScanFwd, Ray.posRank);
  }

  static castlingNegRays(sq, occupied) {
    return Ray.sliderAttacks(sq, occupied, BitHelper.bitScanRev, Ray.negRank);
  }

  static posRank(sq) {
    return Ray.posRays(sq) & Ray.rank(sq);
  }

  static negRank(sq) {
    return Ray.negRays(sq) & Ray.rank(sq);
  }

  static rookPosAttacks(sq, occupied) {
    return Ray.sliderAttacks(sq, occupied, BitHelper.bitScanFwd, Ray.rookPosRays);
  }

  static rookNegAttacks(sq, occupied) {
    return Ray.sliderAttacks(sq, occupied, BitHelper.bitScanRev, Ray.rookNegRays);
  }

  static rookAttacks(sq) {
    return Ray.file(sq) | Ray.rank(sq);
  }

  static rookPosRays(sq) {
    return Ray.posRays(sq) & Ray.rookAttacks(sq);
  }

  static rookNegRays(sq) {
    return Ray.negRays(sq) & Ray.rookAttacks(sq);
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

  static bishopRays(bb, occupied, occupiable) {
    const sq = SquareHelper.indicesFor(bb);
    return (Ray.bishopNegAttacks(sq, occupied) | 
        Ray.bishopPosAttacks(sq, occupied)) & occupiable;
  }

  static rookRays(bb, occupied, occupiable) {
    const sq = SquareHelper.indicesFor(bb);
    return (Ray.rookNegAttacks(sq, occupied) | 
        Ray.rookPosAttacks(sq, occupied)) & occupiable;
  }

  static queenRays(pieceBb, occupied, occupiable) {
    return this.rookRays(pieceBb, occupied, occupiable) | this.bishopRays(pieceBb, occupied, occupiable)
  }

  static kingMoves(pieceBb, occupied, occupiable, rookBb, castleStatus) {
    const castlingMoves = this.castleCheck(pieceBb, occupied, rookBb, castleStatus);
    return (Mask.mooreNeighborhood(pieceBb) & occupiable) | castlingMoves;
  }

  // ugly as hell. not sure yet how to improve it
  static castleCheck(kingBb, occupied, rookBb, castleStatus) {
    rookBb &= castleStatus;
    if (rookBb === U64(0)) {
      return U64(0); 
    }
    let castlingMoves = U64(0);
    let qsCastle = U64(0);
    let ksCastle = U64(0);
    const kingSq = BitHelper.bitScanFwd(kingBb);
    const rightOfKingSq = kingSq + 1;
    const leftOfKingSq = kingSq - 1;
    const rightOfKing = BitHelper.getBit(occupied, rightOfKingSq);
    const leftOfKing = BitHelper.getBit(occupied, leftOfKingSq);
    const rookSqs = SquareHelper.indicesFor(rookBb);
    rookSqs.forEach((rookSq) => {
      const ksCastleRays = Ray.castlingNegRays(rookSq, occupied);
      const qsCastleRays = Ray.castlingPosRays(rookSq, occupied);
      const rookCanReachQs = BitHelper.bitScanRev(qsCastleRays)
      const rookCanReachKs = BitHelper.bitScanFwd(ksCastleRays)
      if (rookCanReachQs !== U64(0) || rookCanReachQs !== U64(63)) {
        qsCastle |= BitHelper.setBit(U64(0), leftOfKingSq-1);
      } 
      if (rookCanReachKs !== U64(0) || rookCanReachKs !== U64(63)) {
        ksCastle |= BitHelper.setBit(U64(0), rightOfKingSq+1);
      }
    });
    return (qsCastle | ksCastle);
  }
}

module.exports = {
  Ray: Ray,
  Direction, Direction,
}
