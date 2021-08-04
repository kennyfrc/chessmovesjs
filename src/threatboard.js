const Pieces = require('./pieces.js').Pieces;
const BitHelper = require('./helpers.js').BitHelper;
const SquareHelper = require('./helpers.js').SquareHelper;
const U64 = require('./helpers.js').U64;
const Direction = require('./attack.js').Direction;
const ViewHelper = require('./helpers.js').ViewHelper;
const PieceStatus = require('./pieces.js').PieceStatus;
const BoardProxy = require('./boardproxy.js').BoardProxy;

class ThreatBoard {
  static for(byPieceOrSide = 'all', board) {
    return this.threats(byPieceOrSide, board);
  }

  static threats(byPieceOrSide, board) {
    return Pieces.for(byPieceOrSide)
            .map((fenPiece) => board.pieceBoardList[fenPiece])
            .map((pieceBoard) => SquareHelper.indicesFor(pieceBoard.bb)
              .map((sq) => BitHelper.setBit(U64(0), sq))
              .map((pieceBb) => pieceBoard.attacks(pieceBb, board))
              .reduce((accThreats, currThreats) => accThreats | currThreats, U64(0)))
            .reduce((accThreats, currThreats) => accThreats | currThreats, U64(0))
  }
}

module.exports = {
  ThreatBoard: ThreatBoard,
}