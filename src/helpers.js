class BitHelper {
  static getBit(bb, bitPosition) {
    return (bb & (BigInt(1) << BigInt(bitPosition))) === BigInt(0) ?
      BigInt(0) : BigInt(1);
  }

  static setBit(bb, bitPosition) {
    return bb | BigInt(1) << BigInt(bitPosition);
  }

  static clearBit(bb, bitPosition) {
    const mask = ~(BigInt(1) << BigInt(bitPosition));
    return bb & mask;
  }

  static updateBit(bb, bitPosition, bitValue) {
    const bitValueNormalized = BigInt(bitValue) ? BigInt(1) : BigInt(0);
    const clearMask = ~(BigInt(1) << BigInt(bitPosition));
    return (bb & clearMask) | (bitValueNormalized << BigInt(bitPosition));
  }

  static bitFor(indices) {
    let parsedBit = BigInt(0);
    indices.forEach((index) => {
      parsedBit |= this.setBit(parsedBit, idx);
    });
    return parsedBit;
  }

  /**
    * Gets the complement of a BigInt
    * Because of the two's complement format, doing ~bigIntValue will
    * return a negative number. Doing fake shift right (>>> 0) on the
    * bigIntValue also doesn't work because BigInts are always signed.
    * Thus, we have to split the BigInt into two, get their complements,
    * then combine them into a BigInt.
    */
  static bigIntComplement(bb) {
    const top32bitNot = ( ~parseInt(bb >> BigInt(32)) >>> 0 );
    const bottom32bitNot = ( ~parseInt(bb & BigInt('0xffffffff', 16)) >>>
      0 );

    return ((BigInt(top32bitNot) << BigInt(32)) | BigInt(bottom32bitNot));
  }

  static bigIntNegation(bb) {
    return BigInt.asUintN(64, ~(bb) + BigInt(1));
  }

  static deBruijnMagicNum() {
    return BigInt('0x6c04f118e9966f6b');
  }

  /* eslint-disable */
  static deBruijnTable() {
    return [ 0, 48, -1, -1, 31, -1, 15, 51, -1, 63, 
             5, -1, -1, -1, 19, -1, 23, 28, -1, -1, 
            -1, 40, 36, 46, -1, 13, -1, -1, -1, 34,
            -1, 58, -1, 60, 2, 43, 55, -1, -1, -1, 
            50, 62, 4, -1, 18, 27, -1, 39, 45, -1, 
            -1, 33, 57, -1, 1, 54, -1, 49, -1, 17, 
            -1, -1, 32, -1, 53, -1, 16, -1, -1, 52, 
            -1, -1, -1, 64, 6, 7, 8, -1, 9, -1, -1,
            -1, 20, 10, -1, -1, 24, -1, 29, -1, -1,
            21, -1, 11, -1, -1, 41, -1, 25, 37, -1,
            47, -1, 30, 14, -1, -1, -1, -1, 22, -1,
            -1, 35, 12, -1, -1, -1, 59, 42, -1, -1,
            61, 3, 26, 38, 44, -1, 56 ];
  }
  /* eslint-enable */

  /**
    * De Bruijn Multiplication
    */
  static bitScanFwd(bb) {
    bb = -bb | bb;
    return this.deBruijnTable()[BigInt.asUintN(64, (BigInt.asUintN(64, (~(bb) *
      this.deBruijnMagicNum()))) >> BigInt(57))];
  }

  static bigScanRev(bb) {
    bb |= bb >> BigInt(1);
    bb |= bb >> BigInt(2);
    bb |= bb >> BigInt(4);
    bb |= bb >> BigInt(8);
    bb |= bb >> BigInt(16);
    bb |= bb >> BigInt(32);
    return this.deBruijnTable()[BigInt.asUintN(64, (BigInt.asUintN(64, (bb *
      this.deBruijnMagicNum()))) >> BigInt(57))];
  }

  /** counting bits:
   *  www-graphics.stanford.edu/~seander/bithacks.html#CountBitsSetKernighan
   **/
  static popCount(bb) {
    let count = 0;

    while (bb > 0) {
      count++;
      bb &= bb - BigInt(1); // reset LS1B
    }

    return count;
  }
}

// LERF-mapping constants
class BoardHelper {
  static aFile() {
    return BigInt('0x0101010101010101');
  }
  static hFile() {
    return BigInt('0x8080808080808080');
  }
  static firstRank() {
    return BigInt('0x00000000000000FF');
  }
  static secondRank() {
    return BigInt('0x000000000000FF00');
  }
  static thirdRank() {
    return BigInt('0x0000000000FF0000');
  }
  static fourthRank() {
    return BigInt('0x00000000FF000000');
  }
  static fifthRank() {
    return BigInt('0x000000FF00000000');
  }
  static sixthRank() {
    return BigInt('0x0000FF0000000000');
  }
  static seventhRank() {
    return BigInt('0x00FF000000000000');
  }
  static eighthRank() {
    return BigInt('0xFF00000000000000');
  }
  static a1H8Diagonal() {
    return BigInt('0x8040201008040201');
  }
  static h1A8Diagonal() {
    return BigInt('0x0102040810204080');
  }
  static lightSq() {
    return BigInt('0x55AA55AA55AA55AA');
  }
  static darkSq() {
    return BigInt('0xAA55AA55AA55AA55');
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
    if (board != BigInt(0)) {
      do {
        const idx = BitHelper.bitScanFwd(board);
        someList.push(idx);
      } while ( board &= board - BigInt(1));
    }
    return someList;
  }
}

module.exports = {
  BitHelper: BitHelper,
  BoardHelper: BoardHelper,
  ViewHelper: ViewHelper,
  SquareHelper: SquareHelper,
};
