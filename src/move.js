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
const ThreatBoard = require('./threatboard.js').ThreatBoard;
const Pieces = require('./pieces.js').Pieces;
const PieceStatus = require('./pieces.js').PieceStatus;

class MoveList {
  static for(fenPiece, board) {
    let moveList = [];
    const pieceBoard = board.pieceBoardList[fenPiece];
    SquareHelper.indicesFor(pieceBoard.bb).forEach((fromIdx) => {
      const pieceBb = BitHelper.setBit(U64(0), fromIdx);
      let attacks = CheckEvasions.filter(fenPiece, pieceBoard, pieceBb, board);
      attacks = Pins.filter(fenPiece, attacks, pieceBb, board)
      const toIdxs = SquareHelper.indicesFor(attacks);
      moveList.push(this.createMove(fenPiece, fromIdx, toIdxs, pieceBoard));
    });
    return moveList.flat();
  }

  static legalMoves(board) {
    return board.whiteToMove ? this.addLegalWhiteMoves(board) :
      this.addLegalBlackMoves(board)
  }

  static createMove(fenPiece, fromIdx, toIdxs, pieceBoard) {
    return toIdxs.map((toIdx) => Move.for(fenPiece, fromIdx, toIdx, pieceBoard))
  }

  static pieceMoves(fenPiece, pieceBoard, pieceBb, board) {
    let moves = pieceBoard.attacks(pieceBb, board);
    let kingInCheckMoves;
    switch (fenPiece) {
      case 'K':
        kingInCheckMoves = moves & board.whiteKingDangerSquares;
        return moves ^ kingInCheckMoves;
      case 'k':
        kingInCheckMoves = moves & board.blackKingDangerSquares;
        return moves ^ kingInCheckMoves;
      default:
        return moves;
    }
  }

  static addLegalWhiteMoves(board) {
    return Pieces.for('w').map((piece) => MoveList.for(piece, board)).flat()
  }

  static addLegalBlackMoves(board) {
    return Pieces.for('b').map((piece) => MoveList.for(piece, board)).flat()
  }
}

class Pins {
  static filter(fenPiece, attacks, pieceBb, board) {
    if (board.isOurKingXrayed) {
      const ourKingBb = board.whiteToMove ? board.whiteKingBb : board.blackKingBb;
      const theyOccupied = board.whiteToMove ? board.blackBb : board.whiteBb
      const kingSourceSq = BitHelper.bitScanFwd(ourKingBb);
      const pinnerDirectionFromKing = Mask.mooreNeighborhood(ourKingBb) & board.xrayDangerSqs;
      const sqThatPointsToPinner = BitHelper.bitScanFwd(pinnerDirectionFromKing);
      const pinnerRay = Ray.for(kingSourceSq, sqThatPointsToPinner, theyOccupied);
      const pinnedPiece = pinnerRay & pieceBb ? pieceBb : U64(0);
      return pinnedPiece ? attacks & pinnerRay : attacks;
    }
    return attacks;
  }
}

class CheckEvasions {
  static filter(fenPiece, pieceBoard, pieceBb, board) {
    let pieceMoves = U64(0);
    if (this.isMultiCheckAndNotKing(board, fenPiece)) { return pieceMoves }; 
    if (this.isSingleCheckAndNotKing(board, fenPiece)) {
      pieceMoves |= MoveList.pieceMoves(fenPiece, pieceBoard, pieceBb, board);
      pieceMoves &= this.manageCheckers(fenPiece, board, pieceMoves);
      return pieceMoves;
    }
    return MoveList.pieceMoves(fenPiece, pieceBoard, pieceBb, board);
  }

  static isSingleCheckAndNotKing(board, fenPiece) {
    return board.checkerCount === 1 && 'QRBNPqrbnp'.includes(fenPiece);
  }

  static isMultiCheckAndNotKing(board, fenPiece) {
    return board.checkerCount > 1 && 'QRBNPqrbnp'.includes(fenPiece);
  }

  static manageCheckers(fenPiece, board, attacks) {
    const captureCheckers = this.findCheckersToCapture(fenPiece, board, attacks);
    const blockCheckers = attacks & this.findWaysToBlockCheckers(fenPiece, board, attacks);
    return captureCheckers | blockCheckers;
  }

  static findCheckersToCapture(fenPiece, board, attacks) {
    if (PieceStatus.isPawn(fenPiece)) {
      return (attacks & board.epSqBb) | (attacks & board.checkersBb); 
    }
    return (attacks & board.checkersBb);
  }

  static findWaysToBlockCheckers(fenPiece, board, attacks) {
    const kingBb = board.whiteToMove ? board.whiteKingBb : board.blackKingBb;
    const kingSourceSq = BitHelper.bitScanFwd(kingBb);
    const occupiable = board.whiteToMove ? ~board.whiteBb : ~board.blackBb;
    const checkerDirectionFromKing = Mask.mooreNeighborhood(kingBb) & board.kingDangerSquares;
    const sqThatPointsToChecker = BitHelper.bitScanFwd(checkerDirectionFromKing);
    const checkerRay = Ray.for(kingSourceSq, sqThatPointsToChecker, board.bb);
    return checkerRay;
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
