const Pieces = require('./pieces.js').Pieces

/**
 * V8 only keeps BigInt math unboxed (fast) when the result is written into a
 * BigUint64Array. So hot code writes bitboards into typed "scratch" slots
 * and reads them back as two 32-bit halves through an Int32Array view.
 * The halves are [low, high] on little-endian platforms.
 */
if (new Uint8Array(new Uint32Array([1]).buffer)[0] !== 1) {
  throw new Error('chessmovesjs needs a little-endian platform')
}

// set bits in every 16-bit number; two lookups beat a SWAR popcount in perft
const POP16 = new Uint8Array(1 << 16)
for (let i = 1; i < POP16.length; i++) { POP16[i] = (i & 1) + POP16[i >> 1] }

const SCRATCH = new BigUint64Array(1)
const SCRATCH32 = new Int32Array(SCRATCH.buffer)

// castling rights as bit flags, keyed by their fen symbol
const CastleRights = { K: 1, Q: 2, k: 4, q: 8 }

function U64 (int) {
  return BigInt.asUintN(64, BigInt(int))
}

class BitHelper {
  static getBit (bb, bitPosition) {
    return (bb & (1n << BigInt(bitPosition))) === 0n
      ? 0n
      : 1n
  }

  static setBit (bb, bitPosition) {
    return bb | 1n << BigInt(bitPosition)
  }

  static clearBit (bb, bitPosition) {
    const mask = ~(1n << BigInt(bitPosition))
    return bb & mask
  }

  static updateBit (bb, bitPosition, bitValue) {
    const bitValueNormalized = BigInt(bitValue) ? 1n : 0n
    const clearMask = ~(1n << BigInt(bitPosition))
    return (bb & clearMask) | (bitValueNormalized << BigInt(bitPosition))
  }

  static bitsFor (indices) {
    return indices
      .map((idx) => BitHelper.setBit(0n, idx))
      .reduce((accBit, currBit) => accBit | currBit, 0n)
  }

  // index of the least significant set bit, or -1 for an empty board
  static bitScanFwd (bb) {
    SCRATCH[0] = bb
    const lo = SCRATCH32[0]
    const hi = SCRATCH32[1]
    if (lo !== 0) { return 31 - Math.clz32(lo & -lo) }
    if (hi !== 0) { return 63 - Math.clz32(hi & -hi) }
    return -1
  }

  // index of the most significant set bit, or -1 for an empty board
  static bitScanRev (bb) {
    SCRATCH[0] = bb
    const lo = SCRATCH32[0]
    const hi = SCRATCH32[1]
    if (hi !== 0) { return 63 - Math.clz32(hi) }
    if (lo !== 0) { return 31 - Math.clz32(lo) }
    return -1
  }

  static popCount (bb) {
    SCRATCH[0] = bb
    return BitHelper.popCount32(SCRATCH32[0]) + BitHelper.popCount32(SCRATCH32[1])
  }

  static popCount32 (bits) {
    return POP16[bits & 0xFFFF] + POP16[bits >>> 16]
  }

  // mirrors the board vertically (a1 <-> a8)
  static flipVertical (bb) {
    let flipped = 0n
    for (let rank = 0n; rank < 8n; rank++) {
      flipped |= ((bb >> (8n * rank)) & 0xFFn) << (8n * (7n - rank))
    }
    return flipped
  }
}

// LERF-mapping constants
class BoardHelper {
  static aFile () {
    return 0x0101010101010101n
  }

  static bFile () {
    return 0x0202020202020202n
  }

  static cFile () {
    return 0x0404040404040404n
  }

  static dFile () {
    return 0x0808080808080808n
  }

  static eFile () {
    return 0x1010101010101010n
  }

  static fFile () {
    return 0x2020202020202020n
  }

  static gFile () {
    return 0x4040404040404040n
  }

  static hFile () {
    return 0x8080808080808080n
  }

  static firstRank () {
    return 0x00000000000000FFn
  }

  static secondRank () {
    return 0x000000000000FF00n
  }

  static thirdRank () {
    return 0x0000000000FF0000n
  }

  static fourthRank () {
    return 0x00000000FF000000n
  }

  static fifthRank () {
    return 0x000000FF00000000n
  }

  static sixthRank () {
    return 0x0000FF0000000000n
  }

  static seventhRank () {
    return 0x00FF000000000000n
  }

  static eighthRank () {
    return 0xFF00000000000000n
  }

  static a1H8Diagonal () {
    return 0x8040201008040201n
  }

  static h1A8Diagonal () {
    return 0x0102040810204080n
  }

  static lightSq () {
    return 0x55AA55AA55AA55AAn
  }

  static darkSq () {
    return 0xAA55AA55AA55AA55n
  }

  static blackKsSqs () {
    return 0x6000000000000000n
  }

  static blackQsSqs () {
    return 0xE00000000000000n
  }

  static whiteQsSqs () {
    return 0xEn
  }

  static whiteKsSqs () {
    return 0x60n
  }

  static whiteKsCastleRookSq () {
    return 0x80n
  }

  static whiteQsCastleRookSq () {
    return 0x1n
  }

