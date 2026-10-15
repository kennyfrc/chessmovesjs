class FenReader {
  static finishedReadingBoard (ranksRead, whiteSpace) {
    return ranksRead === 8 && whiteSpace >= 1
  }

  // fields are separated by spaces: board, side, castling, en passant, clocks
  static isSidetoMove (fenChar, whiteSpace) {
    return 'wb'.includes(fenChar) && whiteSpace === 1
  }

  static isCastlingSymbol (fenChar, whiteSpace) {
    return 'KQkq'.includes(fenChar) && whiteSpace === 2
  }

  static isWhitePiece (fenChar) {
    return 'KQRBNP'.includes(fenChar)
  }

  static isBlackPiece (fenChar) {
    return 'kqrbnp'.includes(fenChar)
  }

  static isEmptySquare (fenChar) {
    return '12345678'.includes(fenChar)
  }

  static isNewRank (fenChar) {
    return fenChar === '/'
  }

  static isSpace (fenChar) {
    return fenChar === ' '
  }

  static isEnPassantChar (fenChar, whiteSpace) {
    return !'- '.includes(fenChar) && whiteSpace === 3
  }

  static isHalfMoveClock (fenChar, whiteSpace) {
    return !' '.includes(fenChar) && whiteSpace === 4
  }

  static isFullMoveNo (fenChar, whiteSpace) {
    return !' '.includes(fenChar) && whiteSpace === 5
  }

  static isUndefined (fenChar) {
    return fenChar === undefined
  }
}

module.exports = {
  FenReader: FenReader
}
