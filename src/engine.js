const Board = require('./board.js').Board
const Pieces = require('./pieces.js').Pieces
const ViewHelper = require('./helpers.js').ViewHelper
const BoardHelper = require('./helpers.js').BoardHelper
const BitHelper = require('./helpers.js').BitHelper
const PieceStatus = require('./pieces.js').PieceStatus
const SquareHelper = require('./helpers.js').SquareHelper
const Direction = require('./attack.js').Direction

class ObjectHelper {
  static orderKeys (unorderedObj) {
    return Object.keys(unorderedObj).sort().reduce(
      (obj, key) => { 
        obj[key] = unorderedObj[key]; 
        return obj;
      }, 
      {}
    )
  }
}

class Engine {
  constructor (fen, seed) {
    this.board = new Board(seed)
    this.board.parseFenToBoard(fen)
    this.moveStack = new LinkedList()
    this.captureStack = new LinkedList()
    this.halfMoveStack = new LinkedList()
    this.epStack = new LinkedList()
    this.posKeys = []
  }

  perft (depth, root=true) {
    const start = Date.now()  
    const divide = {}
    let count = 0
    let nodes = 0
    let debugMoves;
    const leaf = (depth === 2)
    const moves = this.board.legalMoves()

    for (let i = 0; i < moves.length; i++) {
      if (root && depth <= 1) {
        count = 1
        nodes += 1
      } else {
        this.make(moves[i])
        count = leaf 
          ? this.board.legalMoves().length 
          : this.perft(depth - 1, false)
        nodes += count
        this.unmake()
      }
      if (root) {
        if (moves[i].promotion) {
          const promoteTo = moves[i].promoteTo.toLowerCase()
          divide[SquareHelper.uciFor(moves[i])+promoteTo] = count  
        } else {
          divide[SquareHelper.uciFor(moves[i])] = count
        }
        
      }
    }

    if (root) {
      const orderedMoves = ObjectHelper.orderKeys(divide)
      console.log(`go perft ${depth}`)
      Object.keys(orderedMoves).forEach((san) => {
        console.log(`${san}: ${orderedMoves[san]}`)
      })
      console.log(`\n` + `Nodes searched: ${nodes}` + `\n` + `Time spent: ${Date.now() - start} ms`)
    }

    return nodes
  }

  make (move) {
    this.board.ply++
    const fromIdx = move.from
    const toIdx = move.to
    const fromBit = move.fromBit
    const toBit = move.toBit
    const check = move.check
    const capture = move.capture
    const fenChar = move.fenChar
    const castle = move.castle
    const epRisk = move.epRisk
    const ep = move.ep
    const promotion = move.promotion
    const promoteTo = move.promoteTo
    const pieceList = this.board.pieceBoardList
    const castleStatus = this.board.castleStatus
    const epCaptureBb = this.board.epCaptureBb
    const posKey = this.board.posKey
    const pieceBb = 0n
    const pieceBoard = null
    const pieceBoardWCapture = null
    const rookCastleFrom = null
    const rookCastleTo = null


    // these are moves that require past context
    this.handleMakeCaptureMoves(capture, pieceList, toBit, toIdx, ep, move, fenChar)
    this.handleMakeEpCaptureMoves(move, capture, pieceList, toBit, ep, epCaptureBb)
    this.updateEpStack()
    this.handleMoveWithEpRisk(epRisk, toBit)

    // reset the context
    this.board.initWhiteBitBoards()
    this.board.initBlackBitBoards()
    this.board.initCheckEvasionData()
    this.board.initPinAndXrayData()
    this.board.initMoveCounters()

    // make moves now that we're on a clean slate
    this.handleMakeKingMoves(castleStatus, fenChar)
    this.handleMakeCastleStatuses(castleStatus, fenChar, fromBit)
    this.handleRookMovesWhenCastling(castle, toIdx, pieceList)
    this.handlePieceMove(pieceList, fromBit, toBit, promotion, promoteTo, fenChar)
    this.handlePosKeysDueToMove(fenChar, fromIdx, toIdx, promotion, promoteTo)
    this.handleMakeHalfMoveNo(fenChar)
    this.handleThreeFoldRepetition()
    this.incrementFullMoveNo()
    this.updateSideToMove()
    this.board.setPieceContext()    
    this.moveStack.append(move)
    this.posKeys.push(this.board.posKey)
  }

