class BitHelper {
  static getBit(board, bitPosition) {
    return (board & (BigInt(1) << BigInt(bitPosition))) === BigInt(0) ?
      BigInt(0) :
      BigInt(1);
  }

  static setBit(board, bitPosition) {
    return board | BigInt(1) << BigInt(bitPosition);
  }

  static clearBit(board, bitPosition) {
    const mask = ~(BigInt(1) << BigInt(bitPosition));
    return board & mask;
  }

  static updateBit(board, bitPosition, bitValue) {
    const bitValueNormalized = BigInt(bitValue) ? BigInt(1) : BigInt(0);
    const clearMask = ~(BigInt(1) << BigInt(bitPosition));
    return (board & clearMask) | (bitValueNormalized << BigInt(bitPosition));
  }

  /**
    * Gets the complement of a BigInt
    * Because of the two's complement format, doing ~bigIntValue will
    * return a negative number. Doing fake shift right (>>> 0) on the
    * bigIntValue also doesn't work because BigInts are always signed.
    * Thus, we have to split the BigInt into two, get their complements,
    * then combine them into a BigInt.
    */
  static bigIntComplement(board) {
    const top32bitNot = ( ~parseInt(board >> BigInt(32)) >>> 0 );
    const bottom32bitNot = ( ~parseInt(board & BigInt('0xffffffff', 16)) >>>
      0 );

    return ((BigInt(top32bitNot) << BigInt(32)) | BigInt(bottom32bitNot));
  }

  static bigIntNegation(board) {
    return BigInt.asUintN(64, ~(board) + BigInt(1));
  }

  /**
    * Counts trailing zeroes after subtracting one (board & -board) extracts
    * the least significant bit BigInt(1) then removes it
    */
  static bitScanFwd(board) {
    return BitHelper.popCount( (board & BitHelper.bigIntNegation(board)) -
      BigInt(1) );
  }

  // counting bits: http://www-graphics.stanford.edu/~seander/bithacks.html#CountBitsSetKernighan
  static popCount(board) {
    let count = 0;

    while (board > 0) {
      count++;
      board &= board - BigInt(1); // reset LS1B
    }

    return count;
  }
}

module.exports = {
  BitHelper: BitHelper,
};
