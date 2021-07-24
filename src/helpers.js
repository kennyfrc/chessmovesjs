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
      userView[Square.for('A8')] + userView[Square.for('B8')] +
      userView[Square.for('C8')] + userView[Square.for('D8')] +
      userView[Square.for('E8')] + userView[Square.for('F8')] +
      userView[Square.for('G8')] + userView[Square.for('H8')] + '\n' +
      userView[Square.for('A7')] + userView[Square.for('B7')] +
      userView[Square.for('C7')] + userView[Square.for('D7')] +
      userView[Square.for('E7')] + userView[Square.for('F7')] +
      userView[Square.for('G7')] + userView[Square.for('H7')] + '\n' +
      userView[Square.for('A6')] + userView[Square.for('B6')] +
      userView[Square.for('C6')] + userView[Square.for('D6')] +
      userView[Square.for('E6')] + userView[Square.for('F6')] +
      userView[Square.for('G6')] + userView[Square.for('H6')] + '\n' +
      userView[Square.for('A5')] + userView[Square.for('B5')] +
      userView[Square.for('C5')] + userView[Square.for('D5')] +
      userView[Square.for('E5')] + userView[Square.for('F5')] +
      userView[Square.for('G5')] + userView[Square.for('H5')] + '\n' +
      userView[Square.for('A4')] + userView[Square.for('B4')] +
      userView[Square.for('C4')] + userView[Square.for('D4')] +
      userView[Square.for('E4')] + userView[Square.for('F4')] +
      userView[Square.for('G4')] + userView[Square.for('H4')] + '\n' +
      userView[Square.for('A3')] + userView[Square.for('B3')] +
      userView[Square.for('C3')] + userView[Square.for('D3')] +
      userView[Square.for('E3')] + userView[Square.for('F3')] +
      userView[Square.for('G3')] + userView[Square.for('H3')] + '\n' +
      userView[Square.for('A2')] + userView[Square.for('B2')] +
      userView[Square.for('C2')] + userView[Square.for('D2')] +
      userView[Square.for('E2')] + userView[Square.for('F2')] +
      userView[Square.for('G2')] + userView[Square.for('H2')] + '\n' +
      userView[Square.for('A1')] + userView[Square.for('B1')] +
      userView[Square.for('C1')] + userView[Square.for('D1')] +
      userView[Square.for('E1')] + userView[Square.for('F1')] +
      userView[Square.for('G1')] + userView[Square.for('H1')] + '\n' +
      '=END');
  }
}

module.exports = {
  BitHelper: BitHelper,
  BoardHelper: BoardHelper,
  ViewHelper: ViewHelper,
};
