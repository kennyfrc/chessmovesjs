const SquareHelper = require('./helpers.js').SquareHelper
const BitHelper = require('./helpers.js').BitHelper
const CastleRights = require('./helpers.js').CastleRights
const Ray = require('./attack.js').Ray
const Direction = require('./attack.js').Direction
const SQUARE_BB = require('./attack.js').SQUARE_BB
const KNIGHT_ATTACKS = require('./attack.js').KNIGHT_ATTACKS
const KING_ATTACKS = require('./attack.js').KING_ATTACKS
const PAWN_ATTACKS = require('./attack.js').PAWN_ATTACKS
const ROOK_RAYS = require('./attack.js').ROOK_RAYS
const BISHOP_RAYS = require('./attack.js').BISHOP_RAYS
const BETWEEN = require('./attack.js').BETWEEN
const LINE = require('./attack.js').LINE
const Mask = require('./mask.js').Mask
const Pieces = require('./pieces.js').Pieces
const Piece = require('./pieces.js').Piece
const BoardSlot = require('./pieces.js').BoardSlot

const ALL_SQUARES = 0xFFFFFFFFFFFFFFFFn
const EMPTY = -1

// a move code is one int: from | to << 6 | kind << 12
const MoveKind = {
  QUIET: 0,
  DOUBLE_PUSH: 1,
  CASTLE: 2,
  EN_PASSANT: 3,
  PROMOTE_QUEEN: 4,
  PROMOTE_ROOK: 5,
  PROMOTE_BISHOP: 6,
  PROMOTE_KNIGHT: 7
}

/**
 * Scratch bitboards for the generator. Writing into GEN keeps BigInt math
 * unboxed; GEN32 reads slot s back as two ints, GEN32[2s] (squares 0-31)
 * and GEN32[2s + 1] (squares 32-63).
 */
const TARGETS = 0 // where our non-king pieces may land
const CHECKERS = 1
const MOVES = 2 // destinations of the piece being expanded
const PIECES = 3
const SNIPERS = 4
const BLOCKERS = 5
const KING_OCC = 6
const EP_OCC = 7
const EP_PAWNS = 8
const EP_ATTACKERS = 9
const PINNED = 10 // our pinned pieces
const PAWNS = 11
const EMPTY_SQS = 12
const PUSHES = 13
const DOUBLE_PUSHES = 14
const WEST_CAPTURES = 15 // toward the a-file
const EAST_CAPTURES = 16 // toward the h-file
const PROMOTIONS = 17
const THEIR_ROOKS = 18 // their rooks and queens
const THEIR_BISHOPS = 19 // their bishops and queens
const ATTACKERS = 20
const ATTACKS = 21 // one slider's attacks, before masking
const PAWN_TARGETS = 22 // generateCaptures: captures plus promotion squares
const CHECK_SQUARES = 23 // Checks: 4 slots, one per piece type that can check
const DISCOVERERS = 27 // our pieces blocking our own slider's line to their king
const CHECKING = 28 // generateQuietChecks: where the piece being expanded would check
const GEN = new BigUint64Array(29)
const GEN32 = new Int32Array(GEN.buffer)
const LINE32 = new Int32Array(LINE.buffer)

const NOT_FILE_A = 0xFEFEFEFEFEFEFEFEn
const NOT_FILE_H = 0x7F7F7F7F7F7F7F7Fn
const RANK_4 = 0x00000000FF000000n
const RANK_5 = 0x000000FF00000000n
const RANK_1_AND_8 = 0xFF000000000000FFn
const RANK_2_TO_7 = 0x00FFFFFFFFFFFF00n

class MoveList {
  static for (fenPiece, board) {
    if (fenPiece === 'all') { return this.legalMoves(board) }
    if ('KQRBNP'.includes(fenPiece) === board.whiteToMove) {
      return this.legalMoves(board).filter((move) => move.fenChar === fenPiece)
    }
    // the other side's moves, as if it were their turn
    const epSq = board.epSq
    board.whiteToMove = !board.whiteToMove
    board.epSq = EMPTY
    const moves = this.legalMoves(board).filter((move) => move.fenChar === fenPiece)
    board.whiteToMove = !board.whiteToMove
    board.epSq = epSq
    return moves
  }

  static legalMoves (board) {
    const codes = new Int32Array(256)
    const count = this.generate(board, codes, 0)
    return this.createMoves(board, codes, count)
  }

  static createMoves (board, codes, count) {
    const moveList = []
    for (let i = 0; i < count; i++) {
      const code = codes[i]
      const from = code & 63
      const fenChar = Pieces.fenCharFor(board.squares[from])
      const pieceBoard = board.pieceBoardList[fenChar]
      const promoteTo = this.promoteToFor(code, board.whiteToMove)
      pieceBoard.setContext(board)
      const move = Move.for(fenChar, SQUARE_BB[from], from, (code >> 6) & 63, pieceBoard, promoteTo !== null, promoteTo)
      move.code = code
      moveList.push(move)
    }
    return moveList
  }

  static promoteToFor (code, whiteToMove) {
    const kind = code >>> 12
    if (kind < MoveKind.PROMOTE_QUEEN) { return null }
    const fenChar = 'QRBN'[kind - MoveKind.PROMOTE_QUEEN]
    return whiteToMove ? fenChar : fenChar.toLowerCase()
  }

  static uciFor (code) {
    const promoteTo = this.promoteToFor(code, false) || ''
    return SquareHelper.uciFor({ from: code & 63, to: (code >> 6) & 63 }) + promoteTo
  }

  /**
   * Writes every legal move for the side to move into moves[n...] as move
   * codes and returns the new end. Moves come out by piece (K, Q, R, B, N,
   * P), then by from-square, then by to-square.
   */
  static generate (board, moves, n) {
    const color = board.whiteToMove ? 0 : 1
    const kingSq = board.kingSqs[color]
    const checkerCount = CheckEvasions.setTargets(board, color, kingSq)
    n = this.addKingMoves(board, moves, n, color, kingSq, checkerCount)
    if (checkerCount > 1) { return n }
    n = this.addPieceMoves(board, moves, n, color, kingSq, Piece.QUEEN)
    n = this.addPieceMoves(board, moves, n, color, kingSq, Piece.ROOK)
    n = this.addPieceMoves(board, moves, n, color, kingSq, Piece.BISHOP)
    n = this.addPieceMoves(board, moves, n, color, kingSq, Piece.KNIGHT)
    return this.addPawnMoves(board, moves, n, color, kingSq)
  }

  /**
   * Writes the legal captures and promotions for the side to move, the moves
   * quiescence search looks at. They are the moves of generate() that take
   * a piece or promote, with the pawn moves in another order.
   */
  static generateCaptures (board, moves, n) {
    const bbs = board.bitboards
    const color = board.whiteToMove ? 0 : 1
    const kingSq = board.kingSqs[color]
    const checkerCount = CheckEvasions.setTargets(board, color, kingSq)
    n = this.addKingCaptures(board, moves, n, color, kingSq)
    if (checkerCount > 1) { return n }
    // a pawn may also push onto an empty promotion square
    GEN[PAWN_TARGETS] = GEN[TARGETS] & (bbs[BoardSlot.BLACK - color] | RANK_1_AND_8)
    GEN[TARGETS] = GEN[TARGETS] & bbs[BoardSlot.BLACK - color]
    n = this.addPieceMoves(board, moves, n, color, kingSq, Piece.QUEEN)
    n = this.addPieceMoves(board, moves, n, color, kingSq, Piece.ROOK)
    n = this.addPieceMoves(board, moves, n, color, kingSq, Piece.BISHOP)
    n = this.addPieceMoves(board, moves, n, color, kingSq, Piece.KNIGHT)
    GEN[TARGETS] = GEN[PAWN_TARGETS]
    return this.addPawnCaptures(board, moves, n, color, kingSq)
  }

