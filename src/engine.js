const Board = require('./board.js').Board
const MoveList = require('./move.js').MoveList
const MoveKind = require('./move.js').MoveKind
const CastleRights = require('./helpers.js').CastleRights
const Piece = require('./pieces.js').Piece
const BoardSlot = require('./pieces.js').BoardSlot
const SQUARE_BB = require('./attack.js').SQUARE_BB
const Search = require('./search.js').Search

const EMPTY = -1
const MAX_MOVES = 256 // per position; the most any legal position has is 218
const MAX_DEPTH = 128

class ObjectHelper {
  static orderKeys (unorderedObj) {
    return Object.keys(unorderedObj).sort().reduce(
      (obj, key) => {
        obj[key] = unorderedObj[key]
        return obj
      },
      {}
    )
  }
}

class CastleMasks {
  // the castle rights that survive a move touching each square
  static build () {
    const masks = new Int8Array(64).fill(15)
    masks[0] = 15 & ~CastleRights.Q
    masks[7] = 15 & ~CastleRights.K
    masks[4] = 15 & ~(CastleRights.K | CastleRights.Q)
    masks[56] = 15 & ~CastleRights.q
    masks[63] = 15 & ~CastleRights.k
    masks[60] = 15 & ~(CastleRights.k | CastleRights.q)
    return masks
  }
}

const CASTLE_MASKS = CastleMasks.build()

/**
 * Makes and unmakes moves on a Board. Move codes come from
 * MoveList.generate; make(move) also takes the move objects
 * that board.legalMoves() returns.
 * Everything unmake needs is kept in typed-array stacks, one entry per move.
 */
class Engine {
  constructor (fen, seed) {
    this.board = new Board(seed)
    this.board.parseFenToBoard(fen)
    this.moveBuffer = new Int32Array(MAX_MOVES * MAX_DEPTH)
    this.movesMade = 0
    this.initStacks(256)
    this.keyHistory[0] = this.board.bitboards[BoardSlot.POS_KEY]
  }

  initStacks (size) {
    this.moveStack = new Int32Array(size)
    this.captureStack = new Int8Array(size)
    this.castleStack = new Int8Array(size)
    this.epStack = new Int8Array(size)
    this.halfMoveStack = new Int32Array(size)
    // keyHistory[n] is the position key after n moves
    this.keyHistory = new BigUint64Array(size + 1)
    this.keyHistory32 = new Int32Array(this.keyHistory.buffer)
  }

  growStacks () {
    const grow = (stack, size) => {
      const TypedArray = stack.constructor
      const bigger = new TypedArray(size)
      bigger.set(stack)
      return bigger
    }
    const size = this.moveStack.length * 2
    this.moveStack = grow(this.moveStack, size)
    this.captureStack = grow(this.captureStack, size)
    this.castleStack = grow(this.castleStack, size)
    this.epStack = grow(this.epStack, size)
    this.halfMoveStack = grow(this.halfMoveStack, size)
    this.keyHistory = grow(this.keyHistory, size + 1)
    this.keyHistory32 = new Int32Array(this.keyHistory.buffer)
  }

  perft (depth, root = true) {
    const start = Date.now()
    const divide = {}
    const moves = this.moveBuffer
    const end = MoveList.generate(this.board, moves, 0)
    let nodes = 0

    for (let i = 0; i < end; i++) {
      let count = 1
      if (depth > 1) {
        this.makeMove(moves[i])
        count = this.countNodes(depth - 1, end)
        this.unmakeMove()
      }
      nodes += count
      if (root) { divide[MoveList.uciFor(moves[i])] = count }
    }

    if (root) { this.printDivide(depth, divide, nodes, Date.now() - start) }
    return nodes
  }

  // perft below the root; moves for this ply live at moveBuffer[start...]
  countNodes (depth, start) {
    if (depth === 1) { return MoveList.count(this.board) }
    const moves = this.moveBuffer
    const end = MoveList.generate(this.board, moves, start)

    let nodes = 0
    for (let i = start; i < end; i++) {
      this.makeMove(moves[i])
      // one call less for each leaf's parent: count the last ply right here
      nodes += depth === 2 ? MoveList.count(this.board) : this.countNodes(depth - 1, end)
      this.unmakeMove()
    }
    return nodes
  }

