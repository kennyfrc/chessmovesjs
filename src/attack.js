const BitHelper = require('./helpers.js').BitHelper
const BoardHelper = require('./helpers.js').BoardHelper
const SquareHelper = require('./helpers.js').SquareHelper
const ViewHelper = require('./helpers.js').ViewHelper
const Mask = require('./mask.js').Mask

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
  static for (sourceSq, pointingSq, occupied) {
    const direction = pointingSq - sourceSq
    return this.seek(direction, sourceSq, occupied)
  }

  static seek (direction, sourceSq, occupied) {
    switch (direction) {
      case 8:
        return Ray.sliderAttacks(sourceSq, occupied,
          BitHelper.bitScanFwd, Ray.posFile)
      case 9:
        return Ray.sliderAttacks(sourceSq, occupied,
          BitHelper.bitScanFwd, Ray.posDiag)
      case 1:
        return Ray.sliderAttacks(sourceSq, occupied,
          BitHelper.bitScanFwd, Ray.posRank)
      case -7:
        return Ray.sliderAttacks(sourceSq, occupied,
          BitHelper.bitScanRev, Ray.negAntiDiag)
      case -8:
        return Ray.sliderAttacks(sourceSq, occupied,
          BitHelper.bitScanRev, Ray.negFile)
      case -9:
        return Ray.sliderAttacks(sourceSq, occupied,
          BitHelper.bitScanRev, Ray.negDiag)
      case -1:
        return Ray.sliderAttacks(sourceSq, occupied,
          BitHelper.bitScanRev, Ray.negRank)
      case 7:
        return Ray.sliderAttacks(sourceSq, occupied,
          BitHelper.bitScanFwd, Ray.posAntiDiag)
      default:
        return 0n
    }
  }
}

class Ray {
  static for (sourceSq, pointingSq, occupied) {
    return RayCompass.for(sourceSq, pointingSq, occupied)
  }

  static seek (sourceSq, targetBb, occupied, flip=false) {
    let ray = 0n
    let behindRay = 0n
    const directions = [8, 9, 1, -7, -8, -9, -1, 7]
    for (let i = 0; i < directions.length; i++) {
      ray = RayCompass.seek(directions[i], sourceSq, occupied)
      behindRay = RayCompass.seek(-(directions[i]), sourceSq, occupied)
      if ((ray & targetBb) !== 0n) { 
        break
      }
      ray = 0n
      behindRay = 0n
    }
    if (!flip) { return ray }
    return behindRay
  }

  static seekCheckerRay (sourceSq, targetBb, occupiedWoKing) {
    let ray = 0n
    let behindRay = 0n
    const directions = [8, 9, 1, -7, -8, -9, -1, 7]
    for (let i = 0; i < directions.length; i++) {
      ray = RayCompass.seek(directions[i], sourceSq, occupiedWoKing)
      behindRay = RayCompass.seek(-(directions[i]), sourceSq, occupiedWoKing)
      if ((ray & targetBb) !== 0n) { 
        break
      }
      ray = 0n
      behindRay = 0n
    }
    return ray | behindRay
  }

  // basic board rays
  static rank (sq) {
    return BoardHelper.firstRank() << (BigInt(sq) & 56n)
  }

  static file (sq) {
    return BoardHelper.aFile() << (BigInt(sq) & 7n)
  }

  static diag (sq) {
    const diag = 8n * (BigInt(sq) & 7n) - (BigInt(sq) & 56n)
    const nort = -(diag) & (diag >> 31n)
    const sout = diag & (-(diag) >> 31n)
    return (BoardHelper.a1H8Diagonal() >> sout) << nort
  }

  static antiDiag (sq) {
    const diag = 56n - 8n * (BigInt(sq) & 7n) - (BigInt(sq) & 56n)
    const nort = -(diag) & (diag >> 31n)
    const sout = diag & (-(diag) >> 31n)
    return (BoardHelper.h1A8Diagonal() >> sout) << nort
  }

  // positive & negative rays
  static posRays (sq) {
    return -2n << BigInt(sq)
  }

  static negRays (sq) {
    return ((1n << BigInt(sq)) - 1n)
  }

  // piece specific
  static sliderAttacks (sq, occupied, bitScanCallback, rayCallback) {
    let rayAttacks = rayCallback(sq)
    let rayBlocker = rayAttacks & occupied
    while (rayBlocker !== 0n) {
      const sqOfBlocker = bitScanCallback(rayBlocker)
      const rayBehindBlocker = rayCallback(sqOfBlocker) & rayAttacks
      rayBlocker = BitHelper.clearBit(rayBlocker, sqOfBlocker)
      rayAttacks ^= rayBehindBlocker
    }
    return rayAttacks
  }