  /**
   * Writes the legal moves generateCaptures leaves out: castling and the
   * king, piece and pawn moves onto empty squares that do not promote. The
   * two lists together hold exactly the moves generate() writes.
   */
  static generateQuiets (board, moves, n) {
    const bbs = board.bitboards
    const color = board.whiteToMove ? 0 : 1
    const kingSq = board.kingSqs[color]
    const checkerCount = CheckEvasions.setTargets(board, color, kingSq)
    n = this.addKingQuiets(board, moves, n, color, kingSq, checkerCount)
    if (checkerCount > 1) { return n }
    GEN[EMPTY_SQS] = bbs[BoardSlot.OCCUPIED] ^ ALL_SQUARES
    GEN[TARGETS] = GEN[TARGETS] & GEN[EMPTY_SQS]
    n = this.addPieceMoves(board, moves, n, color, kingSq, Piece.QUEEN)
    n = this.addPieceMoves(board, moves, n, color, kingSq, Piece.ROOK)
    n = this.addPieceMoves(board, moves, n, color, kingSq, Piece.BISHOP)
    n = this.addPieceMoves(board, moves, n, color, kingSq, Piece.KNIGHT)
    GEN[TARGETS] = GEN[TARGETS] & RANK_2_TO_7
    return this.addPawnPushes(board, moves, n, color, kingSq)
  }

  /**
   * Writes the quiet moves that may give check: onto a square that attacks
   * their king, any move of a piece that uncovers a check, and castling.
   * When no quiet move can lift the score to alpha, these are the only
   * quiet moves the search needs. Fills out[at...] as Checks.setSquares
   * does, so givesCheck can tell which ones really check.
   */
  static generateQuietChecks (board, moves, n, out, at) {
    const bbs = board.bitboards
    const color = board.whiteToMove ? 0 : 1
    const kingSq = board.kingSqs[color]
    const checkerCount = CheckEvasions.setTargets(board, color, kingSq)
    Checks.setSquares(board, out, at)
    n = this.addKingChecks(board, moves, n, color, kingSq, checkerCount)
    if (checkerCount > 1) { return n }
    GEN[EMPTY_SQS] = bbs[BoardSlot.OCCUPIED] ^ ALL_SQUARES
    GEN[TARGETS] = GEN[TARGETS] & GEN[EMPTY_SQS]
    GEN[CHECKING] = GEN[CHECK_SQUARES + 2] | GEN[CHECK_SQUARES + 3]
    n = this.addPieceChecks(board, moves, n, color, kingSq, Piece.QUEEN)
    GEN[CHECKING] = GEN[CHECK_SQUARES + 3]
    n = this.addPieceChecks(board, moves, n, color, kingSq, Piece.ROOK)
    GEN[CHECKING] = GEN[CHECK_SQUARES + 2]
    n = this.addPieceChecks(board, moves, n, color, kingSq, Piece.BISHOP)
    GEN[CHECKING] = GEN[CHECK_SQUARES]
    n = this.addPieceChecks(board, moves, n, color, kingSq, Piece.KNIGHT)
    GEN[TARGETS] = GEN[TARGETS] & RANK_2_TO_7
    return this.addPawnChecks(board, moves, n, color, kingSq)
  }

  static isInCheck (board) {
    const bbs = board.bitboards
    const color = board.whiteToMove ? 0 : 1
    const them = 6 - color * 6
    GEN[KING_OCC] = bbs[BoardSlot.OCCUPIED]
    GEN[THEIR_ROOKS] = bbs[them + Piece.ROOK] | bbs[them + Piece.QUEEN]
    GEN[THEIR_BISHOPS] = bbs[them + Piece.BISHOP] | bbs[them + Piece.QUEEN]
    return KingSafety.isAttacked(board, board.kingSqs[color], color)
  }

  /**
   * The number of legal moves, same as generate() would write. Perft
   * calls it at the last ply, where only the count matters, so each
   * piece's destinations are counted instead of written out.
   */
  static count (board) {
    const color = board.whiteToMove ? 0 : 1
    const kingSq = board.kingSqs[color]
    const checkerCount = CheckEvasions.setTargets(board, color, kingSq)
    this.setKingMoves(board, color, kingSq, checkerCount)
    let count = this.countMoves()
    if (checkerCount > 1) { return count }
    count += this.countRookMoves(board, color, kingSq)
    count += this.countBishopMoves(board, color, kingSq)
    count += this.countKnightMoves(board, color)
    return count + this.countPawnMoves(board, color, kingSq)
  }

  // a queen moves like a rook plus a bishop, so both counts include it
  static countRookMoves (board, color, kingSq) {
    const bbs = board.bitboards
    let count = 0
    GEN[PIECES] = bbs[color * 6 + Piece.ROOK] | bbs[color * 6 + Piece.QUEEN]
    for (let half = 0; half < 2; half++) {
      let pieces = GEN32[2 * PIECES + half]
      while (pieces !== 0) {
        const from = (half << 5) | (31 - Math.clz32(pieces & -pieces))
        pieces &= pieces - 1
        Ray.setRookAttacks(GEN, MOVES, from, bbs, BoardSlot.OCCUPIED)
        GEN[MOVES] = GEN[MOVES] & GEN[TARGETS]
        if (Pins.isPinned(from)) { GEN[MOVES] = GEN[MOVES] & LINE[kingSq * 64 + from] }
        count += this.countMoves()
      }
    }
    return count
  }

  static countBishopMoves (board, color, kingSq) {
    const bbs = board.bitboards
    let count = 0
    GEN[PIECES] = bbs[color * 6 + Piece.BISHOP] | bbs[color * 6 + Piece.QUEEN]
    for (let half = 0; half < 2; half++) {
      let pieces = GEN32[2 * PIECES + half]
      while (pieces !== 0) {
        const from = (half << 5) | (31 - Math.clz32(pieces & -pieces))
        pieces &= pieces - 1
        Ray.setBishopAttacks(GEN, MOVES, from, bbs, BoardSlot.OCCUPIED)
        GEN[MOVES] = GEN[MOVES] & GEN[TARGETS]
        if (Pins.isPinned(from)) { GEN[MOVES] = GEN[MOVES] & LINE[kingSq * 64 + from] }
        count += this.countMoves()
      }
    }
    return count
  }

  // a pinned knight can never move
  static countKnightMoves (board, color) {
    let count = 0
    GEN[PIECES] = board.bitboards[color * 6 + Piece.KNIGHT]
    GEN[PIECES] = GEN[PIECES] ^ (GEN[PIECES] & GEN[PINNED])
    for (let half = 0; half < 2; half++) {
      let pieces = GEN32[2 * PIECES + half]
      while (pieces !== 0) {
        const from = (half << 5) | (31 - Math.clz32(pieces & -pieces))
        pieces &= pieces - 1
        GEN[MOVES] = KNIGHT_ATTACKS[from] & GEN[TARGETS]
        count += this.countMoves()
      }
    }
    return count
  }

