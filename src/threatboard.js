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

  static threats(byPieceOrSide, boardProxyNoKing, findCheckers = false, board = U64(0)) {
    let threats = U64(0);
    Pieces.for(byPieceOrSide).forEach((fenPiece) => {
      const pieceBoard = boardProxyNoKing.pieceBoardList[fenPiece];
      SquareHelper.indicesFor(pieceBoard.bb).forEach((sq) => {
        const pieceBb = BitHelper.setBit(U64(0), sq);
        if (findCheckers) {
          threats |= PieceStatus.isPawn(fenPiece) ? pieceBoard.rawPawnAttacks(pieceBb, board) : 
            pieceBoard.attacks(pieceBb, boardProxyNoKing);
          board.setCheckers(threats, fenPiece, pieceBb, boardProxyNoKing);
        } else {
          threats |= pieceBoard.attacks(pieceBb, boardProxyNoKing);
        }
      });
    });
    return threats;
  }

  static kingDangerSqs(side, board) {
    const sideToAttack = side === 'w' ? 'b' : 'w';
    const kingToMove = side === 'w' ? 'K' : 'k';
    const pawnAttacks = sideToAttack === 'w' ?
      Direction.wPawnAttacks(board.pieceBoardList.P.bb) :
      Direction.bPawnAttacks(board.pieceBoardList.p.bb);
    const opponentsSide = sideToAttack;
    const boardProxyNoKing = new BoardProxy(board);
    boardProxyNoKing.bb ^= boardProxyNoKing.pieceBoardList[kingToMove].bb;

    return this.threats(opponentsSide, boardProxyNoKing, true, board) | pawnAttacks;
  }

  static xrayDangerSqs(board) {
    const opponentsSide = board.whiteToMove ? 'bs' : 'ws';
    const blockers = board.getBlockers();
    const boardProxyNoBlockers = new BoardProxy(board);
    if (blockers === U64(0)) { return U64(0) };
    boardProxyNoBlockers.bb = boardProxyNoBlockers.bb ^ blockers;
    const xrayAttacks = this.for(opponentsSide, boardProxyNoBlockers);
    return xrayAttacks;
  }
}

module.exports = {
  ThreatBoard: ThreatBoard,
}