  printDivide (depth, divide, nodes, elapsedMs) {
    const orderedMoves = ObjectHelper.orderKeys(divide)
    console.log(`go perft ${depth}`)
    Object.keys(orderedMoves).forEach((uci) => {
      console.log(`${uci}: ${orderedMoves[uci]}`)
    })
    console.log('\n' + `Nodes searched: ${nodes}` + '\n' + `Time spent: ${elapsedMs} ms`)
    console.log(`Nodes per second: ${Math.round(nodes / Math.max(elapsedMs, 1) * 1000)} Nodes/s`)
  }

  /**
   * The best move after an alpha-beta search depth plies deep, as
   * { move, score, mate, depth, nodes, pv } with UCI moves and the score in
   * centipawns for the side to move. The hash table lives on between calls.
   */
  search (depth) {
    if (this.searcher === undefined) { this.searcher = new Search(this) }
    return this.searcher.run(depth)
  }

  make (move) {
    this.makeMove(move.code)
  }

  unmake () {
    this.unmakeMove()
  }

  makeMove (code) {
    const board = this.board
    const from = code & 63
    const to = (code >> 6) & 63
    const kind = code >>> 12
    const piece = board.squares[from]
    const captured = board.squares[to]
    const color = board.whiteToMove ? 0 : 1
    this.saveState(code, captured)

    if (captured !== EMPTY) { this.removePiece(captured, to) }
    this.movePiece(piece, from, to)
    // only castling, en passant and promotions touch a second piece
    if (kind >= MoveKind.CASTLE) { this.handleSpecialMoves(kind, color, from, to) }
    if (piece === color * 6 + Piece.KING) { board.kingSqs[color] = to }
    this.updateCastleRights(from, to)
    this.updateEnPassant(kind, from, to)
    this.updateHalfMoveClock(piece, captured)
    this.updateOccupancy()
    this.incrementFullMoveNo()
    this.updateSideToMove()

    board.ply += 1
    this.movesMade += 1
    this.keyHistory[this.movesMade] = board.bitboards[BoardSlot.POS_KEY]
    this.handleThreeFoldRepetition()
  }

  unmakeMove () {
    const board = this.board
    const m = this.movesMade - 1
    const code = this.moveStack[m]
    const from = code & 63
    const to = (code >> 6) & 63
    const kind = code >>> 12
    this.updateSideToMove()
    this.decrementFullMoveNo()
    const color = board.whiteToMove ? 0 : 1

    if (kind >= MoveKind.CASTLE) { this.undoSpecialMoves(kind, color, from, to) }
    const piece = board.squares[to]
    this.movePiece(piece, to, from)
    if (piece === color * 6 + Piece.KING) { board.kingSqs[color] = from }
    if (this.captureStack[m] !== EMPTY) { this.putPiece(this.captureStack[m], to) }
    this.restoreState(m)
    this.updateOccupancy()

    board.ply -= 1
    this.movesMade = m
    this.handleThreeFoldRepetition()
  }

  saveState (code, captured) {
    const board = this.board
    const m = this.movesMade
    if (m + 1 >= this.moveStack.length) { this.growStacks() }
    this.moveStack[m] = code
    this.captureStack[m] = captured
    this.castleStack[m] = board.castleRights
    this.epStack[m] = board.epSq
    this.halfMoveStack[m] = board.halfMoveClock
  }

  restoreState (m) {
    const board = this.board
    board.castleRights = this.castleStack[m]
    board.epSq = this.epStack[m]
    board.halfMoveClock = this.halfMoveStack[m]
    board.bitboards[BoardSlot.POS_KEY] = this.keyHistory[m]
  }

  handleSpecialMoves (kind, color, from, to) {
    switch (kind) {
      case MoveKind.QUIET:
      case MoveKind.DOUBLE_PUSH:
        return
      case MoveKind.EN_PASSANT:
        this.removePiece(6 - color * 6 + Piece.PAWN, this.epCaptureSq(color, to))
        return
      case MoveKind.CASTLE:
        this.movePiece(color * 6 + Piece.ROOK, this.castleRookFrom(from, to), this.castleRookTo(from, to))
        return
      default:
        this.removePiece(color * 6 + Piece.PAWN, to)
        this.putPiece(color * 6 + this.promotedType(kind), to)
    }
  }