  /**
   * Counts all unpinned pawns at once by shifting the pawn board.
   * Pinned pawns and en passant are rare and go one pawn at a time.
   */
  static countPawnMoves (board, color, kingSq) {
    const bbs = board.bitboards
    GEN[PAWNS] = bbs[color * 6 + Piece.PAWN]
    let count = this.countEnPassant(board, color, kingSq)
    if ((GEN32[2 * PINNED] | GEN32[2 * PINNED + 1]) !== 0) {
      count += this.countPinnedPawnMoves(board, color, kingSq)
      GEN[PAWNS] = GEN[PAWNS] ^ (GEN[PAWNS] & GEN[PINNED])
    }
    GEN[EMPTY_SQS] = bbs[BoardSlot.OCCUPIED] ^ ALL_SQUARES
    // shift first, then mask the landing squares: V8 only turns a BigInt >>
    // into a machine shift when the value comes straight from a BigUint64Array
    if (color === 0) {
      GEN[PUSHES] = (GEN[PAWNS] << 8n) & GEN[EMPTY_SQS]
      GEN[DOUBLE_PUSHES] = (GEN[PUSHES] << 8n) & GEN[EMPTY_SQS] & RANK_4
      GEN[WEST_CAPTURES] = (GEN[PAWNS] << 7n) & NOT_FILE_H & bbs[BoardSlot.BLACK]
      GEN[EAST_CAPTURES] = (GEN[PAWNS] << 9n) & NOT_FILE_A & bbs[BoardSlot.BLACK]
    } else {
      GEN[PUSHES] = (GEN[PAWNS] >> 8n) & GEN[EMPTY_SQS]
      GEN[DOUBLE_PUSHES] = (GEN[PUSHES] >> 8n) & GEN[EMPTY_SQS] & RANK_5
      GEN[WEST_CAPTURES] = (GEN[PAWNS] >> 9n) & NOT_FILE_H & bbs[BoardSlot.WHITE]
      GEN[EAST_CAPTURES] = (GEN[PAWNS] >> 7n) & NOT_FILE_A & bbs[BoardSlot.WHITE]
    }
    GEN[PUSHES] = GEN[PUSHES] & GEN[TARGETS]
    GEN[DOUBLE_PUSHES] = GEN[DOUBLE_PUSHES] & GEN[TARGETS]
    GEN[WEST_CAPTURES] = GEN[WEST_CAPTURES] & GEN[TARGETS]
    GEN[EAST_CAPTURES] = GEN[EAST_CAPTURES] & GEN[TARGETS]
    // a promotion is four moves: queen, rook, bishop, knight
    GEN[PROMOTIONS] = (GEN[PUSHES] | GEN[WEST_CAPTURES] | GEN[EAST_CAPTURES]) & RANK_1_AND_8
    // no square takes both a single and a double push
    GEN[PUSHES] = GEN[PUSHES] | GEN[DOUBLE_PUSHES]
    return count + this.countSlot(PUSHES) + this.countSlot(WEST_CAPTURES) + this.countSlot(EAST_CAPTURES) +
      3 * this.countSlot(PROMOTIONS)
  }

  static countPinnedPawnMoves (board, color, kingSq) {
    const promotionRank = color === 0 ? 6 : 1
    let count = 0
    GEN[PIECES] = GEN[PAWNS] & GEN[PINNED]
    for (let half = 0; half < 2; half++) {
      let pawns = GEN32[2 * PIECES + half]
      while (pawns !== 0) {
        const from = (half << 5) | (31 - Math.clz32(pawns & -pawns))
        pawns &= pawns - 1
        this.setPawnMoves(board, color, from)
        GEN[MOVES] = GEN[MOVES] & LINE[kingSq * 64 + from]
        count += (from >> 3) === promotionRank ? 4 * this.countMoves() : this.countMoves()
      }
    }
    return count
  }

  // our pawns that could take en passant sit where their pawn on epSq would attack
  static countEnPassant (board, color, kingSq) {
    const epSq = board.epSq
    if (epSq === EMPTY) { return 0 }
    let count = 0
    GEN[PIECES] = PAWN_ATTACKS[(1 - color) * 64 + epSq] & GEN[PAWNS]
    for (let half = 0; half < 2; half++) {
      let pawns = GEN32[2 * PIECES + half]
      while (pawns !== 0) {
        const from = (half << 5) | (31 - Math.clz32(pawns & -pawns))
        pawns &= pawns - 1
        if (EnPassant.isLegal(board, color, kingSq, from, epSq)) { count++ }
      }
    }
    return count
  }

  static countSlot (slot) {
    return BitHelper.popCount32(GEN32[2 * slot]) + BitHelper.popCount32(GEN32[2 * slot + 1])
  }

  static countMoves () {
    return this.countSlot(MOVES)
  }

  static addKingMoves (board, moves, n, color, kingSq, checkerCount) {
    this.setKingMoves(board, color, kingSq, checkerCount)
    return this.addKingTargets(moves, n, kingSq)
  }

  // castling and the king's steps onto empty squares; addKingCaptures has the rest
  static addKingQuiets (board, moves, n, color, kingSq, checkerCount) {
    this.setKingMoves(board, color, kingSq, checkerCount)
    GEN[MOVES] = GEN[MOVES] & (board.bitboards[BoardSlot.OCCUPIED] ^ ALL_SQUARES)
    return this.addKingTargets(moves, n, kingSq)
  }

  // castling, and the king's steps when the king itself blocks a check
  static addKingChecks (board, moves, n, color, kingSq, checkerCount) {
    const uncovers = Checks.isDiscoverer(kingSq)
    if (!uncovers && (checkerCount !== 0 || ((board.castleRights >> (color * 2)) & 3) === 0)) { return n }
    this.setKingMoves(board, color, kingSq, checkerCount)
    GEN[MOVES] = GEN[MOVES] & (board.bitboards[BoardSlot.OCCUPIED] ^ ALL_SQUARES)
    for (let half = 0; half < 2; half++) {
      let targets = GEN32[2 * MOVES + half]
      while (targets !== 0) {
        const to = (half << 5) | (31 - Math.clz32(targets & -targets))
        targets &= targets - 1
        if (to - kingSq === 2 || kingSq - to === 2) {
          moves[n++] = kingSq | (to << 6) | (MoveKind.CASTLE << 12)
        } else if (uncovers) {
          moves[n++] = kingSq | (to << 6)
        }
      }
    }
    return n
  }

  static addKingTargets (moves, n, kingSq) {
    for (let half = 0; half < 2; half++) {
      let targets = GEN32[2 * MOVES + half]
      while (targets !== 0) {
        const to = (half << 5) | (31 - Math.clz32(targets & -targets))
        targets &= targets - 1
        const kind = (to - kingSq === 2 || kingSq - to === 2) ? MoveKind.CASTLE : MoveKind.QUIET
        moves[n++] = kingSq | (to << 6) | (kind << 12)
      }
    }
    return n
  }

  // castling never captures, so only the safety test from setKingMoves remains
  static addKingCaptures (board, moves, n, color, kingSq) {
    const bbs = board.bitboards
    const them = 6 - color * 6
    GEN[MOVES] = KING_ATTACKS[kingSq] & bbs[BoardSlot.BLACK - color]
    if ((GEN32[2 * MOVES] | GEN32[2 * MOVES + 1]) === 0) { return n }
    GEN[KING_OCC] = bbs[BoardSlot.OCCUPIED] ^ SQUARE_BB[kingSq]
    GEN[THEIR_ROOKS] = bbs[them + Piece.ROOK] | bbs[them + Piece.QUEEN]
    GEN[THEIR_BISHOPS] = bbs[them + Piece.BISHOP] | bbs[them + Piece.QUEEN]
    for (let half = 0; half < 2; half++) {
      let targets = GEN32[2 * MOVES + half]
      while (targets !== 0) {
        const to = (half << 5) | (31 - Math.clz32(targets & -targets))
        targets &= targets - 1
        if (!KingSafety.isAttacked(board, to, color)) { moves[n++] = kingSq | (to << 6) }
      }
    }
    return n
  }

  // the king's safe squares, plus castling squares, go into MOVES
  static setKingMoves (board, color, kingSq, checkerCount) {
    const bbs = board.bitboards
    const them = 6 - color * 6
    GEN[MOVES] = KING_ATTACKS[kingSq] & (bbs[BoardSlot.WHITE + color] ^ ALL_SQUARES)
    // castling crosses a square next to the king, so it needs one of these too
    if ((GEN32[2 * MOVES] | GEN32[2 * MOVES + 1]) === 0) { return }
    // sliders see through the king's old square
    GEN[KING_OCC] = bbs[BoardSlot.OCCUPIED] ^ SQUARE_BB[kingSq]
    GEN[THEIR_ROOKS] = bbs[them + Piece.ROOK] | bbs[them + Piece.QUEEN]
    GEN[THEIR_BISHOPS] = bbs[them + Piece.BISHOP] | bbs[them + Piece.QUEEN]
    for (let half = 0; half < 2; half++) {
      let targets = GEN32[2 * MOVES + half]
      while (targets !== 0) {
        const bit = targets & -targets
        targets ^= bit
        if (KingSafety.isAttacked(board, (half << 5) | (31 - Math.clz32(bit)), color)) {
          GEN32[2 * MOVES + half] ^= bit
        }
      }
    }
    if (checkerCount === 0 && ((board.castleRights >> (color * 2)) & 3) !== 0) {
      Castling.addTargets(board, color)
    }
  }