  unmake () {
    const lastMove = this.moveStack.pop()
    const epNode = this.epStack.pop() || new EpNode()
    const fromIdx = lastMove.from
    const toIdx = lastMove.to
    const fromBit = lastMove.fromBit
    const toBit = lastMove.toBit
    const check = lastMove.check
    const capture = lastMove.capture
    const fenChar = lastMove.fenChar
    const castle = lastMove.castle
    const promotion = lastMove.promotion
    const promoteTo = lastMove.promoteTo
    const ep = lastMove.ep
    const epCaptureBb = lastMove.epBb || epNode.epCaptureBb
    const epSqIdx = this.board.epSqIdx || epNode.epSqIdx
    const epSqBb = this.board.epSqBb || epNode.epSqBb
    const pieceList = this.board.pieceBoardList
    const castleDisabledLastMove = (this.board.ply === this.board.whiteCastleDisablePly) ||
            (this.board.ply === this.board.blackCastleDisablePly)
    const posKey = this.board.posKey
    const pieceBb = 0n
    const pieceBoard = null
    const capturedPieceBoard = null

    // these are moves that require past context
    this.handleUnMakeCaptureMoves(lastMove, pieceList, toBit, toIdx, ep)
    this.handleUnMakeEpCaptureMoves(lastMove, pieceList, ep, epCaptureBb, toIdx)
    this.handleUnMakeEpRisks(epSqIdx, this.board, epNode)

    // reset the context
    this.board.initWhiteBitBoards()
    this.board.initBlackBitBoards()
    this.board.initCheckEvasionData()
    this.board.initPinAndXrayData()
    this.board.initMoveCounters()

    // unmake moves now that we're on a clean slate
    this.handleUnMakeKingMoves(castleDisabledLastMove, fenChar)
    this.handleUnMakeCastleStatuses(castleDisabledLastMove, fenChar, fromBit)
    this.handleRookMovesWhenCastling(castle, toIdx, pieceList)
    this.unMakePieceMove(pieceList, fromBit, toBit, promotion, promoteTo, fenChar)
    this.unMakePosKeysDueToMove(fenChar, fromIdx, toIdx, promotion, promoteTo)
    this.handleUnMakeHalfMoveNo(fenChar)
    this.decrementFullMoveNo()
    this.updateSideToMove()
    this.board.setPieceContext()
    this.board.ply--
    this.posKeys.pop()
  }

  handleThreeFoldRepetition () {
    const length = this.posKeys.length
    this.board.isThreeFoldRepetition = ((this.posKeys[length-1] === this.posKeys[length-5]) 
        && (this.posKeys[length-5] === this.posKeys[length-9]))
  }

  updateEpStack () {
    this.epStack.append(new EpNode(
      this.board.epSqBb, 
      this.board.epSqIdx, 
      this.board.epCaptureBb)
    )
  }

  restoreFromEpStack (epNode) {
    this.board.epSqBb = epNode.epSqBb
    this.board.epSqIdx = epNode.epSqIdx
    this.board.epCaptureBb = epNode.epCaptureBb
  }

  updateSideToMove () {
    this.board.whiteToMove = this.board.whiteToMove 
      ? false 
      : true
  }

  // increment / decrement
  incrementFullMoveNo () {
    this.board.fullMoveNo = this.board.whiteToMove 
      ? this.board.fullMoveNo
      : this.board.fullMoveNo + 1
  }

