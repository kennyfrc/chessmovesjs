type FenChar = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' | 'k' | 'q' | 'r' | 'b' | 'n' | 'p'

const FEN_CHARS = 'KQRBNPkqrbnp'

/**
 * Piece types index Board#bitboards. A black piece is its white
 * counterpart + 6, so `color * 6 + type` finds any piece.
 */
const Piece = {
  KING: 0,
  QUEEN: 1,
  ROOK: 2,
  BISHOP: 3,
  KNIGHT: 4,
  PAWN: 5
}

// Board#bitboards slots after the 12 piece boards
const BoardSlot = {
  WHITE: 12,
  BLACK: 13,
  OCCUPIED: 14,
  POS_KEY: 15
}

class Pieces {
  static indexFor (fenChar: string): number {
    return FEN_CHARS.indexOf(fenChar)
  }

  static fenCharFor (index: number): FenChar | undefined {
    return FEN_CHARS[index] as FenChar | undefined
  }

  static for (fromPieceOrSide: string): FenChar[] {
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
          return [fromPieceOrSide as FenChar]
        } else {
          throw new Error('Invalid Piece or Side')
        }
    }
  }
}

class PieceStatus {
  static isPawn (fenPiece: string): boolean {
    return 'Pp'.includes(fenPiece)
  }

  static isNotPawn (fenPiece: string): boolean {
    return 'KQRBNkqrbn'.includes(fenPiece)
  }
}

export {
  Piece,
  BoardSlot,
  Pieces,
  PieceStatus
}
export type { FenChar }
