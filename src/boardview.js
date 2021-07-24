const Board = require('./board.js').Board;
const BitHelper = require('./helpers.js').BitHelper;
const SquareHelper = require('./helpers.js').SquareHelper;

class BoardView extends Board {
  constructor(pieceBoardList) {
    super();
    this.pieceBoardList = pieceBoardList;
    this.bb = this.parsePlToBb(pieceBoardList, this.bb);
    this.userView = this.parseToUserView();
  }

  parsePlToBb(pieceBoardList, bb) {
    if (pieceBoardList) {
      Object.keys(pieceBoardList).forEach((piece) => {
        bb |= pieceBoardList[piece].bb;
      });
    }
    return bb;
  }

  parseToUserView(bb) {
    const bbToView = bb || this.bb;
    const userView = [];
    for (let i = 0; i < 64; i++) {
      userView[i] = BitHelper.getBit(bbToView, i);
    }
    return userView;
  }

  display() {
    return '' +
      this.userView[SquareHelper.for('A8')] + this.userView[SquareHelper.for('B8')] +
      this.userView[SquareHelper.for('C8')] + this.userView[SquareHelper.for('D8')] +
      this.userView[SquareHelper.for('E8')] + this.userView[SquareHelper.for('F8')] +
      this.userView[SquareHelper.for('G8')] + this.userView[SquareHelper.for('H8')] + '\n' +
      this.userView[SquareHelper.for('A7')] + this.userView[SquareHelper.for('B7')] +
      this.userView[SquareHelper.for('C7')] + this.userView[SquareHelper.for('D7')] +
      this.userView[SquareHelper.for('E7')] + this.userView[SquareHelper.for('F7')] +
      this.userView[SquareHelper.for('G7')] + this.userView[SquareHelper.for('H7')] + '\n' +
      this.userView[SquareHelper.for('A6')] + this.userView[SquareHelper.for('B6')] +
      this.userView[SquareHelper.for('C6')] + this.userView[SquareHelper.for('D6')] +
      this.userView[SquareHelper.for('E6')] + this.userView[SquareHelper.for('F6')] +
      this.userView[SquareHelper.for('G6')] + this.userView[SquareHelper.for('H6')] + '\n' +
      this.userView[SquareHelper.for('A5')] + this.userView[SquareHelper.for('B5')] +
      this.userView[SquareHelper.for('C5')] + this.userView[SquareHelper.for('D5')] +
      this.userView[SquareHelper.for('E5')] + this.userView[SquareHelper.for('F5')] +
      this.userView[SquareHelper.for('G5')] + this.userView[SquareHelper.for('H5')] + '\n' +
      this.userView[SquareHelper.for('A4')] + this.userView[SquareHelper.for('B4')] +
      this.userView[SquareHelper.for('C4')] + this.userView[SquareHelper.for('D4')] +
      this.userView[SquareHelper.for('E4')] + this.userView[SquareHelper.for('F4')] +
      this.userView[SquareHelper.for('G4')] + this.userView[SquareHelper.for('H4')] + '\n' +
      this.userView[SquareHelper.for('A3')] + this.userView[SquareHelper.for('B3')] +
      this.userView[SquareHelper.for('C3')] + this.userView[SquareHelper.for('D3')] +
      this.userView[SquareHelper.for('E3')] + this.userView[SquareHelper.for('F3')] +
      this.userView[SquareHelper.for('G3')] + this.userView[SquareHelper.for('H3')] + '\n' +
      this.userView[SquareHelper.for('A2')] + this.userView[SquareHelper.for('B2')] +
      this.userView[SquareHelper.for('C2')] + this.userView[SquareHelper.for('D2')] +
      this.userView[SquareHelper.for('E2')] + this.userView[SquareHelper.for('F2')] +
      this.userView[SquareHelper.for('G2')] + this.userView[SquareHelper.for('H2')] + '\n' +
      this.userView[SquareHelper.for('A1')] + this.userView[SquareHelper.for('B1')] +
      this.userView[SquareHelper.for('C1')] + this.userView[SquareHelper.for('D1')] +
      this.userView[SquareHelper.for('E1')] + this.userView[SquareHelper.for('F1')] +
      this.userView[SquareHelper.for('G1')] + this.userView[SquareHelper.for('H1')];
  }
}

module.exports = {
  BoardView: BoardView,
};
