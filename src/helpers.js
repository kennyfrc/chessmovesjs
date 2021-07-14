const Board = require('./board.js').Board

class BitHelper {
    static getBit(number, bitPosition) {
        return (number & (BigInt(1) << BigInt(bitPosition))) === BigInt(0) ? BigInt(0) : BigInt(1);
    }

    static setBit(number, bitPosition) {
        return number | BigInt(1) << BigInt(bitPosition);
    }

    static clearBit(number, bitPosition) {
        const mask = ~(BigInt(1) << BigInt(bitPosition));
        return number & mask;
    }

    static updateBit(number, bitPosition, bitValue) {
        const bitValueNormalized = BigInt(bitValue) ? BigInt(1) : BigInt(0);
        const clearMask = ~(BigInt(1) << BigInt(bitPosition));
        return (number & clearMask) | (bitValueNormalized << BigInt(bitPosition));
    }

    /*  Gets the complement of a BigInt

        Because of the two's complement format, doing ~bigIntValue will
        return a negative number. Doing fake shift right (>>> 0) on the 
        bigIntValue also doesn't work because BigInts are always signed.
        Thus, we have to split the BigInt into two, get their complements,
        then combine them into a BigInt.    */
    static bigIntComplement(board) {
        let top32bitNot = ( ~parseInt(board >> BigInt(32)) >>> 0 )
        let bottom32bitNot = ( ~parseInt(board & BigInt('0xffffffff', 16)) >>> 0 )

        return ((BigInt(top32bitNot) << BigInt(32)) | BigInt(bottom32bitNot))
    }

    static bigIntNegation(board) {
        return BitHelper.bigIntComplement(board) + BigInt(1)   
    }

    /*    counts trailing zeroes after subtracting one
          (board & -board) extracts the least significant bit
          - BigInt(1) then removes it  */
    static bitScanFwd(board) {
        return BitHelper.popCount( (board & BitHelper.bigIntNegation(board)) - BigInt(1) )

        // bitscan by modulo
        // let indices = [    64,  0,  1, 39,  2, 15, 40, 23,
        //                     3, 12, 16, 59, 41, 19, 24, 54,
        //                     4, -1, 13, 10, 17, 62, 60, 28,
        //                    42, 30, 20, 51, 25, 44, 55, 47,
        //                     5, 32, -1, 38, 14, 22, 11, 58,
        //                    18, 53, 63,  9, 61, 27, 29, 50,
        //                    43, 46, 31, 37, 21, 57, 52,  8,
        //                    26, 49, 45, 36, 56,  7, 48, 35,
        //                     6, 34, 33, -1 ]

        // return indices[(board & BitHelper.bigIntNegation(board)) % BigInt(67)]
    }

    // counting bits: http://www-graphics.stanford.edu/~seander/bithacks.html#CountBitsSetKernighan
    static popCount(number) {
       let count = 0;
       
       while (number > 0) {
           count++;
           number &= number - BigInt(1); // reset LS1B
       }

       return count;
    }
}

module.exports = {
    BitHelper: BitHelper,
}