  decrementFullMoveNo () {
    this.board.fullMoveNo = this.board.whiteToMove 
      ? this.board.fullMoveNo - 1
      : this.board.fullMoveNo
  }

  // make() helper functions
  makeCaptures (pieceList, toBit, toIdx, fenChar) {
    const pieceBoardWCapture = pieceList.firstMatch((piece) => (toBit & piece.bb) !== 0n)
    pieceBoardWCapture.bb ^= toBit
    const capturedFenChar = pieceBoardWCapture.fenChar
    this.board.posKey ^= this.board.pieceKeys[capturedFenChar][toIdx]
    this.captureStack.append(capturedFenChar)
    this.resetHalfMoveNo()
  }

  makeEpCaptures (move, pieceList, toBit, epCaptureBb) {
    const pieceBoardWCapture = ((toBit & BoardHelper.sixthRank()) !== 0n)
      ? pieceList.p
      : pieceList.P
    pieceBoardWCapture.bb ^= epCaptureBb
    const capturedFenChar = pieceBoardWCapture.fenChar
    const epIdx = BitHelper.bitScanFwd(epCaptureBb)
    this.board.posKey ^= this.board.pieceKeys[capturedFenChar][epIdx]
    this.captureStack.append(capturedFenChar)
    this.resetEnPassantSquares()
    this.markMoveWithCaptureBb(move, epCaptureBb)
    this.resetHalfMoveNo()
  }

  markMoveWithCaptureBb (move, epCaptureBb) {
    move.epBb = epCaptureBb
  }

  makeWhiteKingPos () {
    this.board.castleStatus ^= BoardHelper.whiteCastleSqs()
    this.board.posKey ^= this.board.castleKeys[0]
    this.board.posKey ^= this.board.castleKeys[7]
    this.board.whiteCastleDisablePly = this.board.ply
  }

  makeBlackKingPos () {
    this.board.castleStatus ^= BoardHelper.blackCastleSqs()
    this.board.posKey ^= this.board.castleKeys[56]
    this.board.posKey ^= this.board.castleKeys[63]
    this.board.blackCastleDisablePly = this.board.ply
  }

  makeWhiteKsRook (pieceList) {
    const rook = pieceList.R
    rook.bb ^= (BoardHelper.whiteKsCastleRookSq() | BitHelper.setBit(0n, 5))
    this.board.posKey ^= this.board.pieceKeys.R[7]
    this.board.posKey ^= this.board.pieceKeys.R[5]
  }

  makeWhiteQsRook (pieceList) {
    const rook = pieceList.R
    rook.bb ^= (BoardHelper.whiteQsCastleRookSq() | BitHelper.setBit(0n, 3))
    this.board.posKey ^= this.board.pieceKeys.R[0]
    this.board.posKey ^= this.board.pieceKeys.R[3]
  }

  makeBlackKsRook (pieceList) {
    const rook = pieceList.r
    rook.bb ^= (BoardHelper.blackKsCastleRookSq() | BitHelper.setBit(0n, 61))
    this.board.posKey ^= this.board.pieceKeys.r[63]
    this.board.posKey ^= this.board.pieceKeys.r[61]
  }

  makeBlackQsRook (pieceList) {
    if (pieceList === undefined) { console.log(pieceList) }
    const rook = pieceList.r
    rook.bb ^= (BoardHelper.blackQsCastleRookSq() | BitHelper.setBit(0n, 59))
    this.board.posKey ^= this.board.pieceKeys.r[56]
    this.board.posKey ^= this.board.pieceKeys.r[59]
  }

  makeWhiteKsCastleStatus () {
    this.board.castleStatus ^= BoardHelper.whiteKsCastleRookSq()
    this.board.posKey ^= this.board.castleKeys[7]
    this.board.whiteCastleDisablePly = this.board.ply
  }

  makeWhiteQsCastleStatus () {
    this.board.castleStatus ^= BoardHelper.whiteQsCastleRookSq()
    this.board.posKey ^= this.board.castleKeys[0]
    this.board.whiteCastleDisablePly = this.board.ply
  }

