const FenReader = require('./fen.js').FenReader
const BitHelper = require('./helpers.js').BitHelper
const PieceBoard = require('./pieceboard.js').PieceBoard
const PieceBoardList = require('./pieceboard.js').PieceBoardList
const ViewHelper = require('./helpers.js').ViewHelper
const SquareHelper = require('./helpers.js').SquareHelper
const U64 = require('./helpers.js').U64
const Pieces = require('./pieces.js').Pieces
const MoveList = require('./move.js').MoveList
const ThreatBoard = require('./threatboard.js').ThreatBoard
const BoardProxy = require('./boardproxy.js').BoardProxy
const PieceStatus = require('./pieces.js').PieceStatus
const Direction = require('./attack.js').Direction
const LCG = require('./prng.js').LCG

class Board {
  constructor (seed=91289) {
    this.bb = U64(0)
    this.initWhiteBitBoards()
    this.initBlackBitBoards()
    this.initPieceBoardList()
    this.initCheckEvasionData()
    this.initPinAndXrayData()
    this.initEnPassantData()
    this.initZobristKey(seed)
    this.initMoveCounters()
    this.initCastleData()
    this.whiteToMove = true
    this.halfMoveClock = 0
    this.fullMoveNo = 0
    this.isThreeFoldRepetition = false
  }

  initWhiteBitBoards () {
    this.whiteBb = U64(0)
    this.whiteKingBb = U64(0)
    this.whitePawnBb = U64(0)
    this.whiteKnightBb = U64(0)
    this.whiteBishopBb = U64(0)
    this.whiteRookBb = U64(0)
    this.whiteQueenBb = U64(0)
    this.whiteMinorBb = U64(0)
    this.whiteMajorBb = U64(0)
  }

  initBlackBitBoards () {
    this.blackBb = U64(0)
    this.blackKingBb = U64(0)
    this.blackPawnBb = U64(0)
    this.blackKnightBb = U64(0)
    this.blackBishopBb = U64(0)
    this.blackRookBb = U64(0)
    this.blackQueenBb = U64(0)
    this.blackMinorBb = U64(0)
    this.blackMajorBb = U64(0)
  }

  initCheckEvasionData () {
    this.sideInCheck = false
    this.checkersBb = U64(0)
    this.checkerCount = 0
    this.checkingPiece = null
    this.kingDangerSquares = U64(0)
    this.whiteKingDangerSquares = U64(0)
    this.blackKingDangerSquares = U64(0)
  }

  initPinAndXrayData () {
    this.xrayDangerSqs = U64(0)
    this.xrayAttackSqs = U64(0)
    this.theirBlockers = U64(0)
    this.ourBlockers = U64(0)
    this.theirKingPinnerBb = U64(0)
    this.ourKingPinnerBb = U64(0)
    this.theirPinnersRay = U64(0)
    this.ourPinnersRay = U64(0)
  }

  initPieceBoardList () {
    this.pieceBoardList = new PieceBoardList()
  }

  initEnPassantData () {
    this.epSqIdx = undefined
    this.epSqBb = U64(0)
    this.epCaptureBb = U64(0)
  }

  initCastleData () {
    this.castleStatus = U64(0)
    this.castleBit = {
      K: U64('0x80'),
      Q: U64('0x1'),
      k: U64('0x8000000000000000'),
      q: U64('0x100000000000000')
    }
  }

  initZobristKey (seed) {
    this.lcg = new LCG(seed)
    this.posKey = U64(0)
    this.pieceKeys = new PieceKeys()
    this.enPassantKeys = new BigUint64Array(64)
    this.sideKey = new BigUint64Array(2)
    this.castleKeys = new BigUint64Array(64)
  }

  initMoveCounters () {
    this.ply = 0
    this.whiteCastleDisablePly = null
    this.blackCastleDisablePly = null
  }

