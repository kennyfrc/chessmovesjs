function U64(int) {
  return BigInt.asUintN(64, BigInt(int));
}

function U64Comp(int) {
  return BigInt.asUintN(64, ~BigInt(int));
}

function U64Neg(int) {
  return BigInt.asUintN(64, -BigInt(int));
}


class BitHelper {
  static getBit(bb, bitPosition) {
    return (U64(bb) & (U64(1) << U64(bitPosition))) === U64(0) ?
      U64(0) : U64(1);
  }

  static setBit(bb, bitPosition) {
    return U64(bb) | U64(1) << U64(bitPosition);
  }

  static clearBit(bb, bitPosition) {
    const mask = U64Comp(U64(1) << U64(bitPosition));
    return U64(bb & mask);
  }

  static updateBit(bb, bitPosition, bitValue) {
    const bitValueNormalized = U64(bitValue) ? U64(1) : U64(0);
    const clearMask = U64Comp(U64(1) << U64(bitPosition));
    return (bb & clearMask) | (bitValueNormalized << U64(bitPosition));
  }

  static bitsFor(indices) {
    let parsedBit = U64(0);
    indices.forEach((idx) => {
      parsedBit |= BitHelper.setBit(parsedBit, idx);
    });
    return parsedBit;
  }

  static deBruijnMagicNum() {
    return U64('0x03f79d71b4cb0a89');
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
  static bitScanFwd(bb) {
    bb = U64(bb) ^ (U64(bb) - U64(1));
    return BitHelper.deBruijnTable()[(U64(bb * BitHelper.deBruijnMagicNum()) >> U64(58))];
  }

  static bitScanRev(bb) {
    bb |= U64(bb) >> U64(1);
    bb |= U64(bb) >> U64(2);
    bb |= U64(bb) >> U64(4);
    bb |= U64(bb) >> U64(8);
    bb |= U64(bb) >> U64(16);
    bb |= U64(bb) >> U64(32);  
    return BitHelper.deBruijnTable()[(U64(bb * BitHelper.deBruijnMagicNum()) >> U64(58))]
  }

  /** counting bits:
   *  www-graphics.stanford.edu/~seander/bithacks.html#CountBitsSetKernighan
   **/
  static popCount(bb) {
    let count = 0;

    while (U64(bb) > 0) {
      count++;
      bb &= U64(bb) - U64(1); // reset LS1B
    }

    return count;
  }
}

// LERF-mapping constants
class BoardHelper {
  static aFile() {
    return U64('0x0101010101010101');
  }
  static bFile() {
    return U64('0x0202020202020202');
  }
  static cFile() {
    return U64('0x0404040404040404');
  }
  static dFile() {
    return U64('0x0808080808080808');
  }
  static eFile() {
    return U64('0x1010101010101010');
  }
  static fFile() {
    return U64('0x2020202020202020');
  }
  static gFile() {
    return U64('0x4040404040404040');
  }
  static hFile() {
    return U64('0x8080808080808080');
  }
  static firstRank() {
    return U64('0x00000000000000FF');
  }
  static secondRank() {
    return U64('0x000000000000FF00');
  }
  static thirdRank() {
    return U64('0x0000000000FF0000');
  }
  static fourthRank() {
    return U64('0x00000000FF000000');
  }
  static fifthRank() {
    return U64('0x000000FF00000000');
  }
  static sixthRank() {
    return U64('0x0000FF0000000000');
  }
  static seventhRank() {
    return U64('0x00FF000000000000');
  }
  static eighthRank() {
    return U64('0xFF00000000000000');
  }
  static a1H8Diagonal() {
    return U64('0x8040201008040201');
  }
  static h1A8Diagonal() {
    return U64('0x0102040810204080');
  }
  static lightSq() {
    return U64('0x55AA55AA55AA55AA');
  }
  static darkSq() {
    return U64('0xAA55AA55AA55AA55');
  }
}

class ViewHelper {
  static display(bb, message) {
    const bbToView = bb;
    const userView = [];
    for (let i = 0; i < 64; i++) {
      userView[i] = BitHelper.getBit(bbToView, i);
    }

    console.log(`=BEGIN ${message}` + '\n' +
      userView[SquareHelper.for('A8')] + userView[SquareHelper.for('B8')] +
      userView[SquareHelper.for('C8')] + userView[SquareHelper.for('D8')] +
      userView[SquareHelper.for('E8')] + userView[SquareHelper.for('F8')] +
      userView[SquareHelper.for('G8')] + userView[SquareHelper.for('H8')] + '\n' +
      userView[SquareHelper.for('A7')] + userView[SquareHelper.for('B7')] +
      userView[SquareHelper.for('C7')] + userView[SquareHelper.for('D7')] +
      userView[SquareHelper.for('E7')] + userView[SquareHelper.for('F7')] +
      userView[SquareHelper.for('G7')] + userView[SquareHelper.for('H7')] + '\n' +
      userView[SquareHelper.for('A6')] + userView[SquareHelper.for('B6')] +
      userView[SquareHelper.for('C6')] + userView[SquareHelper.for('D6')] +
      userView[SquareHelper.for('E6')] + userView[SquareHelper.for('F6')] +
      userView[SquareHelper.for('G6')] + userView[SquareHelper.for('H6')] + '\n' +
      userView[SquareHelper.for('A5')] + userView[SquareHelper.for('B5')] +
      userView[SquareHelper.for('C5')] + userView[SquareHelper.for('D5')] +
      userView[SquareHelper.for('E5')] + userView[SquareHelper.for('F5')] +
      userView[SquareHelper.for('G5')] + userView[SquareHelper.for('H5')] + '\n' +
      userView[SquareHelper.for('A4')] + userView[SquareHelper.for('B4')] +
      userView[SquareHelper.for('C4')] + userView[SquareHelper.for('D4')] +
      userView[SquareHelper.for('E4')] + userView[SquareHelper.for('F4')] +
      userView[SquareHelper.for('G4')] + userView[SquareHelper.for('H4')] + '\n' +
      userView[SquareHelper.for('A3')] + userView[SquareHelper.for('B3')] +
      userView[SquareHelper.for('C3')] + userView[SquareHelper.for('D3')] +
      userView[SquareHelper.for('E3')] + userView[SquareHelper.for('F3')] +
      userView[SquareHelper.for('G3')] + userView[SquareHelper.for('H3')] + '\n' +
      userView[SquareHelper.for('A2')] + userView[SquareHelper.for('B2')] +
      userView[SquareHelper.for('C2')] + userView[SquareHelper.for('D2')] +
      userView[SquareHelper.for('E2')] + userView[SquareHelper.for('F2')] +
      userView[SquareHelper.for('G2')] + userView[SquareHelper.for('H2')] + '\n' +
      userView[SquareHelper.for('A1')] + userView[SquareHelper.for('B1')] +
      userView[SquareHelper.for('C1')] + userView[SquareHelper.for('D1')] +
      userView[SquareHelper.for('E1')] + userView[SquareHelper.for('F1')] +
      userView[SquareHelper.for('G1')] + userView[SquareHelper.for('H1')] + '\n' +
      '=END');
  }
}

class SquareHelper {
  static for(rankFile) {
    // Little-Endian Rank-File Mapping
    /* eslint-disable key-spacing */
    const indexMap = {
      A8: 56, B8: 57, C8: 58, D8: 59, E8: 60, F8: 61, G8: 62, H8: 63,
      A7: 48, B7: 49, C7: 50, D7: 51, E7: 52, F7: 53, G7: 54, H7: 55,
      A6: 40, B6: 41, C6: 42, D6: 43, E6: 44, F6: 45, G6: 46, H6: 47,
      A5: 32, B5: 33, C5: 34, D5: 35, E5: 36, F5: 37, G5: 38, H5: 39,
      A4: 24, B4: 25, C4: 26, D4: 27, E4: 28, F4: 29, G4: 30, H4: 31,
      A3: 16, B3: 17, C3: 18, D3: 19, E3: 20, F3: 21, G3: 22, H3: 23,
      A2:  8, B2:  9, C2: 10, D2: 11, E2: 12, F2: 13, G2: 14, H2: 15,
      A1:  0, B1:  1, C1:  2, D1:  3, E1:  4, F1:  5, G1:  6, H1:  7,
    };
    /* eslint-enable key-spacing */
    return indexMap[rankFile];
  }

  static indicesFor(board) {
    const someList = [];
    if (U64(board) != U64(0)) {
      do {
        const idx = BitHelper.bitScanFwd(board);
        someList.push(idx);
      } while ( board &= U64(board) - U64(1));
    }

    return someList;
  }
}

module.exports = {
  BitHelper: BitHelper,
  BoardHelper: BoardHelper,
  ViewHelper: ViewHelper,
  SquareHelper: SquareHelper,
  U64: U64,
  U64Comp: U64Comp,
  U64Neg: U64Neg,
};
