const Pieces = require('./pieces.js').Pieces;
const BitHelper = require('./helpers.js').BitHelper;
const SquareHelper = require('./helpers.js').SquareHelper;
const U64 = require('./helpers.js').U64;
const Direction = require('./attack.js').Direction;
const ViewHelper = require('./helpers.js').ViewHelper;

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

  static kingDangerSqs(side, board) {
    const sideToAttack = side === 'w' ? 'b' : 'w';
    const kingToMove = side === 'w' ? 'K' : 'k';
    const pawnAttacks = sideToAttack === 'w' ?
      Direction.wPawnAttacks(board.pieceBoardList.P.bb) :
      Direction.bPawnAttacks(board.pieceBoardList.p.bb);
    const piecesToCheckNoPawn = sideToAttack + 'np';
    const boardWNoKingToMove = board;
    boardWNoKingToMove.bb ^= boardWNoKingToMove.pieceBoardList[kingToMove].bb;

    return this.attacks(piecesToCheckNoPawn, boardWNoKingToMove) | pawnAttacks;
  }
}

module.exports = {
  MoveBoard: MoveBoard,
}