  makeBlackKsCastleStatus () {
    this.board.castleStatus ^= BoardHelper.blackKsCastleRookSq()
    this.board.posKey ^= this.board.castleKeys[63]
    this.board.blackCastleDisablePly = this.board.ply
  }

  makeBlackQsCastleStatus () {
    this.board.castleStatus ^= BoardHelper.blackQsCastleRookSq()
    this.board.posKey ^= this.board.castleKeys[56]
    this.board.blackCastleDisablePly = this.board.ply
  }

  handlePieceMove (pieceList, fromBit, toBit, promotion, promoteTo, fenChar) {
    if (promotion) {
      const pieceBoard = pieceList[fenChar]
      const promotionPieceBoard = pieceList[promoteTo]
      pieceBoard.bb ^= fromBit
      promotionPieceBoard.bb ^= toBit
    } else {
      const pieceBoard = pieceList[fenChar]
      pieceBoard.bb ^= (fromBit | toBit)
    }
  }

  handleMakeHalfMoveNo (fenChar) {
    if (PieceStatus.isNotPawn(fenChar)) {
      this.incrementHalfMoveNo()
    } else {
      this.resetHalfMoveNo()
    }
  }

  incrementHalfMoveNo () {
    this.halfMoveStack.append(this.board.halfMoveClock)
    this.board.halfMoveClock += 1
  }

  decrementHalfMoveNo () {
    this.halfMoveStack.pop()
    this.board.halfMoveClock -= 1 
  }

  handleUnMakeHalfMoveNo (fenChar) {
    if (PieceStatus.isNotPawn(fenChar)) {
      this.decrementHalfMoveNo()
    } else {
      this.restoreHalfMoveNo()
    }
  }

  resetHalfMoveNo () {
    this.halfMoveStack.append(this.board.halfMoveClock)
    this.board.halfMoveClock = 0
  }

  restoreHalfMoveNo () {
    this.board.halfMoveClock = this.halfMoveStack.pop()
  }

  handlePosKeysDueToMove (fenChar, fromIdx, toIdx, promotion, promoteTo) {
    if (promotion) {
      this.board.posKey ^= this.board.pieceKeys[fenChar][fromIdx]
      this.board.posKey ^= this.board.pieceKeys[promoteTo][toIdx]
    } else {
      this.board.posKey ^= this.board.pieceKeys[fenChar][fromIdx]
      this.board.posKey ^= this.board.pieceKeys[fenChar][toIdx]
    }
  }

  isWhiteKingMoveAndCastleStatusValid (castleStatus, fenChar) {
    return (castleStatus & BoardHelper.whiteCastleSqs()) !== 0n && fenChar === 'K'
  }

  isBlackKingMoveAndCastleStatusValid (castleStatus, fenChar) {
    return (castleStatus & BoardHelper.blackCastleSqs()) !== 0n && fenChar === 'k'
  }

  isWantingToCastleWhiteKs (castle, toIdx) {
    return castle && (toIdx === 6)
  }

  isWantingToCastleWhiteQs (castle, toIdx) {
    return castle && (toIdx === 2)
  }

  isWantingToCastleBlackKs (castle, toIdx) {
    return castle && (toIdx === 62)
  }

  isWantingToCastleBlackQs (castle, toIdx) {
    return castle && (toIdx === 58)
  }

  isWhiteRookMoveAndKsCastleStatusValid (castleStatus, fenChar, fromBit) {
    return (castleStatus & BoardHelper.whiteKsCastleRookSq() & fromBit) !== 0n && fenChar === 'R'
  }

  isWhiteRookMoveAndQsCastleStatusValid (castleStatus, fenChar, fromBit) {
    return (castleStatus & BoardHelper.whiteQsCastleRookSq() & fromBit) !== 0n && fenChar === 'R'
  }