  static posFile (sq) {
    return Ray.posRays(sq) & Ray.file(sq)
  }

  static posDiag (sq) {
    return Ray.posRays(sq) & Ray.diag(sq)
  }

  static posRank (sq) {
    return Ray.posRays(sq) & Ray.rank(sq)
  }

  static posAntiDiag (sq) {
    return Ray.posRays(sq) & Ray.antiDiag(sq)
  }

  static negFile (sq) {
    return Ray.negRays(sq) & Ray.file(sq)
  }

  static negDiag (sq) {
    return Ray.negRays(sq) & Ray.diag(sq)
  }

  static negRank (sq) {
    return Ray.negRays(sq) & Ray.rank(sq)
  }

  static negAntiDiag (sq) {
    return Ray.negRays(sq) & Ray.antiDiag(sq)
  }

  static bishopPosAttacks (sq, occupied) {
    return Ray.sliderAttacks(sq, occupied, BitHelper.bitScanFwd, Ray.bishopPosRays)
  }

  static bishopNegAttacks (sq, occupied) {
    return Ray.sliderAttacks(sq, occupied, BitHelper.bitScanRev, Ray.bishopNegRays)
  }

  static bishopAttacks (sq) {
    return Ray.diag(sq) ^ Ray.antiDiag(sq)
  }

  static bishopPosRays (sq) {
    return Ray.posRays(sq) & Ray.bishopAttacks(sq)
  }

  static bishopNegRays (sq) {
    return Ray.negRays(sq) & Ray.bishopAttacks(sq)
  }

  static castlingPosRays (sq, occupied) {
    return Ray.sliderAttacks(sq, occupied, BitHelper.bitScanFwd, Ray.posRank)
  }

  static castlingNegRays (sq, occupied) {
    return Ray.sliderAttacks(sq, occupied, BitHelper.bitScanRev, Ray.negRank)
  }

  static rookPosAttacks (sq, occupied) {
    return Ray.sliderAttacks(sq, occupied, BitHelper.bitScanFwd, Ray.rookPosRays)
  }

  static rookNegAttacks (sq, occupied) {
    return Ray.sliderAttacks(sq, occupied, BitHelper.bitScanRev, Ray.rookNegRays)
  }

  static rookAttacks (sq) {
    return Ray.file(sq) | Ray.rank(sq)
  }

  static rookPosRays (sq) {
    return Ray.posRays(sq) & Ray.rookAttacks(sq)
  }

  static rookNegRays (sq) {
    return Ray.negRays(sq) & Ray.rookAttacks(sq)
  }
}

class Direction {
  static wSinglePush (bb, emptySq) {
    return Mask.northOne(bb) & emptySq
  }

  static wDoublePush (bb, emptySq) {
    const singlePushBb = this.wSinglePush(bb, emptySq)
    return Mask.northOne(singlePushBb) & emptySq & BoardHelper.fourthRank()
  }

  static bSinglePush (bb, emptySq) {
    return Mask.southOne(bb) & emptySq
  }

  static bDoublePush (bb, emptySq) {
    const singlePushBb = this.bSinglePush(bb, emptySq)
    return Mask.southOne(singlePushBb) & emptySq & BoardHelper.fifthRank()
  }

  static beside (bb) {
    return (Mask.westOne(bb & ~(BoardHelper.aFile())) |
     Mask.eastOne(bb & ~(BoardHelper.hFile())))
  }

  static wPawnAttacks (bb) {
    return (Mask.northWestOne(bb & ~(BoardHelper.aFile())) |
     Mask.northEastOne(bb & ~(BoardHelper.hFile())))
  }

  static bPawnAttacks (bb) {
    return (Mask.southWestOne(bb & ~(BoardHelper.aFile())) |
     Mask.southEastOne(bb & ~(BoardHelper.hFile())))
  }