  parseFenToBoard (fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
    this.resetBoard()
    this.initKeys()

    let boardIndex = 56 // fens start at a8
    let ranksRead = 1
    let whiteSpace = 0

    for (let i = 0; i < fen.length; i++) {
      if (FenReader.finishedReadingBoard(ranksRead, whiteSpace)) {
        if (FenReader.isSidetoMove(fen[i])) {
          this.whiteToMove = fen[i] === 'w' ? true : false
          this.posKey ^= fen[i] === 'w' ? this.sideKey[0] : this.sideKey[1]
        }

        if (FenReader.isCastlingSymbol(fen[i])) {
          const castleBit = this.castleBit[fen[i]]
          const castleIdx = BitHelper.bitScanFwd(castleBit)
          this.castleStatus |= castleBit
          this.posKey ^= this.castleKeys[castleIdx]
        }

        if (FenReader.isEnPassantChar(fen[i], whiteSpace)) {
          const epSq = fen[i] + fen[i + 1]
          this.epSqIdx = SquareHelper.for(epSq)
          this.epSqBb = BitHelper.setBit(U64(0), this.epSqIdx)
          this.epCaptureBb = this.getEpCaptureBb()
          this.posKey ^= this.enPassantKeys[this.epSqIdx]
          i += 1
        }

        /**
         * TODO: There will be an external class that decides whether
         * a pawn is advanced or there was a capture
         * both of the above require move history
         **/
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
            this.ply = this.whiteToMove ? this.fullMoveNo * 2 - 2 : this.fullMoveNo * 2 - 1
          } else {
            this.fullMoveNo = parseInt(fen[i] + fen[i + 1])
            this.ply = this.whiteToMove ? this.fullMoveNo * 2 - 2 : this.fullMoveNo * 2 - 1
            i += 1
          }
        }
      } else {
        if (FenReader.isWhitePiece(fen[i])) {
          const pieceBit = BitHelper.setBit(this.pieceBoardList[fen[i]].bb, boardIndex)
          this.pieceBoardList[fen[i]] = PieceBoard.for(fen[i], pieceBit)
          this.posKey ^= this.pieceKeys[fen[i]][boardIndex]
          boardIndex += 1
        }

        if (FenReader.isBlackPiece(fen[i])) {
          const pieceBit = BitHelper.setBit(this.pieceBoardList[fen[i]].bb, boardIndex)
          this.pieceBoardList[fen[i]] = PieceBoard.for(fen[i], pieceBit)
          this.posKey ^= this.pieceKeys[fen[i]][boardIndex]
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

    this.setPieceContext()
  }

  resetBoard () {
    this.pieceBoardList = new PieceBoardList()
  }

  /**
   * A8 = 56 thus, that's where we do the exclusive xor (where you flip)
   * you might need to flip the main boards first
   */
  flipBoard () {
    for (let sq = 0; sq < 32; sq++) {
      for (const [piece, pboard] of Object.entries(this.pieceBoardList)) {
        const bit = BitHelper.getBit(pboard.bb, sq)
        const invertedBit = BitHelper.getBit(pboard.bb, sq ^ 56)
        pboard.bb = BitHelper.updateBit(pboard.bb, sq, invertedBit)
        pboard.bb = BitHelper.updateBit(pboard.bb, sq ^ 56, bit)
        this.pieceBoardList[piece] = pboard
      }
    }
  }

  clearPieceBbs () {
    this.whiteKingBb = U64(0)
    this.blackKingBb = U64(0)
    this.whiteQueenBb = U64(0)
    this.blackQueenBb = U64(0)
    this.whiteRookBb = U64(0)
    this.blackRookBb = U64(0)
    this.whiteBishopBb = U64(0)
    this.blackBishopBb = U64(0)
    this.whiteKnightBb = U64(0)
    this.blackKnightBb = U64(0)
    this.whitePawnBb = U64(0)
    this.blackPawnBb = U64(0)
  }

  setPieceContext () {
    this.clearPieceBbs()
    this.setPieceBbs()
    this.setPieceSetBbs()
    this.setBoardBb()
    this.setBlockers()
    this.setThreats()
    this.setInCheck()
    this.setCheckerCount()
    this.setXrayDangerSqs()
    this.setXrayAttackSqs()
  }

  setPieceBbs () {
    this.whiteKingBb |= this.pieceBoardList.K.bb
    this.blackKingBb |= this.pieceBoardList.k.bb
    this.whiteQueenBb |= this.pieceBoardList.Q.bb
    this.blackQueenBb |= this.pieceBoardList.q.bb
    this.whiteRookBb |= this.pieceBoardList.R.bb
    this.blackRookBb |= this.pieceBoardList.r.bb
    this.whiteBishopBb |= this.pieceBoardList.B.bb
    this.blackBishopBb |= this.pieceBoardList.b.bb
    this.whiteKnightBb |= this.pieceBoardList.N.bb
    this.blackKnightBb |= this.pieceBoardList.n.bb
    this.whitePawnBb |= this.pieceBoardList.P.bb
    this.blackPawnBb |= this.pieceBoardList.p.bb
  }

  setPieceSetBbs () {
    this.whiteMajorBb = this.whiteRookBb | this.whiteQueenBb
    this.whiteMinorBb = this.whiteKnightBb | this.whiteBishopBb
    this.whiteBb = this.whiteMajorBb | this.whiteMinorBb | this.whitePawnBb |
      this.whiteKingBb
    this.blackMajorBb = this.blackRookBb | this.blackQueenBb
    this.blackMinorBb = this.blackKnightBb | this.blackBishopBb
    this.blackBb = this.blackMajorBb | this.blackMinorBb | this.blackPawnBb |
      this.blackKingBb
  }

  setBoardBb () {
    this.bb = this.whiteBb | this.blackBb
  }

  setInCheck () {
    const kingBb = this.whiteToMove ? this.whiteKingBb : this.blackKingBb
    this.sideInCheck = (this.kingDangerSquares & kingBb) !== U64(0)
  }

  setCheckerCount () {
    this.checkerCount = this.sideInCheck ? BitHelper.popCount(this.checkersBb) : 0
  }

  setThreats () {
    const sideToAttack = this.whiteToMove ? 'b' : 'w'
    const kingToMove = this.whiteToMove ? 'K' : 'k'
    const boardProxyNoKing = new BoardProxy(this)
    boardProxyNoKing.bb ^= boardProxyNoKing.pieceBoardList[kingToMove].bb
    this.setKingDangerThreats(sideToAttack, boardProxyNoKing, true)
  }

  setKingDangerThreats (byPieceOrSide, boardProxy, findCheckers = false) {
    Pieces.for(byPieceOrSide)
      .forEach((fenPiece) => {
        PieceStatus.isPawn(fenPiece)
          ? this.setPawnThreats(boardProxy, fenPiece)
          : this.setPieceThreats(boardProxy, fenPiece)
      })
  }

  setPawnThreats (boardProxy, fenPiece) {
    const pieceBoard = boardProxy.pieceBoardList[fenPiece]
    SquareHelper.indicesFor(pieceBoard.bb)
      .map((sq) => BitHelper.setBit(U64(0), sq))
      .forEach((pieceBb) => {
        const threats = pieceBoard.rawPawnAttacks(pieceBb, boardProxy)

        this.setCheckers(threats, pieceBb, boardProxy)
        this.setDangerSquares(threats, pieceBb)
      })
  }

  setPieceThreats (boardProxy, fenPiece) {
    const pieceBoard = boardProxy.pieceBoardList[fenPiece]
    SquareHelper.indicesFor(pieceBoard.bb)
      .map((sq) => BitHelper.setBit(U64(0), sq))
      .forEach((pieceBb) => {
        const threats = pieceBoard.attacks(pieceBb, boardProxy) | pieceBoard.defends(pieceBb, this)
        const kingBb = boardProxy.whiteToMove ? boardProxy.whiteKingBb : boardProxy.blackKingBb
        this.setCheckers(threats, pieceBb, boardProxy)
        this.setDangerSquares(threats, pieceBb, fenPiece)
      })    
  }

  setDangerSquares (threats, pieceBb, fenPiece) {
    let pawnAttacks = U64(0)
    if (this.whiteToMove) {
      pawnAttacks = Direction.bPawnAttacks(this.pieceBoardList.p.bb)
      this.whiteKingDangerSquares |= (threats | pawnAttacks)
      this.kingDangerSquares |= (this.whiteKingDangerSquares)
    } else {
      pawnAttacks = Direction.wPawnAttacks(this.pieceBoardList.P.bb)
      this.blackKingDangerSquares |= (threats | pawnAttacks)
      this.kingDangerSquares |= (this.blackKingDangerSquares)
    }
  }

  setCheckers (threats, pieceBb, boardProxy) {
    const kingBb = boardProxy.whiteToMove ? boardProxy.whiteKingBb : boardProxy.blackKingBb
    this.checkersBb |= ((threats & kingBb) !== U64(0)) ? pieceBb : U64(0)
  }

  setBlockers () {
    const opponentsSide = this.whiteToMove ? 'bs' : 'ws'
    const ourSide = opponentsSide === 'ws' ? 'bs' : 'ws'
    const theirBlockers = ThreatBoard.for(opponentsSide, this) & this.bb 
    const ourBlockers = ThreatBoard.for(ourSide, this) & this.bb
    this.theirBlockers = theirBlockers
    this.ourBlockers = ourBlockers
  }

  setXrayDangerSqs () {
    const opponentsSide = this.whiteToMove ? 'bs' : 'ws'
    const blockers = this.getTheirBlockers() | this.getOurBlockers()
    const boardProxyNoBlockers = new BoardProxy(this)
    boardProxyNoBlockers.bb = boardProxyNoBlockers.bb ^ blockers
    this.xrayDangerSqs = ThreatBoard.for(opponentsSide, boardProxyNoBlockers, true)
    this.theirKingPinnerBb = boardProxyNoBlockers.theirKingPinnerBb
    this.theirPinnersRay = boardProxyNoBlockers.theirPinnersRay 
  }

  setXrayAttackSqs () {
    const ourSide = this.whiteToMove ? 'ws' : 'bs'
    const blockers = this.getTheirBlockers() | this.getOurBlockers()
    const boardProxyNoBlockers = new BoardProxy(this)
    boardProxyNoBlockers.bb = boardProxyNoBlockers.bb ^ blockers
    this.xrayAttackSqs = ThreatBoard.for(ourSide, boardProxyNoBlockers, false)
    this.ourKingPinnerBb = boardProxyNoBlockers.ourKingPinnerBb
    this.ourPinnersRay = boardProxyNoBlockers.ourPinnersRay 
  }

  initKeys () {
    Pieces.for('all').forEach((piece) => {
      [...Array(64).keys()].forEach((sq) => {
        this.pieceKeys[piece][sq] = this.lcg.randomBigInt()
      })
    });

    [...Array(64).keys()].forEach((sq) => {
      this.enPassantKeys[sq] = this.lcg.randomBigInt()
    });

    [...Array(64).keys()].forEach((sq) => {
      this.castleKeys[sq] = this.lcg.randomBigInt()
    })

    this.sideKey[0] = U64(0)
    this.sideKey[1] = this.lcg.randomBigInt()
  }

  getEpCaptureBb () {
    return this.whiteToMove ? this.epSqBb >> U64(8) : this.epSqBb << U64(8)
  }

  getTheirBlockers () {
    return this.theirBlockers
  }

  getOurBlockers () {
    return this.ourBlockers
  }

  getXrayDangerBb () {
    return this.xrayDangerSqs
  }

  getXrayAttackBb () {
    return this.xrayAttackSqs
  }

  legalMoves () {
    return MoveList.legalMoves(this)
  }

  moves (fenPiece = 'all') {
    return fenPiece ? MoveList.for(fenPiece, this) : MoveList.legalMoves(this)
  }

  isSqAttacked (sq, byPieceOrSide = 'all') {
    return BoardStatus.isSqAttacked(this, sq, byPieceOrSide)
  }

  isOurKingXrayed () {
    return BoardStatus.isOurKingXrayed(this)
  }

  isTheirKingXrayed () {
    return BoardStatus.isTheirKingXrayed(this)
  }

  isOurPiecePinnedToKing () {
    return BoardStatus.isOurPiecePinnedToKing(this)
  }

  isTheirPiecePinnedToTheirKing () {
    return BoardStatus.isTheirPiecePinnedToTheirKing(this)
  }

  isInCheck () {
    return BoardStatus.isInCheck(this)
  }
}

class BoardStatus {
  static isSqAttacked (board, sq, byPieceOrSide = 'all') {
    const targetSq = BitHelper.setBit(U64(0), sq)
    const attacks = ThreatBoard.for(byPieceOrSide, board)
    return (targetSq & attacks) !== U64(0)
  }

  static isOurKingXrayed (board) {
    const ourKingFen = board.whiteToMove ? 'K' : 'k'
    const ourKing = board.pieceBoardList[ourKingFen].bb
    const opponentXrays = board.getXrayDangerBb()
    return (ourKing & opponentXrays) !== U64(0)
  }

  static isTheirKingXrayed (board) {
    const theirKingFen = board.whiteToMove ? 'k' : 'K'
    const theirKing = board.pieceBoardList[theirKingFen].bb
    const ourXrays = board.getXrayAttackBb()
    return (theirKing & ourXrays) !== U64(0)
  }

  static isInCheck (board) {
    return board.sideInCheck
  }
}

class PieceKeys {
  constructor () {
    this.K = new BigUint64Array(64)
    this.Q = new BigUint64Array(64)
    this.R = new BigUint64Array(64)
    this.B = new BigUint64Array(64)
    this.N = new BigUint64Array(64)
    this.P = new BigUint64Array(64)
    this.k = new BigUint64Array(64)
    this.q = new BigUint64Array(64)
    this.r = new BigUint64Array(64)
    this.b = new BigUint64Array(64)
    this.n = new BigUint64Array(64)
    this.p = new BigUint64Array(64)
  }
}

module.exports = {
  Board: Board
}