  isBlackRookMoveAndKsCastleStatusValid (castleStatus, fenChar, fromBit) {
    return (castleStatus & BoardHelper.blackKsCastleRookSq() & fromBit) !== 0n && fenChar === 'r'
  }

  isBlackRookMoveAndQsCastleStatusValid (castleStatus, fenChar, fromBit) {
    return (castleStatus & BoardHelper.blackQsCastleRookSq() & fromBit) !== 0n && fenChar === 'r'
  }

  isPawnBesideTheirPinnedPiece (pawnToBit) {
    const pinnedPiece = this.board.ourPinnersRay & this.board.ourBlockers
    return (Direction.beside(pawnToBit) & pinnedPiece) !== 0n
  }

  handleMoveWithEpRisk (epRisk, toBit) {
    if ((epRisk && epRisk !== 0n) && (!this.isPawnBesideTheirPinnedPiece(toBit))) {
      this.board.epSqBb = epRisk
      this.board.epSqIdx = BitHelper.bitScanFwd(epRisk)
      this.board.epCaptureBb = toBit
    } else {
      this.board.epSqBb = 0n
      this.board.epSqIdx = undefined
      this.board.epCaptureBb = 0n
    }
  }

  handleUnMakeEpRisks (epSqIdx, board, epNode) {
    if (epSqIdx) {
      this.board.epSqBb = epNode.epSqBb || 0n
      this.board.epSqIdx = epNode.epSqIdx || undefined
      this.board.epCaptureBb = epNode.epCaptureBb || 0n
    }
  }

  handleMakeKingMoves (castleStatus, fenChar) {
    if (this.isWhiteKingMoveAndCastleStatusValid(castleStatus, fenChar)) {
      this.makeWhiteKingPos()
    }

    if (this.isBlackKingMoveAndCastleStatusValid(castleStatus, fenChar)) {
      this.makeBlackKingPos()
    }
  }

  handleMakeCastleStatuses (castleStatus, fenChar, fromBit) {
    if (this.isWhiteRookMoveAndKsCastleStatusValid(castleStatus, fenChar, fromBit)) {
      this.makeWhiteKsCastleStatus()
    }

    if (this.isWhiteRookMoveAndQsCastleStatusValid(castleStatus, fenChar, fromBit)) {
      this.makeWhiteQsCastleStatus()
    }

    if (this.isBlackRookMoveAndKsCastleStatusValid(castleStatus, fenChar, fromBit)) {
      this.makeBlackKsCastleStatus()
    }

    if (this.isBlackRookMoveAndQsCastleStatusValid(castleStatus, fenChar, fromBit)) {
      this.makeBlackQsCastleStatus()
    }
  }

  handleRookMovesWhenCastling (castle, toIdx, pieceList) {
    if (this.isWantingToCastleWhiteKs(castle, toIdx)) {
      this.makeWhiteKsRook(pieceList)
    }

    if (this.isWantingToCastleWhiteQs(castle, toIdx)) {
      this.makeWhiteQsRook(pieceList)
    }

    if (this.isWantingToCastleBlackKs(castle, toIdx)) {
      this.makeBlackKsRook(pieceList)
    }

    if (this.isWantingToCastleBlackQs(castle, toIdx)) {
      this.makeBlackQsRook(pieceList)
    }
  }

  handleMakeCaptureMoves (capture, pieceList, toBit, toIdx, ep, move, fenChar) {
    if (capture && !ep) {
      this.makeCaptures(pieceList, toBit, toIdx, fenChar)
    }
  }

  handleMakeEpCaptureMoves (move, capture, pieceList, toBit, ep, epCaptureBb) {
    if (capture && ep) {
      this.makeEpCaptures(move, pieceList, toBit, epCaptureBb)
    }
  }

  // utilities
  resetEnPassantSquares () {
    this.board.epSqIdx = null
    this.board.epCaptureBb = 0n
    this.board.epSqBb = 0n
  }

