const BitHelper = require('./helpers.js').BitHelper
const BoardHelper = require('./helpers.js').BoardHelper
const SquareHelper = require('./helpers.js').SquareHelper
const ViewHelper = require('./helpers.js').ViewHelper
const U64 = require('./helpers.js').U64
// const U64Comp = require('./helpers.js').U64Comp
// const U64Neg = require('./helpers.js').U64Neg
const Ray = require('./attack.js').Ray
const Direction = require('./attack.js').Direction
const Mask = require('./mask.js').Mask
const ThreatBoard = require('./threatboard.js').ThreatBoard
const Pieces = require('./pieces.js').Pieces
const PieceStatus = require('./pieces.js').PieceStatus

class MoveList {
  static for (fenPiece, board) {
    const moveList = []
    const pieceBoard = board.pieceBoardList[fenPiece]
    SquareHelper.indicesFor(pieceBoard.bb).forEach((fromIdx) => {
      const pieceBb = BitHelper.setBit(U64(0), fromIdx)
      let attacks = CheckEvasions.filter(fenPiece, pieceBoard, pieceBb, board)
      attacks = Pins.filter(fenPiece, attacks, pieceBb, board)
      const toIdxs = SquareHelper.indicesFor(attacks)
      if (this.isPawnAndPromotable(fenPiece, pieceBb)) {
        moveList.push(this.createPromotions(fenPiece, pieceBb, fromIdx, toIdxs, pieceBoard))
      } else {
        moveList.push(this.createMoves(fenPiece, pieceBb, fromIdx, toIdxs, pieceBoard))
      }
    })
    return moveList.flat()
  }

  static createPromotions (fenPiece, fromBit, fromIdx, toIdxs, pieceBoard) {
    const promotionList = []
    if (fenPiece === 'P') {
      toIdxs.forEach((toIdx) => {
        Pieces.for('wp').forEach((promoteTo) => {
          promotionList.push(Move.for(fenPiece, fromBit, fromIdx, toIdx, pieceBoard, true, promoteTo))
        })
      })
    } else {
      toIdxs.forEach((toIdx) => {
        Pieces.for('bp').forEach((promoteTo) => {
          promotionList.push(Move.for(fenPiece, fromBit, fromIdx, toIdx, pieceBoard, true, promoteTo))
        })
      })
    }
    return promotionList
  }

  static createMoves (fenPiece, fromBit, fromIdx, toIdxs, pieceBoard, promotion = false, promoteTo = null) {
    return toIdxs.map((toIdx) => Move.for(fenPiece, fromBit, fromIdx, toIdx, pieceBoard, promotion, promoteTo))
  }

  static isPawnAndPromotable (fenPiece, pieceBb) {
    return 'Pp'.includes(fenPiece) && this.isPromotable(fenPiece, pieceBb)
  }

  static isPromotable (fenPiece, pieceBb) {
    return fenPiece === 'P'
      ? (BoardHelper.seventhRank() & pieceBb) !== U64(0)
      : (BoardHelper.secondRank() & pieceBb) !== U64(0)
  }

  static legalMoves (board) {
    return board.whiteToMove
      ? this.addLegalWhiteMoves(board)
      : this.addLegalBlackMoves(board)
  }

  static pieceMoves (fenPiece, pieceBoard, pieceBb, board) {
    let kingInCheckMoves
    if (fenPiece === 'K') {
      const moves = pieceBoard.attacks(pieceBb, board)
      kingInCheckMoves = moves & board.whiteKingDangerSquares
      return moves ^ kingInCheckMoves
    }
    if (fenPiece === 'k') {
      const moves = pieceBoard.attacks(pieceBb, board)
      kingInCheckMoves = moves & board.blackKingDangerSquares
      return moves ^ kingInCheckMoves
    }
    return pieceBoard.attacks(pieceBb, board)
  }

  static addLegalWhiteMoves (board) {
    return Pieces.for('w').map((piece) => MoveList.for(piece, board)).flat()
  }

  static addLegalBlackMoves (board) {
    return Pieces.for('b').map((piece) => MoveList.for(piece, board)).flat()
  }
}