  static addPieceMoves (board, moves, n, color, kingSq, type) {
    GEN[PIECES] = board.bitboards[color * 6 + type]
    for (let half = 0; half < 2; half++) {
      let pieces = GEN32[2 * PIECES + half]
      while (pieces !== 0) {
        const from = (half << 5) | (31 - Math.clz32(pieces & -pieces))
        pieces &= pieces - 1
        this.setPieceMoves(board.bitboards, type, from)
        if (Pins.isPinned(from)) { GEN[MOVES] = GEN[MOVES] & LINE[kingSq * 64 + from] }
        n = this.addMoves(moves, n, from)
      }
    }
    return n
  }

  // as addPieceMoves, onto the squares in CHECKING unless the piece uncovers a check
  static addPieceChecks (board, moves, n, color, kingSq, type) {
    GEN[PIECES] = board.bitboards[color * 6 + type]
    for (let half = 0; half < 2; half++) {
      let pieces = GEN32[2 * PIECES + half]
      while (pieces !== 0) {
        const from = (half << 5) | (31 - Math.clz32(pieces & -pieces))
        pieces &= pieces - 1
        this.setPieceMoves(board.bitboards, type, from)
        if (Pins.isPinned(from)) { GEN[MOVES] = GEN[MOVES] & LINE[kingSq * 64 + from] }
        if (!Checks.isDiscoverer(from)) { GEN[MOVES] = GEN[MOVES] & GEN[CHECKING] }
        n = this.addMoves(moves, n, from)
      }
    }
    return n
  }

  static setPieceMoves (bbs, type, from) {
    switch (type) {
      case Piece.QUEEN:
        Ray.setRookAttacks(GEN, MOVES, from, bbs, BoardSlot.OCCUPIED)
        Ray.setBishopAttacks(GEN, ATTACKS, from, bbs, BoardSlot.OCCUPIED)
        GEN[MOVES] = (GEN[MOVES] | GEN[ATTACKS]) & GEN[TARGETS]
        break
      case Piece.ROOK:
        Ray.setRookAttacks(GEN, MOVES, from, bbs, BoardSlot.OCCUPIED)
        GEN[MOVES] = GEN[MOVES] & GEN[TARGETS]
        break
      case Piece.BISHOP:
        Ray.setBishopAttacks(GEN, MOVES, from, bbs, BoardSlot.OCCUPIED)
        GEN[MOVES] = GEN[MOVES] & GEN[TARGETS]
        break
      default:
        GEN[MOVES] = KNIGHT_ATTACKS[from] & GEN[TARGETS]
    }
  }

  static addMoves (moves, n, from) {
    for (let half = 0; half < 2; half++) {
      let targets = GEN32[2 * MOVES + half]
      while (targets !== 0) {
        moves[n++] = from | (((half << 5) | (31 - Math.clz32(targets & -targets))) << 6)
        targets &= targets - 1
      }
    }
    return n
  }

  static addPawnMoves (board, moves, n, color, kingSq) {
    const promotionRank = color === 0 ? 6 : 1
    const epSq = board.epSq
    GEN[PIECES] = board.bitboards[color * 6 + Piece.PAWN]
    for (let half = 0; half < 2; half++) {
      let pawns = GEN32[2 * PIECES + half]
      while (pawns !== 0) {
        const from = (half << 5) | (31 - Math.clz32(pawns & -pawns))
        pawns &= pawns - 1
        this.setPawnMoves(board, color, from)
        if (Pins.isPinned(from)) { GEN[MOVES] = GEN[MOVES] & LINE[kingSq * 64 + from] }
        if (epSq !== EMPTY && EnPassant.isLegal(board, color, kingSq, from, epSq)) {
          GEN[MOVES] = GEN[MOVES] | SQUARE_BB[epSq]
        }
        n = (from >> 3) === promotionRank
          ? this.addPromotions(moves, n, from)
          : this.addPawnMovesFrom(moves, n, from, epSq)
      }
    }
    return n
  }

  /**
   * Captures and promotions for generateCaptures, all unpinned pawns at
   * once as in countPawnMoves. TARGETS holds their pieces and the empty
   * squares on the last ranks.
   */
  static addPawnCaptures (board, moves, n, color, kingSq) {
    const bbs = board.bitboards
    GEN[PAWNS] = bbs[color * 6 + Piece.PAWN]
    if ((GEN32[2 * PINNED] | GEN32[2 * PINNED + 1]) !== 0) {
      n = this.addPinnedPawnMoves(board, moves, n, color, kingSq)
      GEN[PAWNS] = GEN[PAWNS] ^ (GEN[PAWNS] & GEN[PINNED])
    }
    if (board.epSq !== EMPTY) { n = this.addEnPassant(board, moves, n, color, kingSq) }
    GEN[EMPTY_SQS] = bbs[BoardSlot.OCCUPIED] ^ ALL_SQUARES
    // shift first, then mask (see countPawnMoves)
    if (color === 0) {
      GEN[PUSHES] = (GEN[PAWNS] << 8n) & GEN[EMPTY_SQS]
      GEN[WEST_CAPTURES] = (GEN[PAWNS] << 7n) & NOT_FILE_H & bbs[BoardSlot.BLACK]
      GEN[EAST_CAPTURES] = (GEN[PAWNS] << 9n) & NOT_FILE_A & bbs[BoardSlot.BLACK]
    } else {
      GEN[PUSHES] = (GEN[PAWNS] >> 8n) & GEN[EMPTY_SQS]
      GEN[WEST_CAPTURES] = (GEN[PAWNS] >> 9n) & NOT_FILE_H & bbs[BoardSlot.WHITE]
      GEN[EAST_CAPTURES] = (GEN[PAWNS] >> 7n) & NOT_FILE_A & bbs[BoardSlot.WHITE]
    }
    GEN[PUSHES] = GEN[PUSHES] & GEN[TARGETS]
    GEN[WEST_CAPTURES] = GEN[WEST_CAPTURES] & GEN[TARGETS]
    GEN[EAST_CAPTURES] = GEN[EAST_CAPTURES] & GEN[TARGETS]
    const forward = color === 0 ? 8 : -8
    n = this.addPawnTargets(moves, n, WEST_CAPTURES, forward - 1)
    n = this.addPawnTargets(moves, n, EAST_CAPTURES, forward + 1)
    return this.addPawnTargets(moves, n, PUSHES, forward)
  }

  // a move to each square in slot from the square delta behind it, four on the last ranks
  static addPawnTargets (moves, n, slot, delta) {
    for (let half = 0; half < 2; half++) {
      let targets = GEN32[2 * slot + half]
      while (targets !== 0) {
        const to = (half << 5) | (31 - Math.clz32(targets & -targets))
        targets &= targets - 1
        const code = (to - delta) | (to << 6)
        if (to < 8 || to > 55) {
          moves[n++] = code | (MoveKind.PROMOTE_QUEEN << 12)
          moves[n++] = code | (MoveKind.PROMOTE_ROOK << 12)
          moves[n++] = code | (MoveKind.PROMOTE_BISHOP << 12)
          moves[n++] = code | (MoveKind.PROMOTE_KNIGHT << 12)
        } else {
          moves[n++] = code
        }
      }
    }
    return n
  }