  restoreEnPassantSquares (toIdx, epBb) {
    this.board.epSqIdx = toIdx
    this.board.epCaptureBb = epBb
    this.board.epSqBb = BitHelper.setBit(0n, toIdx)
  }

  // unmake() helper functions
  unMakeCaptures (pieceList, toBit, toIdx) {
    const capturedFenChar = this.captureStack.pop()
    const capturedPieceBoard = pieceList[capturedFenChar]
    capturedPieceBoard.bb ^= toBit
    this.board.posKey ^= this.board.pieceKeys[capturedFenChar][toIdx]
    this.restoreHalfMoveNo()
  }

  unMakeEpCaptures (pieceList, epBb, toIdx) {
    const capturedFenChar = this.captureStack.pop()
    const capturedPieceBoard = pieceList[capturedFenChar]
    capturedPieceBoard.bb ^= epBb
    const epIdx = BitHelper.bitScanFwd(epBb)
    this.board.posKey ^= this.board.pieceKeys[capturedFenChar][epIdx]
    this.restoreEnPassantSquares(toIdx, epBb)
    this.restoreHalfMoveNo()
  }

  unMakeWhiteKingPos () {
    this.board.castleStatus ^= BoardHelper.whiteCastleSqs()
    this.board.posKey ^= this.board.castleKeys[0]
    this.board.posKey ^= this.board.castleKeys[7]
    this.board.whiteCastleDisablePly = null
  }

  unMakeBlackKingPos () {
    this.board.castleStatus ^= BoardHelper.blackCastleSqs()
    this.board.posKey ^= this.board.castleKeys[56]
    this.board.posKey ^= this.board.castleKeys[63]
    this.board.blackCastleDisablePly = null
  }

  unMakeWhiteKsRook () {
    this.board.castleStatus ^= BoardHelper.whiteKsCastleRookSq()
    this.board.posKey ^= this.board.castleKeys[7]
    this.board.whiteCastleDisablePly = null
  }

  unMakeWhiteQsRook () {
    this.board.castleStatus ^= BoardHelper.whiteQsCastleRookSq()
    this.board.posKey ^= this.board.castleKeys[0]
    this.board.whiteCastleDisablePly = null
  }

  unMakeBlackKsRook () {
    this.board.castleStatus ^= BoardHelper.blackKsCastleRookSq()
    this.board.posKey ^= this.board.castleKeys[63]
    this.board.blackCastleDisablePly = null
  }

  unMakeBlackQsRook () {
    this.board.castleStatus ^= BoardHelper.blackQsCastleRookSq()
    this.board.posKey ^= this.board.castleKeys[56]
    this.board.blackCastleDisablePly = null
  }

  unMakePieceMove (pieceList, fromBit, toBit, promotion, promoteTo, fenChar) {
    if (promotion) {
      const pieceBoard = pieceList[fenChar]
      const promotionPieceBoard = pieceList[promoteTo]
      pieceBoard.bb ^= fromBit
      promotionPieceBoard.bb ^= toBit
    } else {
      const pieceBoard = pieceList[fenChar]
      pieceBoard.bb ^= (fromBit | toBit)
    }
  }

  unMakePosKeysDueToMove (fenChar, fromIdx, toIdx, promotion, promoteTo) {
    if (promotion) {
      this.board.posKey ^= this.board.pieceKeys[fenChar][fromIdx]
      this.board.posKey ^= this.board.pieceKeys[promoteTo][toIdx]
    } else {
      this.board.posKey ^= this.board.pieceKeys[fenChar][toIdx]
      this.board.posKey ^= this.board.pieceKeys[fenChar][fromIdx]
    }
  }

  isWhiteKingAndLastMoveIsCastle (castleDisabledLastMove, fenChar) {
    return castleDisabledLastMove && fenChar === 'K'
  }

