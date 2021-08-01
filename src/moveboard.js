const Pieces = require('./pieces.js').Pieces;
const BitHelper = require('./helpers.js').BitHelper;
const SquareHelper = require('./helpers.js').SquareHelper;
const U64 = require('./helpers.js').U64;

class MoveBoard {
  static for(byPieceOrSide, board) {
    return this.attacks(byPieceOrSide, board);
  }

  static attacks(byPieceOrSide, board) {
    let moves = U64(0);
    Pieces.for(byPieceOrSide).forEach((fenPiece) => {
      let pieceBoard = board.pieceBoardList[fenPiece];
      SquareHelper.indicesFor(pieceBoard.bb).forEach((sq) => {
        let bb = BitHelper.setBit(U64(0), sq);
        moves |= pieceBoard.attacks(bb, board);
      });
    });
    return moves;
  }
}

module.exports = {
  MoveBoard: MoveBoard,
}