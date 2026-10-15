const FenReader = require('./fen.js').FenReader
const BitHelper = require('./helpers.js').BitHelper
const SquareHelper = require('./helpers.js').SquareHelper
const CastleRights = require('./helpers.js').CastleRights
const PieceBoardList = require('./pieceboard.js').PieceBoardList
const Pieces = require('./pieces.js').Pieces
const Piece = require('./pieces.js').Piece
const BoardSlot = require('./pieces.js').BoardSlot
const MoveList = require('./move.js').MoveList
const ThreatBoard = require('./threatboard.js').ThreatBoard
const SQUARE_BB = require('./attack.js').SQUARE_BB
const LCG = require('./prng.js').LCG

const EMPTY = -1

/**
 * Board state lives in typed arrays so the move generator and
 * make/unmake can work on it without allocating:
 * - bitboards: 12 piece boards, then the BoardSlot boards (white, black,
 *   occupied, position key)
 * - squares: which piece sits on each square (a mailbox), EMPTY if none
 * The getters below expose the same state as BigInts for everyone else.
 */
class Board {
  constructor (seed = 91289n) {
    this.bitboards = new BigUint64Array(16)
    this.squares = new Int8Array(64).fill(EMPTY)
    this.kingSqs = new Int8Array(2)
    this.initPieceBoardList()
    this.initEnPassantData()
    this.initZobristKey(seed)
    this.initMoveCounters()
    this.initCastleData()
    this.whiteToMove = true
    this.halfMoveClock = 0
    this.fullMoveNo = 0
    this.isThreeFoldRepetition = false
  }

  initPieceBoardList () {
    this.pieceBoardList = new PieceBoardList(this)
  }

  initEnPassantData () {
    this.epSq = EMPTY
  }

  initCastleData () {
    this.castleRights = 0
    this.castleBit = {
      K: 0x80n,
      Q: 0x1n,
      k: 0x8000000000000000n,
      q: 0x100000000000000n
    }
  }

  initZobristKey (seed) {
    this.lcg = new LCG(seed)
    this.pieceKeys = new BigUint64Array(12 * 64)
    this.enPassantKeys = new BigUint64Array(64)
    this.sideKey = new BigUint64Array(2)
    this.castleKeys = new BigUint64Array(64)
    this.castleDeltaKeys = new BigUint64Array(16)
  }

  initMoveCounters () {
    this.ply = 0
  }

  parseFenToBoard (fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
    this.resetBoard()
    this.initKeys()

    let boardIndex = 56 // fens start at a8
    let ranksRead = 1
    let whiteSpace = 0

    for (let i = 0; i < fen.length; i++) {
      if (FenReader.finishedReadingBoard(ranksRead, whiteSpace)) {
        if (FenReader.isSidetoMove(fen[i], whiteSpace)) {
          this.whiteToMove = fen[i] === 'w'
          this.posKey ^= fen[i] === 'w' ? this.sideKey[0] : this.sideKey[1]
        }

        if (FenReader.isCastlingSymbol(fen[i], whiteSpace)) {
          const castleIdx = BitHelper.bitScanFwd(this.castleBit[fen[i]])
          this.castleRights |= CastleRights[fen[i]]
          this.posKey ^= this.castleKeys[castleIdx]
        }

        if (FenReader.isEnPassantChar(fen[i], whiteSpace)) {
          this.epSq = SquareHelper.for(fen[i] + fen[i + 1])
          this.posKey ^= this.enPassantKeys[this.epSq]
          i += 1
        }

        if (FenReader.isHalfMoveClock(fen[i], whiteSpace)) {
          if (FenReader.isSpace(fen[i + 1])) {
            this.halfMoveClock = parseInt(fen[i])
          } else {
            this.halfMoveClock = parseInt(fen[i] + fen[i + 1])
            i += 1
          }
        }

        if (FenReader.isFullMoveNo(fen[i], whiteSpace)) {
          if (FenReader.isUndefined(fen[i + 1])) {
            this.fullMoveNo = parseInt(fen[i])
          } else {
            this.fullMoveNo = parseInt(fen[i] + fen[i + 1])
            i += 1
          }
          this.ply = this.whiteToMove ? this.fullMoveNo * 2 - 2 : this.fullMoveNo * 2 - 1
        }
      } else {
        if (FenReader.isWhitePiece(fen[i]) || FenReader.isBlackPiece(fen[i])) {
          const piece = Pieces.indexFor(fen[i])
          this.bitboards[piece] |= SQUARE_BB[boardIndex]
          this.posKey ^= this.pieceKeys[piece * 64 + boardIndex]
          boardIndex += 1
        }

        if (FenReader.isEmptySquare(fen[i])) {
          boardIndex += parseInt(fen[i])
        }

        if (FenReader.isNewRank(fen[i])) {
          boardIndex = (56 - (ranksRead * 8))
          ranksRead += 1
        }
      }
      if (FenReader.isSpace(fen[i])) {
        whiteSpace += 1
      }
    }

    this.setDerivedBbs()
    this.verifyCastleStatus()
  }

