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

  // not sure how to best remove / extract setCheckers()
  static pawnThreats(boardProxy, board, fenPiece) {
    const pieceBoard = boardProxy.pieceBoardList[fenPiece];
    return SquareHelper.indicesFor(pieceBoard.bb)
      .map((sq) => BitHelper.setBit(U64(0), sq))
      .map((pieceBb) => {
        const threats = pieceBoard.rawPawnAttacks(pieceBb, boardProxy);
        board.setCheckers(threats, pieceBb, boardProxy);
        return threats;
      })
      .reduce((accThreats, currThreats) => accThreats | currThreats, U64(0))
  }

  static pieceThreats(boardProxy, board, fenPiece) {
    const pieceBoard = boardProxy.pieceBoardList[fenPiece];
    return SquareHelper.indicesFor(pieceBoard.bb)
      .map((sq) => BitHelper.setBit(U64(0), sq))
      .map((pieceBb) => {
        const threats = pieceBoard.attacks(pieceBb, boardProxy);
        board.setCheckers(threats, pieceBb, boardProxy);
        return threats;
      })
      .reduce((accThreats, currThreats) => accThreats | currThreats, U64(0))
  }

  static kingDangerThreats(byPieceOrSide, boardProxyNoKing, findCheckers = false, board = U64(0)) {
    return Pieces.for(byPieceOrSide)
            .map((fenPiece) => PieceStatus.isPawn(fenPiece) ? this.pawnThreats(boardProxyNoKing, board, fenPiece) :
                this.pieceThreats(boardProxyNoKing, board, fenPiece))
            .reduce((accThreats, currThreats) => accThreats | currThreats, U64(0));;
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

    return this.kingDangerThreats(opponentsSide, boardProxyNoKing, true, board) | pawnAttacks;
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