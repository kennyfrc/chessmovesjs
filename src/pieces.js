class Pieces {
  static for(fromPieceOrSide) {
    switch (fromPieceOrSide) {
      case 'w':
        return ['K', 'Q', 'R', 'B', 'N', 'P'];
      case 'b':
        return ['k', 'q', 'r', 'b', 'n', 'p'];
      case 'wnp':
        return ['K', 'Q', 'R', 'B', 'N'];
      case 'bnp':
        return ['k', 'q', 'r', 'b', 'n'];
      case undefined:
        return ['K', 'Q', 'R', 'B', 'N', 'P', 'k', 'q', 'b', 'r', 'n', 'p'];
      default:
        if ('KQRBNPkqrbnp'.includes(fromPieceOrSide)) {
          return [fromPieceOrSide];
        } else {
          throw new Error('Invalid Piece or Side');
        }
    }
  }
}

module.exports = {
  Pieces: Pieces,
}