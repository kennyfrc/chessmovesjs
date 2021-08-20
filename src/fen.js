class FenReader {
  static finishedReadingBoard (ranksRead, whiteSpace) {
    return ranksRead === 8 && whiteSpace >= 1
  }

  static isSidetoMove (fenChar) {
    return 'wb'.includes(fenChar)
  }

  static isCastlingSymbol (fenChar) {
    return 'KQkq'.includes(fenChar)
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