  // a pinned pawn may only move along its pin line
  static addPinnedPawnMoves (board, moves, n, color, kingSq) {
    const promotionRank = color === 0 ? 6 : 1
    GEN[PIECES] = GEN[PAWNS] & GEN[PINNED]
    for (let half = 0; half < 2; half++) {
      let pawns = GEN32[2 * PIECES + half]
      while (pawns !== 0) {
        const from = (half << 5) | (31 - Math.clz32(pawns & -pawns))
        pawns &= pawns - 1
        this.setPawnMoves(board, color, from)
        GEN[MOVES] = GEN[MOVES] & LINE[kingSq * 64 + from]
        if (board.epSq !== EMPTY && EnPassant.isLegal(board, color, kingSq, from, board.epSq)) {
          GEN[MOVES] = GEN[MOVES] | SQUARE_BB[board.epSq]
        }
        n = (from >> 3) === promotionRank
          ? this.addPromotions(moves, n, from)
          : this.addPawnMovesFrom(moves, n, from, board.epSq)
      }
    }
    return n
  }

  // our unpinned pawns that could take en passant, as in countEnPassant
  static addEnPassant (board, moves, n, color, kingSq) {
    const epSq = board.epSq
    GEN[PIECES] = PAWN_ATTACKS[(1 - color) * 64 + epSq] & GEN[PAWNS]
    for (let half = 0; half < 2; half++) {
      let pawns = GEN32[2 * PIECES + half]
      while (pawns !== 0) {
        const from = (half << 5) | (31 - Math.clz32(pawns & -pawns))
        pawns &= pawns - 1
        if (EnPassant.isLegal(board, color, kingSq, from, epSq)) {
          moves[n++] = from | (epSq << 6) | (MoveKind.EN_PASSANT << 12)
        }
      }
    }
    return n
  }

  /**
   * Pushes for generateQuiets, all unpinned pawns at once as in
   * countPawnMoves. TARGETS holds only empty squares off the last ranks.
   */
  static addPawnPushes (board, moves, n, color, kingSq) {
    GEN[PAWNS] = board.bitboards[color * 6 + Piece.PAWN]
    if ((GEN32[2 * PINNED] | GEN32[2 * PINNED + 1]) !== 0) {
      n = this.addPinnedPawnPushes(board, moves, n, color, kingSq)
      GEN[PAWNS] = GEN[PAWNS] ^ (GEN[PAWNS] & GEN[PINNED])
    }
    // shift first, then mask (see countPawnMoves)
    if (color === 0) {
      GEN[PUSHES] = (GEN[PAWNS] << 8n) & GEN[EMPTY_SQS]
      GEN[DOUBLE_PUSHES] = (GEN[PUSHES] << 8n) & GEN[EMPTY_SQS] & RANK_4
    } else {
      GEN[PUSHES] = (GEN[PAWNS] >> 8n) & GEN[EMPTY_SQS]
      GEN[DOUBLE_PUSHES] = (GEN[PUSHES] >> 8n) & GEN[EMPTY_SQS] & RANK_5
    }
    GEN[PUSHES] = GEN[PUSHES] & GEN[TARGETS]
    GEN[DOUBLE_PUSHES] = GEN[DOUBLE_PUSHES] & GEN[TARGETS]
    const forward = color === 0 ? 8 : -8
    n = this.addPushes(moves, n, PUSHES, forward, MoveKind.QUIET)
    return this.addPushes(moves, n, DOUBLE_PUSHES, 2 * forward, MoveKind.DOUBLE_PUSH)
  }

  /**
   * Pushes onto a square where a pawn attacks their king, or by a pawn
   * that uncovers a check. A pinned pawn's pushes all go in; they are rare.
   */
  static addPawnChecks (board, moves, n, color, kingSq) {
    GEN[PAWNS] = board.bitboards[color * 6 + Piece.PAWN]
    if ((GEN32[2 * PINNED] | GEN32[2 * PINNED + 1]) !== 0) {
      n = this.addPinnedPawnPushes(board, moves, n, color, kingSq)
      GEN[PAWNS] = GEN[PAWNS] ^ (GEN[PAWNS] & GEN[PINNED])
    }
    GEN[PIECES] = GEN[PAWNS] & GEN[DISCOVERERS]
    // shift first, then mask (see countPawnMoves)
    if (color === 0) {
      GEN[PUSHES] = (GEN[PAWNS] << 8n) & GEN[EMPTY_SQS]
      GEN[DOUBLE_PUSHES] = (GEN[PUSHES] << 8n) & GEN[EMPTY_SQS] & RANK_4
      GEN[CHECKING] = GEN[CHECK_SQUARES + 1] | (GEN[PIECES] << 8n) | (GEN[PIECES] << 16n)
    } else {
      GEN[PUSHES] = (GEN[PAWNS] >> 8n) & GEN[EMPTY_SQS]
      GEN[DOUBLE_PUSHES] = (GEN[PUSHES] >> 8n) & GEN[EMPTY_SQS] & RANK_5
      GEN[CHECKING] = GEN[CHECK_SQUARES + 1] | (GEN[PIECES] >> 8n) | (GEN[PIECES] >> 16n)
    }
    GEN[PUSHES] = GEN[PUSHES] & GEN[TARGETS] & GEN[CHECKING]
    GEN[DOUBLE_PUSHES] = GEN[DOUBLE_PUSHES] & GEN[TARGETS] & GEN[CHECKING]
    const forward = color === 0 ? 8 : -8
    n = this.addPushes(moves, n, PUSHES, forward, MoveKind.QUIET)
    return this.addPushes(moves, n, DOUBLE_PUSHES, 2 * forward, MoveKind.DOUBLE_PUSH)
  }

  // a move to each square in slot, from the square delta behind it
  static addPushes (moves, n, slot, delta, kind) {
    for (let half = 0; half < 2; half++) {
      let targets = GEN32[2 * slot + half]
      while (targets !== 0) {
        const to = (half << 5) | (31 - Math.clz32(targets & -targets))
        targets &= targets - 1
        moves[n++] = (to - delta) | (to << 6) | (kind << 12)
      }
    }
    return n
  }

  // a pinned pawn may only push along its pin line
  static addPinnedPawnPushes (board, moves, n, color, kingSq) {
    GEN[PIECES] = GEN[PAWNS] & GEN[PINNED]
    for (let half = 0; half < 2; half++) {
      let pawns = GEN32[2 * PIECES + half]
      while (pawns !== 0) {
        const from = (half << 5) | (31 - Math.clz32(pawns & -pawns))
        pawns &= pawns - 1
        this.setPawnMoves(board, color, from)
        GEN[MOVES] = GEN[MOVES] & LINE[kingSq * 64 + from]
        n = this.addPawnMovesFrom(moves, n, from, EMPTY)
      }
    }
    return n
  }

  static setPawnMoves (board, color, from) {
    const bbs = board.bitboards
    const forward = color === 0 ? 8 : -8
    const push = from + forward
    GEN[MOVES] = PAWN_ATTACKS[color * 64 + from] & bbs[BoardSlot.BLACK - color]
    if (board.squares[push] === EMPTY) {
      GEN[MOVES] = GEN[MOVES] | SQUARE_BB[push]
      if ((from >> 3) === (color === 0 ? 1 : 6) && board.squares[push + forward] === EMPTY) {
        GEN[MOVES] = GEN[MOVES] | SQUARE_BB[push + forward]
      }
    }
    GEN[MOVES] = GEN[MOVES] & GEN[TARGETS]
  }

  static addPawnMovesFrom (moves, n, from, epSq) {
    for (let half = 0; half < 2; half++) {
      let targets = GEN32[2 * MOVES + half]
      while (targets !== 0) {
        const to = (half << 5) | (31 - Math.clz32(targets & -targets))
        targets &= targets - 1
        let kind = MoveKind.QUIET
        if (to === epSq) {
          kind = MoveKind.EN_PASSANT
        } else if (to - from === 16 || from - to === 16) {
          kind = MoveKind.DOUBLE_PUSH
        }
        moves[n++] = from | (to << 6) | (kind << 12)
      }
    }
    return n
  }