  resetBoard () {
    this.bitboards.fill(0n)
    this.squares.fill(EMPTY)
    this.castleRights = 0
    this.epSq = EMPTY
  }

  // used by PieceBoard's bb setter
  setPieceBb (piece, bb) {
    this.bitboards[piece] = bb
    this.setDerivedBbs()
  }

  // rebuilds side boards, mailbox and king squares from the piece boards
  setDerivedBbs () {
    const bbs = this.bitboards
    bbs[BoardSlot.WHITE] = bbs[0] | bbs[1] | bbs[2] | bbs[3] | bbs[4] | bbs[5]
    bbs[BoardSlot.BLACK] = bbs[6] | bbs[7] | bbs[8] | bbs[9] | bbs[10] | bbs[11]
    bbs[BoardSlot.OCCUPIED] = bbs[BoardSlot.WHITE] | bbs[BoardSlot.BLACK]
    this.squares.fill(EMPTY)
    for (let piece = 0; piece < 12; piece++) {
      SquareHelper.indicesFor(bbs[piece]).forEach((sq) => { this.squares[sq] = piece })
    }
    this.kingSqs[0] = Math.max(BitHelper.bitScanFwd(bbs[Piece.KING]), 0)
    this.kingSqs[1] = Math.max(BitHelper.bitScanFwd(bbs[6 + Piece.KING]), 0)
  }

  /**
   * A8 = 56 thus, that's where we do the exclusive xor (where you flip)
   */
  flipBoard () {
    for (let piece = 0; piece < 12; piece++) {
      this.bitboards[piece] = BitHelper.flipVertical(this.bitboards[piece])
    }
    this.setDerivedBbs()
  }

  // castling needs the rook on its corner
  verifyCastleStatus () {
    const rookAt = (piece, sq) => this.squares[sq] === piece
    if (!rookAt(Piece.ROOK, 7)) { this.castleRights &= ~CastleRights.K }
    if (!rookAt(Piece.ROOK, 0)) { this.castleRights &= ~CastleRights.Q }
    if (!rookAt(6 + Piece.ROOK, 63)) { this.castleRights &= ~CastleRights.k }
    if (!rookAt(6 + Piece.ROOK, 56)) { this.castleRights &= ~CastleRights.q }
  }

  initKeys () {
    Pieces.for('all').forEach((fenChar) => {
      const piece = Pieces.indexFor(fenChar)
      for (let sq = 0; sq < 64; sq++) {
        this.pieceKeys[piece * 64 + sq] = this.lcg.randomBigInt()
      }
    })

    for (let sq = 0; sq < 64; sq++) {
      this.enPassantKeys[sq] = this.lcg.randomBigInt()
    }

    for (let sq = 0; sq < 64; sq++) {
      this.castleKeys[sq] = this.lcg.randomBigInt()
    }

    this.sideKey[0] = 0n
    this.sideKey[1] = this.lcg.randomBigInt()

    // castleDeltaKeys[lostRights] xors out every castle key in lostRights
    const rookSqs = [7, 0, 63, 56] // K, Q, k, q
    for (let rights = 0; rights < 16; rights++) {
      this.castleDeltaKeys[rights] = rookSqs
        .filter((sq, bit) => (rights & (1 << bit)) !== 0)
        .reduce((key, sq) => key ^ this.castleKeys[sq], 0n)
    }
  }