  static blackKsCastleRookSq () {
    return 0x8000000000000000n
  }

  static blackQsCastleRookSq () {
    return 0x100000000000000n
  }

  static whiteCastleSqs () {
    return 0x81n
  }

  static blackCastleSqs () {
    return 0x8100000000000000n
  }
}

class ViewHelper {
  static display (bb, message) {
    const bbToView = bb
    const userView = []
    for (let i = 0; i < 64; i++) {
      userView[i] = BitHelper.getBit(bbToView, i)
    }

    console.log(`=BEGIN ${message}` + '\n' +
      userView[SquareHelper.for('a8')] + userView[SquareHelper.for('b8')] +
      userView[SquareHelper.for('c8')] + userView[SquareHelper.for('d8')] +
      userView[SquareHelper.for('e8')] + userView[SquareHelper.for('f8')] +
      userView[SquareHelper.for('g8')] + userView[SquareHelper.for('h8')] + '\n' +
      userView[SquareHelper.for('a7')] + userView[SquareHelper.for('b7')] +
      userView[SquareHelper.for('c7')] + userView[SquareHelper.for('d7')] +
      userView[SquareHelper.for('e7')] + userView[SquareHelper.for('f7')] +
      userView[SquareHelper.for('g7')] + userView[SquareHelper.for('h7')] + '\n' +
      userView[SquareHelper.for('a6')] + userView[SquareHelper.for('b6')] +
      userView[SquareHelper.for('c6')] + userView[SquareHelper.for('d6')] +
      userView[SquareHelper.for('e6')] + userView[SquareHelper.for('f6')] +
      userView[SquareHelper.for('g6')] + userView[SquareHelper.for('h6')] + '\n' +
      userView[SquareHelper.for('a5')] + userView[SquareHelper.for('b5')] +
      userView[SquareHelper.for('c5')] + userView[SquareHelper.for('d5')] +
      userView[SquareHelper.for('e5')] + userView[SquareHelper.for('f5')] +
      userView[SquareHelper.for('g5')] + userView[SquareHelper.for('h5')] + '\n' +
      userView[SquareHelper.for('a4')] + userView[SquareHelper.for('b4')] +
      userView[SquareHelper.for('c4')] + userView[SquareHelper.for('d4')] +
      userView[SquareHelper.for('e4')] + userView[SquareHelper.for('f4')] +
      userView[SquareHelper.for('g4')] + userView[SquareHelper.for('h4')] + '\n' +
      userView[SquareHelper.for('a3')] + userView[SquareHelper.for('b3')] +
      userView[SquareHelper.for('c3')] + userView[SquareHelper.for('d3')] +
      userView[SquareHelper.for('e3')] + userView[SquareHelper.for('f3')] +
      userView[SquareHelper.for('g3')] + userView[SquareHelper.for('h3')] + '\n' +
      userView[SquareHelper.for('a2')] + userView[SquareHelper.for('b2')] +
      userView[SquareHelper.for('c2')] + userView[SquareHelper.for('d2')] +
      userView[SquareHelper.for('e2')] + userView[SquareHelper.for('f2')] +
      userView[SquareHelper.for('g2')] + userView[SquareHelper.for('h2')] + '\n' +
      userView[SquareHelper.for('a1')] + userView[SquareHelper.for('b1')] +
      userView[SquareHelper.for('c1')] + userView[SquareHelper.for('d1')] +
      userView[SquareHelper.for('e1')] + userView[SquareHelper.for('f1')] +
      userView[SquareHelper.for('g1')] + userView[SquareHelper.for('h1')] + '\n' +
      '=END')
  }

