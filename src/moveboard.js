const Pieces = require('./pieces.js').Pieces;
const BitHelper = require('./helpers.js').BitHelper;
const SquareHelper = require('./helpers.js').SquareHelper;
const U64 = require('./helpers.js').U64;
const Direction = require('./attack.js').Direction;
const ViewHelper = require('./helpers.js').ViewHelper;

class MoveBoard {
  static for(byPieceOrSide = 'all', board) {
    return this.attacks(byPieceOrSide, board);
  }

  static attacks(byPieceOrSide, board, findCheckers = false, boardToMutate = U64(0)) {
    let moves = U64(0);
    Pieces.for(byPieceOrSide).forEach((fenPiece) => {
      let pieceBoard = board.pieceBoardList[fenPiece];
      SquareHelper.indicesFor(pieceBoard.bb).forEach((sq) => {
        let pieceBb = BitHelper.setBit(U64(0), sq);
        if (findCheckers) {
          moves |= this.isPawn(fenPiece) ? this.setPawnAttacks(pieceBb, boardToMutate, pieceBoard) : 
            pieceBoard.attacks(pieceBb, board);
          const kingBb = board.whiteToMove ? board.whiteKingBb : board.blackKingBb;
          boardToMutate.checkersBb |= (moves & kingBb) !== U64(0) ? pieceBb : U64(0);
          boardToMutate.checkingPiece = (moves & kingBb) !== U64(0) ? fenPiece : undefined;
        } else {
          moves |= pieceBoard.attacks(pieceBb, board);
        }
      });
    });
    return moves;
  }

  static isPawn(fenPiece) {
    return 'Pp'.includes(fenPiece);
  }

  static setPawnAttacks(bb, board, pieceBoard) {
    pieceBoard.setContext(board);
    return pieceBoard.pawnAttacks(bb);
  }

  static kingDangerSqs(side, board) {
    const sideToAttack = side === 'w' ? 'b' : 'w';
    const kingToMove = side === 'w' ? 'K' : 'k';
    const pawnAttacks = sideToAttack === 'w' ?
      Direction.wPawnAttacks(board.pieceBoardList.P.bb) :
      Direction.bPawnAttacks(board.pieceBoardList.p.bb);
    const piecesToCheck = sideToAttack;
    const boardWNoKingToMove = Object.assign({}, board);
    boardWNoKingToMove.bb ^= boardWNoKingToMove.pieceBoardList[kingToMove].bb;

    return this.attacks(piecesToCheck, boardWNoKingToMove, true, board) | pawnAttacks;
  }
}

module.exports = {
  MoveBoard: MoveBoard,
}