const BitHelper = require('./helpers.js').BitHelper;
const PieceBoard = require('./pieceboard.js').PieceBoard;
const PieceBoardList = require('./pieceboard.js').PieceBoardList;

class Board {
  constructor() {
    this.bb = BigInt(0);
    this.pieceBoardList = new PieceBoardList();

    this.castleStatus = 0;
    this.castleBit = {'K': 1, 'Q': 2, 'k': 4, 'q': 8};

    this.whiteToMove = 1;
    this.moveBit = {'w': 1, 'b': 0};

    this.whiteBb = BigInt(0);
    this.blackBb = BigInt(0);
    this.whiteKingBb = BigInt(0);
    this.blackKingBb = BigInt(0);
    this.whiteKnightBb = BigInt(0);
    this.blackKnightBb = BigInt(0);
    this.whiteBishopBb = BigInt(0);
    this.blackBishopBb = BigInt(0);
    this.whiteRookBb = BigInt(0);
    this.blackRookBb = BigInt(0);
    this.whiteQueenBb = BigInt(0);
    this.blackQueenBb = BigInt(0);
    this.whiteMinorBb = BigInt(0);
    this.blackMinorBb = BigInt(0);
    this.whiteMajorBb = BigInt(0);
    this.blackMajorBb = BigInt(0);
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
          const pieceBit = BitHelper.setBit(this.pieceBoardList[fen[i]].bb, fenIndex);
          this.pieceBoardList[fen[i]] = PieceBoard.for(fen[i], pieceBit);
          fenIndex += 1;
        }

        if ('kqrbnp'.includes(fen[i])) {
          const pieceBit = BitHelper.setBit(this.pieceBoardList[fen[i]].bb, fenIndex);
          this.pieceBoardList[fen[i]] = PieceBoard.for(fen[i], pieceBit);
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

    Object.keys(this.pieceBoardList).forEach((pieceKey) => {
      if ('KQRBNP'.includes(pieceKey)) {
        this.whiteBb |= this.pieceBoardList[pieceKey].bb;
      }
      if ('kqrbnp'.includes(pieceKey)) {
        this.blackBb |= this.pieceBoardList[pieceKey].bb;
      }
      if ('K'.includes(pieceKey)) {
        this.whiteKingBb |= this.pieceBoardList[pieceKey].bb;
      }
      if ('k'.includes(pieceKey)) {
        this.blackKingBb |= this.pieceBoardList[pieceKey].bb;
      }
      if ('N'.includes(pieceKey)) {
        this.whiteKnightBb |= this.pieceBoardList[pieceKey].bb;
      }
      if ('n'.includes(pieceKey)) {
        this.blackKnightBb |= this.pieceBoardList[pieceKey].bb;
      }
      if ('B'.includes(pieceKey)) {
        this.whiteBishopBb |= this.pieceBoardList[pieceKey].bb;
      }
      if ('b'.includes(pieceKey)) {
        this.blackBishopBb |= this.pieceBoardList[pieceKey].bb;
      }
      if ('R'.includes(pieceKey)) {
        this.whiteRookBb |= this.pieceBoardList[pieceKey].bb;
      }
      if ('r'.includes(pieceKey)) {
        this.blackRookBb |= this.pieceBoardList[pieceKey].bb;
      }
      if ('Q'.includes(pieceKey)) {
        this.whiteQueenBb |= this.pieceBoardList[pieceKey].bb;
      }
      if ('q'.includes(pieceKey)) {
        this.blackQueenBb |= this.pieceBoardList[pieceKey].bb;
      }
    });

    this.whiteMajorBb = this.whiteRookBb | this.whiteQueenBb;
    this.whiteMinorBb = this.whiteKnightBb | this.whiteBishopBb;
    this.blackMajorBb = this.blackRookBb | this.blackQueenBb;
    this.blackMinorBb = this.blackKnightBb | this.blackBishopBb;
    this.bb = this.whiteBb | this.blackBb;
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