  static addPromotions (moves, n, from) {
    for (let half = 0; half < 2; half++) {
      let targets = GEN32[2 * MOVES + half]
      while (targets !== 0) {
        const to = (half << 5) | (31 - Math.clz32(targets & -targets))
        targets &= targets - 1
        for (let kind = MoveKind.PROMOTE_QUEEN; kind <= MoveKind.PROMOTE_KNIGHT; kind++) {
          moves[n++] = from | (to << 6) | (kind << 12)
        }
      }
    }
    return n
  }
}

class CheckEvasions {
  /**
   * Sets TARGETS for our non-king moves and PINNED for our pinned pieces,
   * and returns the checker count (2 means 2+). Checks and pins by sliders
   * both come from one pass over the snipers (see Pins.checkLine).
   */
  static setTargets (board, color, kingSq) {
    const bbs = board.bitboards
    const them = 6 - color * 6
    GEN[CHECKERS] = (KNIGHT_ATTACKS[kingSq] & bbs[them + Piece.KNIGHT]) |
      (PAWN_ATTACKS[color * 64 + kingSq] & bbs[them + Piece.PAWN])
    GEN[PINNED] = 0n
    GEN[SNIPERS] = ROOK_RAYS[kingSq] & (bbs[them + Piece.ROOK] | bbs[them + Piece.QUEEN])
    GEN[SNIPERS] = GEN[SNIPERS] | (BISHOP_RAYS[kingSq] & (bbs[them + Piece.BISHOP] | bbs[them + Piece.QUEEN]))
    for (let half = 0; half < 2; half++) {
      let snipers = GEN32[2 * SNIPERS + half]
      while (snipers !== 0) {
        const sniperSq = (half << 5) | (31 - Math.clz32(snipers & -snipers))
        snipers &= snipers - 1
        Pins.checkLine(board, color, kingSq, sniperSq)
      }
    }
    const lo = GEN32[2 * CHECKERS]
    const hi = GEN32[2 * CHECKERS + 1]
    if ((lo | hi) === 0) {
      GEN[TARGETS] = bbs[BoardSlot.WHITE + color] ^ ALL_SQUARES
      return 0
    }
    if ((lo !== 0 && hi !== 0) || (lo & (lo - 1)) !== 0 || (hi & (hi - 1)) !== 0) { return 2 }
    // single check: capture the checker or block its ray
    const checkerSq = lo !== 0 ? 31 - Math.clz32(lo) : 63 - Math.clz32(hi)
    GEN[TARGETS] = GEN[CHECKERS] | BETWEEN[kingSq * 64 + checkerSq]
    return 1
  }
}

class Pins {
  /**
   * Looks at the squares between our king and a sniper: their slider on one
   * of the king's empty-board rays. With nothing in between, the sniper
   * gives check. With a lone piece of ours in between, that piece is pinned.
   */
  static checkLine (board, color, kingSq, sniperSq) {
    GEN[BLOCKERS] = BETWEEN[kingSq * 64 + sniperSq] & board.bitboards[BoardSlot.OCCUPIED]
    const lo = GEN32[2 * BLOCKERS]
    const hi = GEN32[2 * BLOCKERS + 1]
    if ((lo | hi) === 0) {
      GEN32[2 * CHECKERS + (sniperSq >> 5)] |= 1 << (sniperSq & 31)
      return
    }
    if (lo !== 0 && hi !== 0) { return } // one blocker in each half
    const bits = lo | hi
    if ((bits & (bits - 1)) !== 0) { return }
    const sq = lo !== 0 ? 31 - Math.clz32(lo) : 63 - Math.clz32(hi)
    const piece = board.squares[sq]
    if (piece >= color * 6 && piece < color * 6 + 6) {
      GEN32[2 * PINNED + (sq >> 5)] |= 1 << (sq & 31)
    }
  }

  static isPinned (sq) {
    return ((GEN32[2 * PINNED + (sq >> 5)] >>> (sq & 31)) & 1) !== 0
  }
}

class EnPassant {
  /**
   * En passant removes two pieces from one line, so pins and checks are
   * checked directly: take the move back off the board and look at the king.
   */
  static isLegal (board, color, kingSq, from, epSq) {
    if (!this.canCapture(color, from, epSq)) { return false }
    const bbs = board.bitboards
    const them = 6 - color * 6
    const captureSq = color === 0 ? epSq - 8 : epSq + 8
    GEN[EP_OCC] = (bbs[BoardSlot.OCCUPIED] ^ SQUARE_BB[from] ^ SQUARE_BB[captureSq]) | SQUARE_BB[epSq]
    GEN[EP_PAWNS] = bbs[them + Piece.PAWN] ^ SQUARE_BB[captureSq]
    GEN[EP_ATTACKERS] = (KNIGHT_ATTACKS[kingSq] & bbs[them + Piece.KNIGHT]) |
      (PAWN_ATTACKS[color * 64 + kingSq] & GEN[EP_PAWNS])
    Ray.setBishopAttacks(GEN, ATTACKS, kingSq, GEN, EP_OCC)
    GEN[EP_ATTACKERS] = GEN[EP_ATTACKERS] | (GEN[ATTACKS] & (bbs[them + Piece.BISHOP] | bbs[them + Piece.QUEEN]))
    Ray.setRookAttacks(GEN, ATTACKS, kingSq, GEN, EP_OCC)
    GEN[EP_ATTACKERS] = GEN[EP_ATTACKERS] | (GEN[ATTACKS] & (bbs[them + Piece.ROOK] | bbs[them + Piece.QUEEN]))
    return (GEN32[2 * EP_ATTACKERS] | GEN32[2 * EP_ATTACKERS + 1]) === 0
  }

  // only a pawn diagonally behind the en passant square can take
  static canCapture (color, from, epSq) {
    const step = color === 0 ? epSq - from : from - epSq
    const fileGap = (epSq & 7) - (from & 7)
    return (step === 7 || step === 9) && (fileGap === 1 || fileGap === -1)
  }
}

class KingSafety {
  /**
   * Is sq attacked by their pieces, looking through our king?
   * setKingMoves fills KING_OCC, THEIR_ROOKS and THEIR_BISHOPS first.
   * A slider lookup only runs when one of their sliders is on an open
   * board ray from sq.
   */
  static isAttacked (board, sq, color) {
    const bbs = board.bitboards
    const them = 6 - color * 6
    GEN[ATTACKERS] = (KNIGHT_ATTACKS[sq] & bbs[them + Piece.KNIGHT]) |
      (PAWN_ATTACKS[color * 64 + sq] & bbs[them + Piece.PAWN]) |
      (KING_ATTACKS[sq] & bbs[them + Piece.KING])
    if ((GEN32[2 * ATTACKERS] | GEN32[2 * ATTACKERS + 1]) !== 0) { return true }
    return this.isSliderAttacked(sq)
  }

  static isSliderAttacked (sq) {
    GEN[ATTACKERS] = BISHOP_RAYS[sq] & GEN[THEIR_BISHOPS]
    if ((GEN32[2 * ATTACKERS] | GEN32[2 * ATTACKERS + 1]) !== 0) {
      Ray.setBishopAttacks(GEN, ATTACKERS, sq, GEN, KING_OCC)
      GEN[ATTACKERS] = GEN[ATTACKERS] & GEN[THEIR_BISHOPS]
      if ((GEN32[2 * ATTACKERS] | GEN32[2 * ATTACKERS + 1]) !== 0) { return true }
    }
    GEN[ATTACKERS] = ROOK_RAYS[sq] & GEN[THEIR_ROOKS]
    if ((GEN32[2 * ATTACKERS] | GEN32[2 * ATTACKERS + 1]) === 0) { return false }
    Ray.setRookAttacks(GEN, ATTACKERS, sq, GEN, KING_OCC)
    GEN[ATTACKERS] = GEN[ATTACKERS] & GEN[THEIR_ROOKS]
    return (GEN32[2 * ATTACKERS] | GEN32[2 * ATTACKERS + 1]) !== 0
  }
}