  // bitboard views
  get bb () { return this.bitboards[BoardSlot.OCCUPIED] }
  set bb (bb) { this.bitboards[BoardSlot.OCCUPIED] = bb }
  get posKey () { return this.bitboards[BoardSlot.POS_KEY] }
  set posKey (key) { this.bitboards[BoardSlot.POS_KEY] = key }

  get whiteBb () { return this.bitboards[BoardSlot.WHITE] }
  get whiteKingBb () { return this.bitboards[Piece.KING] }
  get whiteQueenBb () { return this.bitboards[Piece.QUEEN] }
  get whiteRookBb () { return this.bitboards[Piece.ROOK] }
  get whiteBishopBb () { return this.bitboards[Piece.BISHOP] }
  get whiteKnightBb () { return this.bitboards[Piece.KNIGHT] }
  get whitePawnBb () { return this.bitboards[Piece.PAWN] }
  get whiteMinorBb () { return this.whiteKnightBb | this.whiteBishopBb }
  get whiteMajorBb () { return this.whiteRookBb | this.whiteQueenBb }
  get whiteSliderBb () { return this.whiteMajorBb | this.whiteBishopBb }

  get blackBb () { return this.bitboards[BoardSlot.BLACK] }
  get blackKingBb () { return this.bitboards[6 + Piece.KING] }
  get blackQueenBb () { return this.bitboards[6 + Piece.QUEEN] }
  get blackRookBb () { return this.bitboards[6 + Piece.ROOK] }
  get blackBishopBb () { return this.bitboards[6 + Piece.BISHOP] }
  get blackKnightBb () { return this.bitboards[6 + Piece.KNIGHT] }
  get blackPawnBb () { return this.bitboards[6 + Piece.PAWN] }
  get blackMinorBb () { return this.blackKnightBb | this.blackBishopBb }
  get blackMajorBb () { return this.blackRookBb | this.blackQueenBb }
  get blackSliderBb () { return this.blackMajorBb | this.blackBishopBb }

  // the rook squares that can still castle, e.g. 0x81n = both white rooks
  get castleStatus () {
    return Object.keys(CastleRights)
      .filter((symbol) => (this.castleRights & CastleRights[symbol]) !== 0)
      .reduce((status, symbol) => status | this.castleBit[symbol], 0n)
  }

  get epSqIdx () { return this.epSq === EMPTY ? undefined : this.epSq }
  get epSqBb () { return this.epSq === EMPTY ? 0n : SQUARE_BB[this.epSq] }

  // the pawn that can be captured en passant
  get epCaptureBb () {
    if (this.epSq === EMPTY) { return 0n }
    return SQUARE_BB[this.whiteToMove ? this.epSq - 8 : this.epSq + 8]
  }

  get checkersBb () { return ThreatBoard.checkers(this) }
  get checkerCount () { return BitHelper.popCount(this.checkersBb) }
  get sideInCheck () { return this.checkersBb !== 0n }

  legalMoves () {
    return MoveList.legalMoves(this)
  }

  moves (fenPiece = 'all') {
    return MoveList.for(fenPiece, this)
  }

  isSqAttacked (sq, byPieceOrSide = 'all') {
    return ThreatBoard.isSqAttacked(this, sq, byPieceOrSide)
  }

  isOurKingXrayed () {
    return ThreatBoard.isOurKingXrayed(this)
  }

  isTheirKingXrayed () {
    return ThreatBoard.isTheirKingXrayed(this)
  }

  isInCheck () {
    return this.sideInCheck
  }
}

module.exports = {
  Board: Board
}
