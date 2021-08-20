class Pieces {
  static for (fromPieceOrSide) {
    switch (fromPieceOrSide) {
      case 'w':
        return ['K', 'Q', 'R', 'B', 'N', 'P']
      case 'b':
        return ['k', 'q', 'r', 'b', 'n', 'p']
      case 'ws': // white sliders
        return ['Q', 'R', 'B']
      case 'bs': // black sliders
        return ['q', 'r', 'b']
      case 'wp': // promotion pieces white
        return ['Q', 'R', 'B', 'N']
      case 'bp': // promotion pieces black
        return ['q', 'r', 'b', 'n']
      case 'all':
        return ['K', 'Q', 'R', 'B', 'N', 'P', 'k', 'q', 'b', 'r', 'n', 'p']
      default:
        if ('KQRBNPkqrbnp'.includes(fromPieceOrSide)) {
          return [fromPieceOrSide]
        } else {
          throw new Error('Invalid Piece or Side')
        }
    }
  }
}

class PieceStatus {
  static isPawn (fenPiece) {
    return 'Pp'.includes(fenPiece)
  }

  static isNotPawn (fenPiece) {
    return 'KQRBNkqrbn'.includes(fenPiece)
  }
}

module.exports = {
  Pieces: Pieces,
  PieceStatus: PieceStatus
}
