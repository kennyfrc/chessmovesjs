class FenReader {
  static finishedReadingBoard (ranksRead: number, whiteSpace: number): boolean {
    return ranksRead === 8 && whiteSpace >= 1
  }

  // fields are separated by spaces: board, side, castling, en passant, clocks
  static isSidetoMove (fenChar: string, whiteSpace: number): boolean {
    return 'wb'.includes(fenChar) && whiteSpace === 1
  }

  static isCastlingSymbol (fenChar: string, whiteSpace: number): boolean {
    return 'KQkq'.includes(fenChar) && whiteSpace === 2
  }

  static isWhitePiece (fenChar: string): boolean {
    return 'KQRBNP'.includes(fenChar)
  }

  static isBlackPiece (fenChar: string): boolean {
    return 'kqrbnp'.includes(fenChar)
  }

  static isEmptySquare (fenChar: string): boolean {
    return '12345678'.includes(fenChar)
  }

  static isNewRank (fenChar: string): boolean {
    return fenChar === '/'
  }

  static isSpace (fenChar: string | undefined): boolean {
    return fenChar === ' '
  }

  static isEnPassantChar (fenChar: string, whiteSpace: number): boolean {
    return !'- '.includes(fenChar) && whiteSpace === 3
  }

  static isHalfMoveClock (fenChar: string, whiteSpace: number): boolean {
    return !' '.includes(fenChar) && whiteSpace === 4
  }

  static isFullMoveNo (fenChar: string, whiteSpace: number): boolean {
    return !' '.includes(fenChar) && whiteSpace === 5
  }

  static isUndefined (fenChar: string | undefined): boolean {
    return fenChar === undefined
  }
}

export {
  FenReader
}