class Pins {
  static filter (fenPiece, attacks, pieceBb, board) {
    if (board.isOurKingXrayed()) {
      const ourKingBb = board.whiteToMove ? board.whiteKingBb : board.blackKingBb
      const theyOccupied = board.whiteToMove ? board.blackBb : board.whiteBb
      const kingSourceSq = BitHelper.bitScanFwd(ourKingBb)
      const pinnerDirectionFromKing = Mask.mooreNeighborhood(ourKingBb) & board.xrayDangerSqs
      const sqThatPointsToPinner = BitHelper.bitScanRev(pinnerDirectionFromKing)
      const pinnerRay = Ray.for(kingSourceSq, sqThatPointsToPinner, theyOccupied)
      const pinnedPiece = pinnerRay & pieceBb ? pieceBb : U64(0)
      return pinnedPiece ? attacks & pinnerRay : attacks
    }
    return attacks
  }
}

class CheckEvasions {
  static filter (fenPiece, pieceBoard, pieceBb, board) {
    let pieceMoves = U64(0)
    if (this.isMultiCheckAndNotKing(board, fenPiece)) { return pieceMoves };
    if (this.isSingleCheckAndNotKing(board, fenPiece)) {
      pieceMoves |= MoveList.pieceMoves(fenPiece, pieceBoard, pieceBb, board)
      pieceMoves &= this.manageCheckers(fenPiece, board, pieceMoves)
      return pieceMoves
    }
    return MoveList.pieceMoves(fenPiece, pieceBoard, pieceBb, board)
  }

  static isSingleCheckAndNotKing (board, fenPiece) {
    return board.checkerCount === 1 && 'QRBNPqrbnp'.includes(fenPiece)
  }

  static isMultiCheckAndNotKing (board, fenPiece) {
    return board.checkerCount > 1 && 'QRBNPqrbnp'.includes(fenPiece)
  }

  static manageCheckers (fenPiece, board, attacks) {
    const captureCheckers = this.findCheckersToCapture(fenPiece, board, attacks)
    const blockCheckers = attacks & this.findWaysToBlockCheckers(fenPiece, board, attacks)
    return captureCheckers | blockCheckers
  }

  static findCheckersToCapture (fenPiece, board, attacks) {
    if (PieceStatus.isPawn(fenPiece)) {
      return (attacks & board.epSqBb) | (attacks & board.checkersBb)
    }
    return (attacks & board.checkersBb)
  }

  static findWaysToBlockCheckers (fenPiece, board, attacks) {
    const kingBb = board.whiteToMove ? board.whiteKingBb : board.blackKingBb
    const kingSourceSq = BitHelper.bitScanFwd(kingBb)
    const checkerDirectionFromKing = Mask.mooreNeighborhood(kingBb) & board.kingDangerSquares
    const sqThatPointsToChecker = BitHelper.bitScanFwd(checkerDirectionFromKing)
    const checkerRay = Ray.for(kingSourceSq, sqThatPointsToChecker, board.bb)
    return checkerRay
  }
}

class Move {
  static for (fenChar, fromBit, fromIdx, toIdx, pieceBoard, promotion, promoteTo) {
    let MoveClass
    switch (fenChar) {
      case 'P':
        MoveClass = WhitePawnMove
        break
      case 'p':
        MoveClass = BlackPawnMove
        break
      case 'N':
        MoveClass = WhiteKnightMove
        break
      case 'n':
        MoveClass = BlackKnightMove
        break
      case 'B':
        MoveClass = WhiteBishopMove
        break
      case 'b':
        MoveClass = BlackBishopMove
        break
      case 'R':
        MoveClass = WhiteRookMove
        break
      case 'r':
        MoveClass = BlackRookMove
        break
      case 'Q':
        MoveClass = WhiteQueenMove
        break
      case 'q':
        MoveClass = BlackQueenMove
        break
      case 'K':
        MoveClass = WhiteKingMove
        break
      case 'k':
        MoveClass = BlackKingMove
        break
    }
    return 'Pp'.includes(fenChar)
      ? new MoveClass(fromBit, fromIdx, toIdx, pieceBoard, promotion, promoteTo)
      : new MoveClass(fromBit, fromIdx, toIdx, pieceBoard)
  }
}

class WhitePawnMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard, promotion, promoteTo) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || U64(0)
    this.toBit = BitHelper.setBit(U64(0), U64(toIdx))
    this.ep = false
    this.promotion = promotion
    this.promoteTo = promoteTo
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = this.isThreat(pieceBoard)
    this.fenChar = 'P'
    this.epRisk = this.isDoublePush(pieceBoard.emptySq) ? Mask.southOne(this.toBit) : U64(0)
  }

  isCheck (pieceBoard) {
    return ((this.parsePawnAttacks(pieceBoard, this.toBit) & pieceBoard.blackKingBb) !==
      U64(0))
  }

  isCapture (pieceBoard) {
    const capOrEp = this.toBit & (pieceBoard.blackBb | pieceBoard.epSqBb)
    const enPassant = this.toBit & pieceBoard.epSqBb
    this.ep = enPassant !== U64(0)
    return (capOrEp !== U64(0))
  }

  isThreat (pieceBoard) {
    return (this.parsePawnAttacks(pieceBoard, this.toBit) & (pieceBoard.blackMinorBb |
      pieceBoard.blackMajorBb)) !== U64(0)
  }

  isDoublePush (emptySq) {
    return Direction.wDoublePush(this.fromBit, emptySq) === this.toBit
  }

  parsePawnAttacks (pieceBoard, toBit) {
    switch (this.promoteTo) {
      case 'Q':
        return Direction.queenRays(toBit, pieceBoard.occupied, pieceBoard.occupiable)
      case 'R':
        return Direction.rookRays(toBit, pieceBoard.occupied, pieceBoard.occupiable)
      case 'B':
        return Direction.bishopRays(toBit, pieceBoard.occupied, pieceBoard.occupiable)
      case 'N':
        return Direction.knightAttacks(toBit)
      default:
        return Direction.wPawnAttacks(toBit)
    }
  }
}

class BlackPawnMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard, promotion, promoteTo) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || U64(0)
    this.toBit = BitHelper.setBit(U64(0), U64(toIdx))
    this.ep = false
    this.promotion = promotion
    this.promoteTo = promoteTo
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = this.isThreat(pieceBoard)
    this.fenChar = 'p'
    this.epRisk = this.isDoublePush(pieceBoard.emptySq) ? Mask.northOne(this.toBit) : U64(0)
  }

  isCheck (pieceBoard) {
    return ((this.parsePawnAttacks(pieceBoard, this.toBit) & pieceBoard.whiteKingBb) !==
      U64(0))
  }

  isCapture (pieceBoard) {
    const capOrEp = this.toBit & (pieceBoard.whiteBb | pieceBoard.epSqBb)
    const enPassant = this.toBit & pieceBoard.epSqBb
    this.ep = enPassant !== U64(0)
    return (capOrEp !== U64(0))
  }

  isThreat (pieceBoard) {
    return (this.parsePawnAttacks(pieceBoard, this.toBit) & (pieceBoard.whiteMinorBb |
      pieceBoard.whiteMajorBb)) !== U64(0)
  }

  isDoublePush (emptySq) {
    return Direction.bDoublePush(this.fromBit, emptySq) === this.toBit
  }

  parsePawnAttacks (pieceBoard, toBit) {
    switch (this.promoteTo) {
      case 'q':
        return Direction.queenRays(toBit, pieceBoard.occupied, pieceBoard.occupiable)
      case 'r':
        return Direction.rookRays(toBit, pieceBoard.occupied, pieceBoard.occupiable)
      case 'b':
        return Direction.bishopRays(toBit, pieceBoard.occupied, pieceBoard.occupiable)
      case 'n':
        return Direction.knightAttacks(toBit)
      default:
        return Direction.bPawnAttacks(toBit)
    }
  }
}

class WhiteKnightMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || U64(0)
    this.toBit = BitHelper.setBit(U64(0), U64(toIdx))
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = this.isThreat(pieceBoard)
    this.fenChar = 'N'
  }

  isCheck (pieceBoard) {
    return ((Direction.knightAttacks(this.toBit) & pieceBoard.blackKingBb) !==
      U64(0))
  }

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.blackBb) !== U64(0))
  }

  isThreat (pieceBoard) {
    return (Direction.knightAttacks(this.toBit) & pieceBoard.blackMajorBb) !==
      U64(0)
  }
}

class BlackKnightMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || U64(0)
    this.toBit = BitHelper.setBit(U64(0), U64(toIdx))
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = this.isThreat(pieceBoard)
    this.fenChar = 'n'
  }

  isCheck (pieceBoard) {
    return ((Direction.knightAttacks(this.toBit) & pieceBoard.whiteKingBb) !==
      U64(0))
  }

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.whiteBb) !== U64(0))
  }

  isThreat (pieceBoard) {
    return (Direction.knightAttacks(this.toBit) & pieceBoard.whiteMajorBb) !==
      U64(0)
  }
}

class WhiteBishopMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || U64(0)
    this.toBit = BitHelper.setBit(U64(0), U64(toIdx))
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = this.isThreat(pieceBoard)
    this.fenChar = 'B'
  }

  isCheck (pieceBoard) {
    return ((Direction.bishopRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
        pieceBoard.blackKingBb) !== U64(0))
  }

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.blackBb) !== U64(0))
  }

  isThreat (pieceBoard) {
    return (Direction.bishopRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
        pieceBoard.blackMajorBb) !== U64(0)
  }
}

class BlackBishopMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || U64(0)
    this.toBit = BitHelper.setBit(U64(0), U64(toIdx))
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = this.isThreat(pieceBoard)
    this.fenChar = 'b'
  }

  isCheck (pieceBoard) {
    return ((Direction.bishopRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
      pieceBoard.whiteKingBb) !== U64(0))
  }

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.whiteBb) !== U64(0))
  }

  isThreat (pieceBoard) {
    return (Direction.bishopRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
      pieceBoard.whiteMajorBb) !== U64(0)
  }
}

class WhiteRookMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || U64(0)
    this.toBit = BitHelper.setBit(U64(0), U64(toIdx))
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = this.isThreat(pieceBoard)
    this.fenChar = 'R'
  }

  isCheck (pieceBoard) {
    return ((Direction.rookRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
          pieceBoard.blackKingBb) !== U64(0))
  }

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.blackBb) !== U64(0))
  }

  isThreat (pieceBoard) {
    return (Direction.rookRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
      pieceBoard.blackQueenBb) !== U64(0)
  }
}

class BlackRookMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || U64(0)
    this.toBit = BitHelper.setBit(U64(0), U64(toIdx))
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = this.isThreat(pieceBoard)
    this.fenChar = 'r'
  }

  isCheck (pieceBoard) {
    return ((Direction.rookRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
          pieceBoard.whiteKingBb) !== U64(0))
  }

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.whiteBb) !== U64(0))
  }

  isThreat (pieceBoard) {
    return (Direction.rookRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
      pieceBoard.whiteQueenBb) !== U64(0)
  }
}

class WhiteQueenMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || U64(0)
    this.toBit = BitHelper.setBit(U64(0), U64(toIdx))
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = false
    this.fenChar = 'Q'
  }

  isCheck (pieceBoard) {
    return ((Direction.queenRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
          pieceBoard.blackKingBb) !== U64(0))
  }

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.blackBb) !== U64(0))
  }
}

class BlackQueenMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.to = toIdx
    this.from = fromIdx
    this.fromBit = fromBit || U64(0)
    this.toBit = BitHelper.setBit(U64(0), U64(toIdx))
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = false
    this.fenChar = 'q'
  }

  isCheck (pieceBoard) {
    return ((Direction.queenRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
          pieceBoard.whiteKingBb) !== U64(0))
  }

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.whiteBb) !== U64(0))
  }
}

class WhiteKingMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || U64(0)
    this.toBit = BitHelper.setBit(U64(0), U64(toIdx))
    this.castle = this.isCastle(fromIdx, toIdx)
    this.check = false
    this.capture = this.isCapture(pieceBoard)
    this.threat = false
    this.fenChar = 'K'
  }

  // TODO: isCheck for castling with rook
  // TODO: isThreat for threats against other pawns / pieces

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.blackBb) !== U64(0))
  }

  isCastle (fromIdx, toIdx) {
    const difference = toIdx - fromIdx
    return (difference === 2 || difference === -2)
  }
}

class BlackKingMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || U64(0)
    this.toBit = BitHelper.setBit(U64(0), U64(toIdx))
    this.castle = this.isCastle(fromIdx, toIdx)
    this.check = false
    this.capture = this.isCapture(pieceBoard)
    this.threat = false
    this.fenChar = 'k'
  }

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.whiteBb) !== U64(0))
  }

  isCastle (fromIdx, toIdx) {
    const difference = toIdx - fromIdx
    return (difference === 2 || difference === -2)
  }
}

module.exports = {
  WhitePawnMove: WhitePawnMove,
  BlackPawnMove: BlackPawnMove,
  Move: Move,
  MoveList: MoveList
}
