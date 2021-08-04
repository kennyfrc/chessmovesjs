const BitHelper = require('./helpers.js').BitHelper;
const BoardHelper = require('./helpers.js').BoardHelper;
const SquareHelper = require('./helpers.js').SquareHelper;
const ViewHelper = require('./helpers.js').ViewHelper;
const U64 = require('./helpers.js').U64;
const U64Comp = require('./helpers.js').U64Comp;
const U64Neg = require('./helpers.js').U64Neg;
const Mask = require('./mask.js').Mask;


/**
 * RayCompass
 *
 * noWe         nort         noEa
 *         +7    +8    +9
 *             \  |  /
 * west    -1 <-  0 -> +1    east
 *             /  |  \
 *         -9    -8    -7
 * soWe         sout         soEa
 **/

class RayCompass {
  static for(sourceSq, pointingSq, occupied) {
    const direction = pointingSq - sourceSq;
    sourceSq = U64(sourceSq);
    switch (direction) {
      case 8:
        return Ray.sliderAttacks(sourceSq, occupied, 
          BitHelper.bitScanFwd, Ray.posFile);
      case 9:
        return Ray.sliderAttacks(sourceSq, occupied, 
          BitHelper.bitScanFwd, Ray.posDiag);
      case 1:
        return Ray.sliderAttacks(sourceSq, occupied, 
          BitHelper.bitScanFwd, Ray.posRank);
      case -7:
        return Ray.sliderAttacks(sourceSq, occupied, 
          BitHelper.bitScanRev, Ray.negAntiDiag);
      case -8:
        return Ray.sliderAttacks(sourceSq, occupied, 
          BitHelper.bitScanRev, Ray.negFile);
      case -9:
        return Ray.sliderAttacks(sourceSq, occupied, 
          BitHelper.bitScanRev, Ray.negDiag);
      case -1:
        return Ray.sliderAttacks(sourceSq, occupied, 
          BitHelper.bitScanRev, Ray.negRank);
      case 7:
        return Ray.sliderAttacks(sourceSq, occupied, 
          BitHelper.bitScanFwd, Ray.antiDiag);
      default:
        return U64(0);
    }
  }
}

class Ray {
  static for(sourceSq, pointingSq, occupied) {
    return RayCompass.for(sourceSq, pointingSq, occupied)
  }

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

  static posFile(sq) {
    return Ray.posRays(sq) & Ray.file(sq);
  }

  static posDiag(sq) {
    return Ray.posRays(sq) & Ray.diag(sq);
  }

  static posRank(sq) {
    return Ray.posRays(sq) & Ray.rank(sq);
  }

  static posAntiDiag(sq) {
    return Ray.posRays(sq) & Ray.antiDiag(sq);
  }

  static negFile(sq) {
    return Ray.negRays(sq) & Ray.file(sq);
  }

  static negDiag(sq) {
    return Ray.negRays(sq) & Ray.diag(sq);
  }

  static negRank(sq) {
    return Ray.negRays(sq) & Ray.rank(sq);
  }

  static negAntiDiag(sq) {
    return Ray.negRays(sq) & Ray.antiDiag(sq);
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
    if (typeof emptySq !== 'bigint') { throw new Error(`notbigint: ${emptySq}`)}
    if (bb === undefined) {throw new Error()}
    if (emptySq === undefined) {throw new Error()}
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

  static queenRays(bb, occupied, occupiable) {
    return this.rookRays(bb, occupied, occupiable) | this.bishopRays(bb, occupied, occupiable)
  }

  static kingMoves(bb, occupied, occupiable, rookBb, castleStatus, inCheck) {
    const castlingMoves = inCheck ? U64(0) : this.castleCheck(bb, occupied, occupiable, rookBb, castleStatus);
    return (Mask.mooreNeighborhood(bb) | castlingMoves) & occupiable;
  }

  static castleCheck(kingBb, occupied, occupiable, rookBb, castleStatus) {
    let castlingMoves = U64(0);
    rookBb &= castleStatus;
    if (rookBb === U64(0)) {
      return castlingMoves;
    }
    const kingSq = BitHelper.bitScanFwd(kingBb);
    castlingMoves |= CastleRay.canCastleQs(kingSq, occupied, occupiable) ?
      CastleRay.setQsCastleMove(kingSq) : U64(0);
    castlingMoves |= CastleRay.canCastleKs(kingSq, occupied, occupiable) ?
      CastleRay.setKsCastleMove(kingSq) : U64(0);
    return castlingMoves;
  }
}

class CastleRay {
  static setQsCastleMove(kingSq) {
    return BitHelper.setBit(U64(0), kingSq-2);
  }

  static setKsCastleMove(kingSq) {
    return BitHelper.setBit(U64(0), kingSq+2);
  }

  static canCastleKs(kingSq, occupied, occupiable) {
    let ksCastleRays = Ray.castlingPosRays(kingSq, occupied) & occupiable;
    const kingCanSeeKsSq = BitHelper.bitScanRev(ksCastleRays);
    return kingCanSeeKsSq === 62 || kingCanSeeKsSq === 6;
  }

  static canCastleQs(kingSq, occupied, occupiable) {
    let qsCastleRays = Ray.castlingNegRays(kingSq, occupied) & occupiable;
    const kingCanSeeQsSq = BitHelper.bitScanFwd(qsCastleRays);
    return kingCanSeeQsSq === 57 || kingCanSeeQsSq === 1;
  }
}

module.exports = {
  Ray: Ray,
  Direction, Direction,
}