  undoSpecialMoves (kind, color, from, to) {
    switch (kind) {
      case MoveKind.QUIET:
      case MoveKind.DOUBLE_PUSH:
        return
      case MoveKind.EN_PASSANT:
        this.putPiece(6 - color * 6 + Piece.PAWN, this.epCaptureSq(color, to))
        return
      case MoveKind.CASTLE:
        this.movePiece(color * 6 + Piece.ROOK, this.castleRookTo(from, to), this.castleRookFrom(from, to))
        return
      default:
        this.removePiece(color * 6 + this.promotedType(kind), to)
        this.putPiece(color * 6 + Piece.PAWN, to)
    }
  }

  // the pawn taken en passant sits behind the square we land on
  epCaptureSq (color, to) {
    return color === 0 ? to - 8 : to + 8
  }

  castleRookFrom (kingFrom, kingTo) {
    return kingTo > kingFrom ? kingTo + 1 : kingTo - 2
  }

  castleRookTo (kingFrom, kingTo) {
    return kingTo > kingFrom ? kingTo - 1 : kingTo + 1
  }

  promotedType (kind) {
    return kind - MoveKind.PROMOTE_QUEEN + Piece.QUEEN
  }

  // piece moves, side boards and position key move together
  movePiece (piece, from, to) {
    const board = this.board
    const bbs = board.bitboards
    bbs[piece] ^= SQUARE_BB[from] | SQUARE_BB[to]
    bbs[BoardSlot.WHITE + (piece < 6 ? 0 : 1)] ^= SQUARE_BB[from] | SQUARE_BB[to]
    bbs[BoardSlot.POS_KEY] ^= board.pieceKeys[piece * 64 + from] ^ board.pieceKeys[piece * 64 + to]
    board.squares[from] = EMPTY
    board.squares[to] = piece
  }

  putPiece (piece, sq) {
    const board = this.board
    const bbs = board.bitboards
    bbs[piece] ^= SQUARE_BB[sq]
    bbs[BoardSlot.WHITE + (piece < 6 ? 0 : 1)] ^= SQUARE_BB[sq]
    bbs[BoardSlot.POS_KEY] ^= board.pieceKeys[piece * 64 + sq]
    board.squares[sq] = piece
  }

  removePiece (piece, sq) {
    const board = this.board
    const bbs = board.bitboards
    bbs[piece] ^= SQUARE_BB[sq]
    bbs[BoardSlot.WHITE + (piece < 6 ? 0 : 1)] ^= SQUARE_BB[sq]
    bbs[BoardSlot.POS_KEY] ^= board.pieceKeys[piece * 64 + sq]
    board.squares[sq] = EMPTY
  }

  updateOccupancy () {
    const bbs = this.board.bitboards
    bbs[BoardSlot.OCCUPIED] = bbs[BoardSlot.WHITE] | bbs[BoardSlot.BLACK]
  }

  updateCastleRights (from, to) {
    const board = this.board
    const rights = board.castleRights & CASTLE_MASKS[from] & CASTLE_MASKS[to]
    if (rights !== board.castleRights) {
      board.bitboards[BoardSlot.POS_KEY] ^= board.castleDeltaKeys[rights ^ board.castleRights]
      board.castleRights = rights
    }
  }

  updateEnPassant (kind, from, to) {
    this.board.epSq = kind === MoveKind.DOUBLE_PUSH ? (from + to) >> 1 : EMPTY
  }

  updateHalfMoveClock (piece, captured) {
    const isPawnMove = piece === Piece.PAWN || piece === 6 + Piece.PAWN
    this.board.halfMoveClock = (isPawnMove || captured !== EMPTY) ? 0 : this.board.halfMoveClock + 1
  }

  updateSideToMove () {
    this.board.whiteToMove = !this.board.whiteToMove
  }

  incrementFullMoveNo () {
    if (!this.board.whiteToMove) { this.board.fullMoveNo += 1 }
  }

  decrementFullMoveNo () {
    if (!this.board.whiteToMove) { this.board.fullMoveNo -= 1 }
  }

  // same position as 4 and 8 moves ago (the same side is to move)
  handleThreeFoldRepetition () {
    const m = this.movesMade
    this.board.isThreeFoldRepetition = m >= 9 &&
      this.isSameKey(m, m - 4) && this.isSameKey(m - 4, m - 8)
  }

  isSameKey (a, b) {
    const keys = this.keyHistory32
    return keys[2 * a] === keys[2 * b] && keys[2 * a + 1] === keys[2 * b + 1]
  }
}

module.exports = {
  Engine: Engine
}
