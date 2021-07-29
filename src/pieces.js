class Pieces {
  static for(fromPieceOrSide) {
    switch (fromPieceOrSide) {
      case 'w':
        return ['K', 'Q', 'R', 'B', 'N', 'P'];
      case 'b':
        return ['k', 'q', 'r', 'b', 'n', 'p'];;
      default:
        return ['K', 'Q', 'R', 'B', 'N', 'P', 'k', 'q', 'b', 'r', 'n', 'p'];
    }
  }
}

module.exports = {
  Pieces: Pieces,
}