  static knightAttacks (bb) {
    return Mask.noNoEast(bb & ~((BoardHelper.hFile()) | BoardHelper.seventhRank() | BoardHelper.eighthRank())) |
      Mask.noEaEast(bb & ~((BoardHelper.gFile()) | BoardHelper.hFile() | BoardHelper.eighthRank())) |
      Mask.soEaEast(bb & ~((BoardHelper.gFile()) | BoardHelper.hFile() | BoardHelper.firstRank())) |
      Mask.soSoEast(bb & ~((BoardHelper.hFile()) | BoardHelper.firstRank() | BoardHelper.secondRank())) |
      Mask.noNoWest(bb & ~((BoardHelper.aFile()) | BoardHelper.seventhRank() | BoardHelper.eighthRank())) |
      Mask.noWeWest(bb & ~((BoardHelper.aFile()) | BoardHelper.bFile() | BoardHelper.eighthRank())) |
      Mask.soWeWest(bb & ~((BoardHelper.aFile()) | BoardHelper.bFile() | BoardHelper.firstRank())) |
      Mask.soSoWest(bb & ~((BoardHelper.aFile()) | BoardHelper.firstRank() | BoardHelper.secondRank()))
  }

  static bishopRays (bb, occupied, occupiable) {
    const sq = SquareHelper.indicesFor(bb)
    return (Ray.bishopNegAttacks(sq, occupied) |
        Ray.bishopPosAttacks(sq, occupied)) & occupiable
  }

  static rookRays (bb, occupied, occupiable) {
    const sq = SquareHelper.indicesFor(bb)
    return (Ray.rookNegAttacks(sq, occupied) |
        Ray.rookPosAttacks(sq, occupied)) & occupiable
  }

  static queenRays (bb, occupied, occupiable) {
    return this.rookRays(bb, occupied, occupiable) | this.bishopRays(bb, occupied, occupiable)
  }

  static kingMoves (bb, occupied, occupiable, rookBb, castleStatus, inCheck, castleable) {
    const castlingMoves = inCheck ? 0n : this.castleCheck(bb, occupied, rookBb, castleStatus, castleable)
    const bareKingMoves = this.bareKingMoves(bb)
    return (bareKingMoves | castlingMoves) & occupiable
  }

  static bareKingMoves (bb) {
    if ((bb & BoardHelper.aFile()) !== 0n) {
      return Mask.mooreNeighborhood(bb) & (BoardHelper.aFile() | BoardHelper.bFile())
    } else if ((bb & BoardHelper.hFile()) !== 0n) {
      return Mask.mooreNeighborhood(bb) & (BoardHelper.gFile() | BoardHelper.hFile())
    } else {
      return Mask.mooreNeighborhood(bb)
    }
  }

  static castleCheck (kingBb, occupied, rookBb, castleStatus, castleable) {
    let castlingMoves = 0n
    rookBb &= castleStatus
    if (rookBb === 0n) {
      return castlingMoves
    }
    const kingSq = BitHelper.bitScanFwd(kingBb)
    castlingMoves |= CastleRay.canCastleQs(kingSq, occupied, castleStatus, castleable)
      ? CastleRay.setQsCastleMove(kingSq)
      : 0n
    castlingMoves |= CastleRay.canCastleKs(kingSq, occupied, castleStatus, castleable)
      ? CastleRay.setKsCastleMove(kingSq)
      : 0n
    return castlingMoves
  }
}

class CastleRay {
  static setQsCastleMove (kingSq) {
    return BitHelper.setBit(0n, kingSq - 2)
  }

  static setKsCastleMove (kingSq) {
    return BitHelper.setBit(0n, kingSq + 2)
  }

  static canCastleKs (kingSq, occupied, castleStatus, castleable) {
    const ksCastleRays = Ray.castlingPosRays(kingSq, occupied) & castleable
    const kingCanSeeKsSq = BitHelper.bitScanRev(ksCastleRays)
    return (kingCanSeeKsSq === 62 && (castleStatus & BoardHelper.blackKsCastleRookSq()) !== 0n )
      || (kingCanSeeKsSq === 6 && (castleStatus & BoardHelper.whiteKsCastleRookSq()) !== 0n )
  }

  static canCastleQs (kingSq, occupied, castleStatus, castleable) {
    const qsCastleRays = Ray.castlingNegRays(kingSq, occupied) & castleable
    const kingCanSeeQsSq = BitHelper.bitScanFwd(qsCastleRays)
    return (kingCanSeeQsSq === 57 && (castleStatus & BoardHelper.blackQsCastleRookSq()) !== 0n )
      || (kingCanSeeQsSq === 1 && (castleStatus & BoardHelper.whiteQsCastleRookSq()) !== 0n)
  }
}

module.exports = {
  Ray: Ray,
  Direction: Direction
}