  isBlackKingAndLastMoveIsCastle (castleDisabledLastMove, fenChar) {
    return castleDisabledLastMove && fenChar === 'k'
  }

  isWhiteRookAndLastMoveIsKsCastle (castleDisabledLastMove, fenChar, fromBit) {
    return (castleDisabledLastMove && fenChar === 'R') &&
      (fromBit & BoardHelper.whiteKsCastleRookSq()) !== 0n
  }

  isWhiteRookAndLastMoveIsQsCastle (castleDisabledLastMove, fenChar, fromBit) {
    return (castleDisabledLastMove && fenChar === 'R') &&
      (fromBit & BoardHelper.whiteQsCastleRookSq()) !== 0n
  }

  isBlackRookAndLastMoveIsKsCastle (castleDisabledLastMove, fenChar, fromBit) {
    return (castleDisabledLastMove && fenChar === 'r') &&
      (fromBit & BoardHelper.blackKsCastleRookSq()) !== 0n
  }

  isBlackRookAndLastMoveIsQsCastle (castleDisabledLastMove, fenChar, fromBit) {
    return (castleDisabledLastMove && fenChar === 'r') &&
      (fromBit & BoardHelper.blackQsCastleRookSq()) !== 0n
  }

  handleUnMakeCaptureMoves (lastMove, pieceList, toBit, toIdx, ep) {
    if (lastMove.capture && !ep) {
      this.unMakeCaptures(pieceList, toBit, toIdx)
    }
  }

  handleUnMakeEpCaptureMoves (lastMove, pieceList, ep, epCaptureBb, toIdx) {
    if (lastMove.capture && ep) {
      this.unMakeEpCaptures(pieceList, epCaptureBb, toIdx)
    }
  }

  handleUnMakeKingMoves (castleDisabledLastMove, fenChar) {
    if (this.isWhiteKingAndLastMoveIsCastle(castleDisabledLastMove, fenChar)) {
      this.unMakeWhiteKingPos()
    }

    if (this.isBlackKingAndLastMoveIsCastle(castleDisabledLastMove, fenChar)) {
      this.unMakeBlackKingPos()
    }
  }

  handleUnMakeCastleStatuses (castleDisabledLastMove, fenChar, fromBit) {
    if (this.isWhiteRookAndLastMoveIsKsCastle(castleDisabledLastMove, fenChar, fromBit)) {
      this.unMakeWhiteKsRook()
    }

    if (this.isWhiteRookAndLastMoveIsQsCastle(castleDisabledLastMove, fenChar, fromBit)) {
      this.unMakeWhiteQsRook()
    }

    if (this.isBlackRookAndLastMoveIsKsCastle(castleDisabledLastMove, fenChar, fromBit)) {
      this.unMakeBlackKsRook()
    }

    if (this.isBlackRookAndLastMoveIsQsCastle(castleDisabledLastMove, fenChar, fromBit)) {
      this.unMakeBlackQsRook()
    }
  }
}

class EpNode {
  constructor (epSqBb, epSqIdx, epCaptureBb) {
    this.epSqBb = epSqBb
    this.epSqIdx = epSqIdx
    this.epCaptureBb = epCaptureBb
  }
}

class Node {
  constructor (element) {
    this.element = element
    this.next = null
  }
}

class LinkedList {
  constructor () {
    this.head = null
    this.tail = null
    this.length = 0
  }

  append (element) {
    const node = new Node(element)
    let current = null
    if (this.head === null) {
      this.head = node
    } else {
      current = this.head
      while (current.next) {
        current = current.next
      }
      current.next = node
      this.tail = node
    }
    this.length++
  }

  pop () {
    if (!this.head) { return undefined }
    let current = this.head
    let previous = null
    while (current.next) {
      previous = current
      current = current.next
    }
    if (previous) { previous.next = null };
    this.tail = previous
    this.length--
    if (this.length === 0) { this.head = null }
    return current.element
  }
}

module.exports = {
  Engine: Engine
}
