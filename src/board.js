const BitHelper = require('./helpers.js').BitHelper;
const PieceBoard = require('./pieceboard.js').PieceBoard;
const PieceBoardList = require('./pieceboard.js').PieceBoardList;

class Board {
  constructor() {
    this.startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    this.bb = BigInt(0);
    this.whiteBb = BigInt(0);
    this.blackBb = BigInt(0);
    this.pieceBoardList = new PieceBoardList();
    this.whitePieceBoardList = new PieceBoardList();
    this.blackPieceBoardList = new PieceBoardList();

    this.castleStatus = 0;
    this.castleBit = {'K': 1, 'Q': 2, 'k': 4, 'q': 8};

    this.whiteToMove = 1;
    this.moveBit = {'w': 1, 'b': 0};
  }

  parseFenToBoard(fen) {
    this.resetBoard();

    let fenIndex = 56; // fens start at a8
    let ranksRead = 1;
    let whiteSpace = 0;

    for (let i = 0; i < fen.length; i++) {
      if (ranksRead == 8 && whiteSpace == 1) {
        if ('wb'.includes(fen[i])) {
          this.moveStatus = this.moveBit[fen[i]];
        }

        if ('KQkq'.includes(fen[i])) {
          this.castleStatus |= this.castleBit[fen[i]];
        }
      } else {
        if ('KQRBNP'.includes(fen[i])) {
          const pieceBit = BitHelper.setBit(this.whitePieceBoardList[fen[i]].bb,
              fenIndex);
          this.whitePieceBoardList[fen[i]] = PieceBoard.for(fen[i], pieceBit);
          this.whiteBb |= pieceBit;
          fenIndex += 1;
        }

        if ('kqrbnp'.includes(fen[i])) {
          const pieceBit = BitHelper.setBit(this.blackPieceBoardList[fen[i]].bb,
              fenIndex);
          this.blackPieceBoardList[fen[i]] = PieceBoard.for(fen[i], pieceBit);
          this.blackBb |= pieceBit;
          fenIndex += 1;
        }

        if ('12345678'.includes(fen[i])) {
          fenIndex += parseInt(fen[i]);
        }

        if (fen[i] == '/') {
          fenIndex = (56 - (ranksRead * 8));
          ranksRead += 1;
        }

        if (fen[i] == ' ') {
          whiteSpace += 1;
        }
      }
    }

    this.pieceBoardList = PieceBoardList.merge(this.whitePieceBoardList, this.blackPieceBoardList);

    Object.keys(this.pieceBoardList).forEach((pieceKey) => {
      this.pieceBoardList[pieceKey].whiteBbContext = this.whiteBb;
      this.pieceBoardList[pieceKey].blackBbContext = this.blackBb;
      this.pieceBoardList[pieceKey].mainBb = this.whiteBb | this.blackBb;
      this.bb |= this.pieceBoardList[pieceKey].bb;
    });
  }

  resetBoard() {
    this.pieceBoardList = new PieceBoardList();
  }

  /**
   * A8 = 56 thus, that's where we do the exclusive xor (where you flip)
   * you might need to flip the main boards first
   */
  flipBoard() {
    for (let sq = 0; sq < 32; sq++) {
      for (const [piece, pboard] of Object.entries(this.pieceBoardList)) {
        const bit = BitHelper.getBit(pboard.bb, sq);
        const invertedBit = BitHelper.getBit(pboard.bb, sq ^ 56);

        pboard.bb = BitHelper.updateBit(pboard.bb, sq, invertedBit);
        pboard.bb = BitHelper.updateBit(pboard.bb, sq ^ 56, bit);

        this.pieceBoardList[piece] = pboard;
      }
    }
  }
}

module.exports = {
  Board: Board,
};
