class Pieces {
  static for(fromPieceOrSide) {
    switch (fromPieceOrSide) {
      case 'w':
        return ['K', 'Q', 'R', 'B', 'N', 'P'];
      case 'b':
        return ['k', 'q', 'r', 'b', 'n', 'p'];
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