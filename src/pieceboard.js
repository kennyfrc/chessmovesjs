const BitHelper = require('./helpers.js').BitHelper;

class PieceBoard {
  constructor(bb) {
    this.bb = bb || BigInt(0);
    this.moves = BigInt(0);
  }

  setPos(fenIndex) {
    this.bb = BitHelper.setBit(new PieceBoard().bb, fenIndex);
  }

  pMoves() {
    return Attack.northFill(this.bb);
  }
}

// class Attack {
//   static northFill(bb) {
//     bb |= (bb << BigInt(8));
//     bb |= (bb << BigInt(16));
//     bb |= (bb << BigInt(32));
//     return bb;
//   }
// }

module.exports = {PieceBoard: PieceBoard};