class Castling {
  /**
   * Adds the castling squares to the king's MOVES. The square the king
   * crosses (f1 or d1) is next to it, so MOVES already says if it is safe.
   * Looking through the king changes nothing here, since we are not in check.
   */
  static addTargets (board, color) {
    const rights = board.castleRights >> (color * 2) // black's k, q line up with K, Q
    const home = color * 56
    if ((rights & CastleRights.K) !== 0 && this.isPathClear(board, home + 5, home + 6) &&
      this.isTarget(home + 5) && !KingSafety.isAttacked(board, home + 6, color)) {
      this.addTarget(home + 6)
    }
    if ((rights & CastleRights.Q) !== 0 && this.isPathClear(board, home + 1, home + 3) &&
      this.isTarget(home + 3) && !KingSafety.isAttacked(board, home + 2, color)) {
      this.addTarget(home + 2)
    }
  }

  static isTarget (sq) {
    return ((GEN32[2 * MOVES + (sq >> 5)] >>> (sq & 31)) & 1) !== 0
  }

  static isPathClear (board, fromSq, toSq) {
    for (let sq = fromSq; sq <= toSq; sq++) {
      if (board.squares[sq] !== EMPTY) { return false }
    }
    return true
  }

  static addTarget (sq) {
    GEN32[2 * MOVES + (sq >> 5)] |= 1 << (sq & 31)
  }
}

/**
 * Which moves give check, for the side to move. setSquares writes 5
 * bitboards as ints into out[at...]: the squares a knight, pawn, bishop or
 * rook would check their king from (a queen uses both slider boards), then
 * our pieces that uncover a check by leaving their line. The search keeps
 * them per ply, since the generator's slots change below this node.
 */
class Checks {
  static setSquares (board, out, at) {
    const bbs = board.bitboards
    const color = board.whiteToMove ? 0 : 1
    const us = color * 6
    const kingSq = board.kingSqs[1 - color]
    GEN[CHECK_SQUARES] = KNIGHT_ATTACKS[kingSq]
    GEN[CHECK_SQUARES + 1] = PAWN_ATTACKS[(1 - color) * 64 + kingSq] // where our pawns would attack it
    Ray.setBishopAttacks(GEN, CHECK_SQUARES + 2, kingSq, bbs, BoardSlot.OCCUPIED)
    Ray.setRookAttacks(GEN, CHECK_SQUARES + 3, kingSq, bbs, BoardSlot.OCCUPIED)
    GEN[DISCOVERERS] = 0n
    GEN[SNIPERS] = ROOK_RAYS[kingSq] & (bbs[us + Piece.ROOK] | bbs[us + Piece.QUEEN])
    GEN[SNIPERS] = GEN[SNIPERS] | (BISHOP_RAYS[kingSq] & (bbs[us + Piece.BISHOP] | bbs[us + Piece.QUEEN]))
    for (let half = 0; half < 2; half++) {
      let snipers = GEN32[2 * SNIPERS + half]
      while (snipers !== 0) {
        const sniperSq = (half << 5) | (31 - Math.clz32(snipers & -snipers))
        snipers &= snipers - 1
        this.addDiscoverer(board, us, kingSq, sniperSq)
      }
    }
    for (let i = 0; i < 10; i++) { out[at + i] = GEN32[2 * CHECK_SQUARES + i] }
  }

  // after setSquares: does our piece on sq block our own slider's line to their king?
  static isDiscoverer (sq) {
    return ((GEN32[2 * DISCOVERERS + (sq >> 5)] >>> (sq & 31)) & 1) !== 0
  }

  // a lone piece of ours between our sniper and their king
  static addDiscoverer (board, us, kingSq, sniperSq) {
    GEN[BLOCKERS] = BETWEEN[kingSq * 64 + sniperSq] & board.bitboards[BoardSlot.OCCUPIED]
    const lo = GEN32[2 * BLOCKERS]
    const hi = GEN32[2 * BLOCKERS + 1]
    if ((lo !== 0 && hi !== 0) || ((lo | hi) & ((lo | hi) - 1)) !== 0) { return }
    const sq = lo !== 0 ? 31 - Math.clz32(lo) : 63 - Math.clz32(hi)
    const piece = board.squares[sq]
    if (piece >= us && piece < us + 6) { GEN32[2 * DISCOVERERS + (sq >> 5)] |= 1 << (sq & 31) }
  }

  /**
   * Does code give check, given the squares setSquares wrote? Castling,
   * en passant and promotions always answer yes: they are rare, and they
   * move a second piece or open lines through another square.
   */
  static givesCheck (board, out, at, code) {
    const from = code & 63
    const to = (code >> 6) & 63
    if ((code >>> 12) >= MoveKind.CASTLE) { return true }
    const piece = board.squares[from]
    const type = piece < 6 ? piece : piece - 6
    const toBit = 1 << (to & 31)
    const half = to >> 5
    switch (type) {
      case Piece.QUEEN:
        if (((out[at + 4 + half] | out[at + 6 + half]) & toBit) !== 0) { return true }
        break
      case Piece.ROOK:
        if ((out[at + 6 + half] & toBit) !== 0) { return true }
        break
      case Piece.BISHOP:
        if ((out[at + 4 + half] & toBit) !== 0) { return true }
        break
      case Piece.KNIGHT:
        if ((out[at + half] & toBit) !== 0) { return true }
        break
      case Piece.PAWN:
        if ((out[at + 2 + half] & toBit) !== 0) { return true }
        break
    }
    if (((out[at + 8 + (from >> 5)] >>> (from & 31)) & 1) === 0) { return false }
    // a discoverer only uncovers the check when it leaves the line
    const line = 2 * ((board.kingSqs[board.whiteToMove ? 1 : 0] << 6) + from) + half
    return ((LINE32[line] >>> (to & 31)) & 1) === 0
  }
}

class Move {
  static for (fenChar, fromBit, fromIdx, toIdx, pieceBoard, promotion, promoteTo) {
    let MoveClass
    switch (fenChar) {
      case 'P':
        MoveClass = WhitePawnMove
        break
      case 'p':
        MoveClass = BlackPawnMove
        break
      case 'N':
        MoveClass = WhiteKnightMove
        break
      case 'n':
        MoveClass = BlackKnightMove
        break
      case 'B':
        MoveClass = WhiteBishopMove
        break
      case 'b':
        MoveClass = BlackBishopMove
        break
      case 'R':
        MoveClass = WhiteRookMove
        break
      case 'r':
        MoveClass = BlackRookMove
        break
      case 'Q':
        MoveClass = WhiteQueenMove
        break
      case 'q':
        MoveClass = BlackQueenMove
        break
      case 'K':
        MoveClass = WhiteKingMove
        break
      case 'k':
        MoveClass = BlackKingMove
        break
    }
    return 'Pp'.includes(fenChar)
      ? new MoveClass(fromBit, fromIdx, toIdx, pieceBoard, promotion, promoteTo)
      : new MoveClass(fromBit, fromIdx, toIdx, pieceBoard)
  }
}

class WhitePawnMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard, promotion, promoteTo) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || 0n
    this.toBit = BitHelper.setBit(0n, toIdx)
    this.ep = false
    this.promotion = promotion
    this.promoteTo = promoteTo
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = this.isThreat(pieceBoard)
    this.fenChar = 'P'
    this.epRisk = this.isDoublePush(pieceBoard.emptySq) ? Mask.southOne(this.toBit) : 0n
  }

  isCheck (pieceBoard) {
    return ((this.parsePawnAttacks(pieceBoard, this.toBit) & pieceBoard.blackKingBb) !==
      0n)
  }

  isCapture (pieceBoard) {
    const capOrEp = this.toBit & (pieceBoard.blackBb | pieceBoard.epSqBb)
    const enPassant = this.toBit & pieceBoard.epSqBb
    this.ep = enPassant !== 0n
    return (capOrEp !== 0n)
  }

  isThreat (pieceBoard) {
    return (this.parsePawnAttacks(pieceBoard, this.toBit) & (pieceBoard.blackMinorBb |
      pieceBoard.blackMajorBb)) !== 0n
  }

  isDoublePush (emptySq) {
    return Direction.wDoublePush(this.fromBit, emptySq) === this.toBit
  }

  parsePawnAttacks (pieceBoard, toBit) {
    switch (this.promoteTo) {
      case 'Q':
        return Direction.queenRays(toBit, pieceBoard.occupied, pieceBoard.occupiable)
      case 'R':
        return Direction.rookRays(toBit, pieceBoard.occupied, pieceBoard.occupiable)
      case 'B':
        return Direction.bishopRays(toBit, pieceBoard.occupied, pieceBoard.occupiable)
      case 'N':
        return Direction.knightAttacks(toBit)
      default:
        return Direction.wPawnAttacks(toBit)
    }
  }
}

class BlackPawnMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard, promotion, promoteTo) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || 0n
    this.toBit = BitHelper.setBit(0n, toIdx)
    this.ep = false
    this.promotion = promotion
    this.promoteTo = promoteTo
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = this.isThreat(pieceBoard)
    this.fenChar = 'p'
    this.epRisk = this.isDoublePush(pieceBoard.emptySq) ? Mask.northOne(this.toBit) : 0n
  }

  isCheck (pieceBoard) {
    return ((this.parsePawnAttacks(pieceBoard, this.toBit) & pieceBoard.whiteKingBb) !==
      0n)
  }

  isCapture (pieceBoard) {
    const capOrEp = this.toBit & (pieceBoard.whiteBb | pieceBoard.epSqBb)
    const enPassant = this.toBit & pieceBoard.epSqBb
    this.ep = enPassant !== 0n
    return (capOrEp !== 0n)
  }

  isThreat (pieceBoard) {
    return (this.parsePawnAttacks(pieceBoard, this.toBit) & (pieceBoard.whiteMinorBb |
      pieceBoard.whiteMajorBb)) !== 0n
  }

  isDoublePush (emptySq) {
    return Direction.bDoublePush(this.fromBit, emptySq) === this.toBit
  }

  parsePawnAttacks (pieceBoard, toBit) {
    switch (this.promoteTo) {
      case 'q':
        return Direction.queenRays(toBit, pieceBoard.occupied, pieceBoard.occupiable)
      case 'r':
        return Direction.rookRays(toBit, pieceBoard.occupied, pieceBoard.occupiable)
      case 'b':
        return Direction.bishopRays(toBit, pieceBoard.occupied, pieceBoard.occupiable)
      case 'n':
        return Direction.knightAttacks(toBit)
      default:
        return Direction.bPawnAttacks(toBit)
    }
  }
}

class WhiteKnightMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || 0n
    this.toBit = BitHelper.setBit(0n, toIdx)
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = this.isThreat(pieceBoard)
    this.fenChar = 'N'
  }

  isCheck (pieceBoard) {
    return ((Direction.knightAttacks(this.toBit) & pieceBoard.blackKingBb) !==
      0n)
  }

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.blackBb) !== 0n)
  }

  isThreat (pieceBoard) {
    return (Direction.knightAttacks(this.toBit) & pieceBoard.blackMajorBb) !==
      0n
  }
}

class BlackKnightMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || 0n
    this.toBit = BitHelper.setBit(0n, toIdx)
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = this.isThreat(pieceBoard)
    this.fenChar = 'n'
  }

  isCheck (pieceBoard) {
    return ((Direction.knightAttacks(this.toBit) & pieceBoard.whiteKingBb) !==
      0n)
  }

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.whiteBb) !== 0n)
  }

  isThreat (pieceBoard) {
    return (Direction.knightAttacks(this.toBit) & pieceBoard.whiteMajorBb) !==
      0n
  }
}

class WhiteBishopMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || 0n
    this.toBit = BitHelper.setBit(0n, toIdx)
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = this.isThreat(pieceBoard)
    this.fenChar = 'B'
  }

  isCheck (pieceBoard) {
    return ((Direction.bishopRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
        pieceBoard.blackKingBb) !== 0n)
  }

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.blackBb) !== 0n)
  }

  isThreat (pieceBoard) {
    return (Direction.bishopRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
        pieceBoard.blackMajorBb) !== 0n
  }
}

class BlackBishopMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || 0n
    this.toBit = BitHelper.setBit(0n, toIdx)
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = this.isThreat(pieceBoard)
    this.fenChar = 'b'
  }

  isCheck (pieceBoard) {
    return ((Direction.bishopRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
      pieceBoard.whiteKingBb) !== 0n)
  }

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.whiteBb) !== 0n)
  }

  isThreat (pieceBoard) {
    return (Direction.bishopRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
      pieceBoard.whiteMajorBb) !== 0n
  }
}

class WhiteRookMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || 0n
    this.toBit = BitHelper.setBit(0n, toIdx)
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = this.isThreat(pieceBoard)
    this.fenChar = 'R'
  }

  isCheck (pieceBoard) {
    return ((Direction.rookRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
          pieceBoard.blackKingBb) !== 0n)
  }

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.blackBb) !== 0n)
  }

  isThreat (pieceBoard) {
    return (Direction.rookRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
      pieceBoard.blackQueenBb) !== 0n
  }
}

class BlackRookMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || 0n
    this.toBit = BitHelper.setBit(0n, toIdx)
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = this.isThreat(pieceBoard)
    this.fenChar = 'r'
  }

  isCheck (pieceBoard) {
    return ((Direction.rookRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
          pieceBoard.whiteKingBb) !== 0n)
  }

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.whiteBb) !== 0n)
  }

  isThreat (pieceBoard) {
    return (Direction.rookRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
      pieceBoard.whiteQueenBb) !== 0n
  }
}

class WhiteQueenMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || 0n
    this.toBit = BitHelper.setBit(0n, toIdx)
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = false
    this.fenChar = 'Q'
  }

  isCheck (pieceBoard) {
    return ((Direction.queenRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
          pieceBoard.blackKingBb) !== 0n)
  }

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.blackBb) !== 0n)
  }
}

class BlackQueenMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.to = toIdx
    this.from = fromIdx
    this.fromBit = fromBit || 0n
    this.toBit = BitHelper.setBit(0n, toIdx)
    this.check = this.isCheck(pieceBoard)
    this.capture = this.isCapture(pieceBoard)
    this.threat = false
    this.fenChar = 'q'
  }

  isCheck (pieceBoard) {
    return ((Direction.queenRays(this.toBit, pieceBoard.occupied, pieceBoard.occupiable) &
          pieceBoard.whiteKingBb) !== 0n)
  }

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.whiteBb) !== 0n)
  }
}

class WhiteKingMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || 0n
    this.toBit = BitHelper.setBit(0n, toIdx)
    this.castle = this.isCastle(fromIdx, toIdx)
    this.check = false
    this.capture = this.isCapture(pieceBoard)
    this.threat = false
    this.fenChar = 'K'
  }

  // TODO: isCheck for castling with rook
  // TODO: isThreat for threats against other pawns / pieces

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.blackBb) !== 0n)
  }

  isCastle (fromIdx, toIdx) {
    const difference = toIdx - fromIdx
    return (difference === 2 || difference === -2)
  }
}

class BlackKingMove {
  constructor (fromBit, fromIdx, toIdx, pieceBoard) {
    this.from = fromIdx
    this.to = toIdx
    this.fromBit = fromBit || 0n
    this.toBit = BitHelper.setBit(0n, toIdx)
    this.castle = this.isCastle(fromIdx, toIdx)
    this.check = false
    this.capture = this.isCapture(pieceBoard)
    this.threat = false
    this.fenChar = 'k'
  }

  isCapture (pieceBoard) {
    return ((this.toBit & pieceBoard.whiteBb) !== 0n)
  }

  isCastle (fromIdx, toIdx) {
    const difference = toIdx - fromIdx
    return (difference === 2 || difference === -2)
  }
}

module.exports = {
  Checks: Checks,
  WhitePawnMove: WhitePawnMove,
  BlackPawnMove: BlackPawnMove,
  Move: Move,
  MoveKind: MoveKind,
  MoveList: MoveList
}
