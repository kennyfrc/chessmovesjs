function U64 (int) {
  return BigInt.asUintN(64, BigInt(int))
}

function U64Comp (int) {
  return BigInt.asUintN(64, ~BigInt(int))
}

function U64Neg (int) {
  return BigInt.asUintN(64, -BigInt(int))
}

class BitHelper {
  static getBit (bb, bitPosition) {
    return (U64(bb) & (U64(1) << U64(bitPosition))) === U64(0)
      ? U64(0)
      : U64(1)
  }

  static setBit (bb, bitPosition) {
    return U64(bb) | U64(1) << U64(bitPosition)
  }

  static clearBit (bb, bitPosition) {
    const mask = U64Comp(U64(1) << U64(bitPosition))
    return U64(bb & mask)
  }

  static updateBit (bb, bitPosition, bitValue) {
    const bitValueNormalized = U64(bitValue) ? U64(1) : U64(0)
    const clearMask = U64Comp(U64(1) << U64(bitPosition))
    return (bb & clearMask) | (bitValueNormalized << U64(bitPosition))
  }

  static bitsFor (indices) {
    return indices
      .map((idx) => BitHelper.setBit(U64(0), idx))
      .reduce((accBit, currBit) => accBit | currBit, U64(0))
  }

  static deBruijnMagicNum () {
    return U64('0x03f79d71b4cb0a89')
  }

  /* eslint-disable */
  static deBruijnTable() {
    return [    0, 47,  1, 56, 48, 27,  2, 60,
               57, 49, 41, 37, 28, 16,  3, 61,
               54, 58, 35, 52, 50, 42, 21, 44,
               38, 32, 29, 23, 17, 11,  4, 62,
               46, 55, 26, 59, 40, 36, 15, 53,
               34, 51, 20, 43, 31, 22, 10, 45,
               25, 39, 14, 33, 19, 30,  9, 24,
               13, 18,  8, 12,  7,  6,  5, 63 ];
  }
  /* eslint-enable */

  /**
    * De Bruijn Multiplication
    */
  static bitScanFwd (bb) {
    bb = U64(bb) ^ (U64(bb) - U64(1))
    return BitHelper.deBruijnTable()[(U64(bb * BitHelper.deBruijnMagicNum()) >> U64(58))]
  }

  static bitScanRev (bb) {
    bb |= U64(bb) >> U64(1)
    bb |= U64(bb) >> U64(2)
    bb |= U64(bb) >> U64(4)
    bb |= U64(bb) >> U64(8)
    bb |= U64(bb) >> U64(16)
    bb |= U64(bb) >> U64(32)
    return BitHelper.deBruijnTable()[(U64(bb * BitHelper.deBruijnMagicNum()) >> U64(58))]
  }

  /** counting bits:
   *  www-graphics.stanford.edu/~seander/bithacks.html#CountBitsSetKernighan
   **/
  static popCount (bb) {
    let count = 0

    while (U64(bb) > 0) {
      count++
      bb &= U64(bb) - U64(1) // reset LS1B
    }

    return count
  }
}

// LERF-mapping constants
class BoardHelper {
  static aFile () {
    return U64('0x0101010101010101')
  }

  static bFile () {
    return U64('0x0202020202020202')
  }

  static cFile () {
    return U64('0x0404040404040404')
  }

  static dFile () {
    return U64('0x0808080808080808')
  }

  static eFile () {
    return U64('0x1010101010101010')
  }

  static fFile () {
    return U64('0x2020202020202020')
  }

  static gFile () {
    return U64('0x4040404040404040')
  }

  static hFile () {
    return U64('0x8080808080808080')
  }

  static firstRank () {
    return U64('0x00000000000000FF')
  }

  static secondRank () {
    return U64('0x000000000000FF00')
  }

  static thirdRank () {
    return U64('0x0000000000FF0000')
  }

  static fourthRank () {
    return U64('0x00000000FF000000')
  }

  static fifthRank () {
    return U64('0x000000FF00000000')
  }

  static sixthRank () {
    return U64('0x0000FF0000000000')
  }

  static seventhRank () {
    return U64('0x00FF000000000000')
  }

  static eighthRank () {
    return U64('0xFF00000000000000')
  }

  static a1H8Diagonal () {
    return U64('0x8040201008040201')
  }

  static h1A8Diagonal () {
    return U64('0x0102040810204080')
  }

  static lightSq () {
    return U64('0x55AA55AA55AA55AA')
  }

  static darkSq () {
    return U64('0xAA55AA55AA55AA55')
  }

  static blackKsSqs () {
    return U64('0x6000000000000000')
  }

  static blackQsSqs () {
    return U64('0xE00000000000000')
  }

  static whiteQsSqs () {
    return U64('0xE')
  }

  static whiteKsSqs () {
    return U64('0x60')
  }

  static whiteKsCastleRookSq () {
    return U64('0x80')
  }

  static whiteQsCastleRookSq () {
    return U64('0x1')
  }

  static blackKsCastleRookSq () {
    return U64('0x8000000000000000')
  }

  static blackQsCastleRookSq () {
    return U64('0x100000000000000')
  }

  static whiteCastleSqs () {
    return U64('0x81')
  }

  static blackCastleSqs () {
    return U64('0x8100000000000000')
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
}

class SquareHelper {
  static for (rankFile) {
    // Little-Endian Rank-File Mapping
    /* eslint-disable object-property-newline, key-spacing */
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
    /* eslint-enable object-property-newline, key-spacing */
    return indexMap[rankFile]
  }

  /* eslint-disable no-cond-assign */
  static indicesFor (board) {
    const someList = []
    if (U64(board) !== U64(0)) {
      do {
        const idx = BitHelper.bitScanFwd(board)
        someList.push(idx)
      } while (board &= U64(board) - U64(1))
    }

    return someList
  }
  /* eslint-enable no-cond-assign */
}

module.exports = {
  BitHelper: BitHelper,
  BoardHelper: BoardHelper,
  ViewHelper: ViewHelper,
  SquareHelper: SquareHelper,
  U64: U64,
  U64Comp: U64Comp,
  U64Neg: U64Neg
}
