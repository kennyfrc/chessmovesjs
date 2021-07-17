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
      parsedBit |= BitHelper.setBit(parsedBit, idx);
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

  /**
    * Counts trailing zeroes after subtracting one (bb & -bb) extracts
    * the least significant bit BigInt(1) then removes it
    */
  static bitScanFwd(bb) {
    return BitHelper.popCount( (bb & BitHelper.bigIntNegation(bb)) -
      BigInt(1) );
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

// Least Significant File Mapping
// function squareIdx(rank_idx, file_idx) {
//   return ( 8 * rank_idx + file_idx );
// }

// noWe         nort         noEa
//         +7    +8    +9
//             \  |  /
// west    -1 <-  0 -> +1    east
//             /  |  \
//         -9    -8    -7
// soWe         sout         soEa

module.exports = {
  BitHelper: BitHelper,
  BoardHelper: BoardHelper,
};