  static inspect (board, viewIdx, message) {
    const userView = new Array(64).fill('·', 0, 64)
    Pieces.for('all').forEach((piece) => {
      const indices = SquareHelper.indicesFor(board.pieceBoardList[piece].bb)
      indices.forEach((index) => {
        userView[index] = piece
      })
    })

    console.log(`=BEGIN ${message}` + '\n' +
      `piece on index: ${userView[viewIdx]}` + '\n' +
      'board' + '\n' +
      userView[SquareHelper.for('a8')] + userView[SquareHelper.for('b8')] +
      userView[SquareHelper.for('c8')] + userView[SquareHelper.for('d8')] +
      userView[SquareHelper.for('e8')] + userView[SquareHelper.for('f8')] +
      userView[SquareHelper.for('g8')] + userView[SquareHelper.for('h8')] + '\n' +
      userView[SquareHelper.for('a7')] + userView[SquareHelper.for('b7')] +
      userView[SquareHelper.for('c7')] + userView[SquareHelper.for('d7')] +
      userView[SquareHelper.for('e7')] + userView[SquareHelper.for('f7')] +
      userView[SquareHelper.for('g7')] + userView[SquareHelper.for('h7')] + '\n' +
      userView[SquareHelper.for('a6')] + userView[SquareHelper.for('b6')] +
      userView[SquareHelper.for('c6')] + userView[SquareHelper.for('d6')] +
      userView[SquareHelper.for('e6')] + userView[SquareHelper.for('f6')] +
      userView[SquareHelper.for('g6')] + userView[SquareHelper.for('h6')] + '\n' +
      userView[SquareHelper.for('a5')] + userView[SquareHelper.for('b5')] +
      userView[SquareHelper.for('c5')] + userView[SquareHelper.for('d5')] +
      userView[SquareHelper.for('e5')] + userView[SquareHelper.for('f5')] +
      userView[SquareHelper.for('g5')] + userView[SquareHelper.for('h5')] + '\n' +
      userView[SquareHelper.for('a4')] + userView[SquareHelper.for('b4')] +
      userView[SquareHelper.for('c4')] + userView[SquareHelper.for('d4')] +
      userView[SquareHelper.for('e4')] + userView[SquareHelper.for('f4')] +
      userView[SquareHelper.for('g4')] + userView[SquareHelper.for('h4')] + '\n' +
      userView[SquareHelper.for('a3')] + userView[SquareHelper.for('b3')] +
      userView[SquareHelper.for('c3')] + userView[SquareHelper.for('d3')] +
      userView[SquareHelper.for('e3')] + userView[SquareHelper.for('f3')] +
      userView[SquareHelper.for('g3')] + userView[SquareHelper.for('h3')] + '\n' +
      userView[SquareHelper.for('a2')] + userView[SquareHelper.for('b2')] +
      userView[SquareHelper.for('c2')] + userView[SquareHelper.for('d2')] +
      userView[SquareHelper.for('e2')] + userView[SquareHelper.for('f2')] +
      userView[SquareHelper.for('g2')] + userView[SquareHelper.for('h2')] + '\n' +
      userView[SquareHelper.for('a1')] + userView[SquareHelper.for('b1')] +
      userView[SquareHelper.for('c1')] + userView[SquareHelper.for('d1')] +
      userView[SquareHelper.for('e1')] + userView[SquareHelper.for('f1')] +
      userView[SquareHelper.for('g1')] + userView[SquareHelper.for('h1')] + '\n' +
      '=END')
  }
}

class SquareHelper {
  static for (rankFile) {
    // Little-Endian Rank-File Mapping
    /* eslint-disable @stylistic/object-property-newline, @stylistic/key-spacing */
    const indexMap = {
      a8: 56, b8: 57, c8: 58, d8: 59, e8: 60, f8: 61, g8: 62, h8: 63,
      a7: 48, b7: 49, c7: 50, d7: 51, e7: 52, f7: 53, g7: 54, h7: 55,
      a6: 40, b6: 41, c6: 42, d6: 43, e6: 44, f6: 45, g6: 46, h6: 47,
      a5: 32, b5: 33, c5: 34, d5: 35, e5: 36, f5: 37, g5: 38, h5: 39,
      a4: 24, b4: 25, c4: 26, d4: 27, e4: 28, f4: 29, g4: 30, h4: 31,
      a3: 16, b3: 17, c3: 18, d3: 19, e3: 20, f3: 21, g3: 22, h3: 23,
      a2:  8, b2:  9, c2: 10, d2: 11, e2: 12, f2: 13, g2: 14, h2: 15,
      a1:  0, b1:  1, c1:  2, d1:  3, e1:  4, f1:  5, g1:  6, h1:  7
    }
    /* eslint-enable @stylistic/object-property-newline, @stylistic/key-spacing */
    return indexMap[rankFile]
  }

  static uciFor (move) {
    const from = move.from
    const to = move.to
    /* eslint-disable @stylistic/object-property-newline, @stylistic/key-spacing */
    const indexMap = [
      'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1',
      'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
      'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
      'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
      'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5',
      'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
      'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7',
      'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8'
    ]
    /* eslint-enable @stylistic/object-property-newline, @stylistic/key-spacing */
    return indexMap[from] + indexMap[to]
  }

  static indicesFor (board) {
    const someList = []
    SCRATCH[0] = board
    for (let half = 0; half < 2; half++) {
      let bits = SCRATCH32[half]
      while (bits !== 0) {
        someList.push((half << 5) | (31 - Math.clz32(bits & -bits)))
        bits &= bits - 1
      }
    }
    return someList
  }
}

class PieceList {
  constructor () {
    this.K = 0
    this.Q = 0
    this.R = 0
    this.B = 0
    this.N = 0
    this.P = 0
    this.k = 0
    this.q = 0
    this.r = 0
    this.b = 0
    this.n = 0
    this.p = 0
  }

  forEach (callback) {
    for (const piece in this) {
      callback(this[piece])
    }
  }

  firstMatch (callback) {
    for (const piece in this) {
      if (callback(this[piece])) {
        return this[piece]
      }
    }
    return 0
  }
}

class PerftHelper {
  static countMoves (moveList) {
    const pieceList = new PieceList()
    moveList.forEach((move) => {
      pieceList[move.fenChar] += 1
    })
    console.log(pieceList)
  }
}

module.exports = {
  U64: U64,
  CastleRights: CastleRights,
  BitHelper: BitHelper,
  BoardHelper: BoardHelper,
  ViewHelper: ViewHelper,
  SquareHelper: SquareHelper,
  PerftHelper: PerftHelper
}
