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

  // counting bits: 
  // www-graphics.stanford.edu/~seander/bithacks.html#CountBitsSetKernighan
  static popCount(bb) {
    let count = 0;

    while (bb > 0) {
      count++;
      bb &= bb - BigInt(1); // reset LS1B
    }

    return count;
  }
}

module.exports = {
  BitHelper: BitHelper,
};
