const BitHelper = require('./helpers.js').BitHelper;
const PieceBoard = require('./pieceboard.js').PieceBoard;
const PieceBoardList = require('./pieceboard.js').PieceBoardList;
const ViewHelper = require('./helpers.js').ViewHelper;
const U64 = require('./helpers.js').U64;

class Board {
  constructor() {
    this.bb = U64(0);
    this.whiteBb = U64(0);
    this.blackBb = U64(0);
    this.whiteKingBb = U64(0);
    this.blackKingBb = U64(0);
    this.whitePawnBb = U64(0);
    this.blackPawnBb = U64(0);
    this.whiteKnightBb = U64(0);
    this.blackKnightBb = U64(0);
    this.whiteBishopBb = U64(0);
    this.blackBishopBb = U64(0);
    this.whiteRookBb = U64(0);
    this.blackRookBb = U64(0);
    this.whiteQueenBb = U64(0);
    this.blackQueenBb = U64(0);
    this.whiteMinorBb = U64(0);
    this.blackMinorBb = U64(0);
    this.whiteMajorBb = U64(0);
    this.blackMajorBb = U64(0);

    this.pieceBoardList = new PieceBoardList();

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
      if (this.#finishedReadingBoard(ranksRead, whiteSpace)) {
        if (this.#fenIsSidetoMove(fen[i])) {
          this.moveStatus = this.moveBit[fen[i]];
        }

        if (this.#fenIsCastlingSymbol(fen[i])) {
          this.castleStatus |= this.castleBit[fen[i]];
        }
      } else {
        if (this.#fenIsWhitePiece(fen[i])) {
          const pieceBit = BitHelper.setBit(this.pieceBoardList[fen[i]].bb, fenIndex);
          this.pieceBoardList[fen[i]] = PieceBoard.for(fen[i], pieceBit);
          fenIndex += 1;
        }

        if (this.#fenIsBlackPiece(fen[i])) {
          const pieceBit = BitHelper.setBit(this.pieceBoardList[fen[i]].bb, fenIndex);
          this.pieceBoardList[fen[i]] = PieceBoard.for(fen[i], pieceBit);
          fenIndex += 1;
        }

        if (this.#fenIsEmptySquare(fen[i])) {
          fenIndex += parseInt(fen[i]);
        }

        if (this.#fenIsNewRank(fen[i])) {
          fenIndex = (56 - (ranksRead * 8));
          ranksRead += 1;
        }

        if (this.#fenIsSpace(fen[i])) {
          whiteSpace += 1;
        }
      }
    }

    this.setPieceBbs();
    this.setPieceSetBbs();
    this.setBoardBb();
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

  setPieceBbs() {
    this.whiteKingBb |= this.pieceBoardList.K.bb;
    this.blackKingBb |= this.pieceBoardList.k.bb;
    this.whiteQueenBb |= this.pieceBoardList.Q.bb;
    this.blackQueenBb |= this.pieceBoardList.q.bb;
    this.whiteRookBb |= this.pieceBoardList.R.bb;
    this.blackRookBb |= this.pieceBoardList.r.bb;
    this.whiteBishopBb |= this.pieceBoardList.B.bb;
    this.blackBishopBb |= this.pieceBoardList.b.bb;
    this.whiteKnightBb |= this.pieceBoardList.N.bb;
    this.blackKnightBb |= this.pieceBoardList.n.bb;
    this.whitePawnBb |= this.pieceBoardList.P.bb;
    this.blackPawnBb |= this.pieceBoardList.p.bb;
  }

  setPieceSetBbs() {
    this.whiteMajorBb = this.whiteRookBb | this.whiteQueenBb;
    this.whiteMinorBb = this.whiteKnightBb | this.whiteBishopBb;
    this.whiteBb = this.whiteMajorBb | this.whiteMinorBb | this.whitePawnBb |
      this.whiteKingBb;
    this.blackMajorBb = this.blackRookBb | this.blackQueenBb;
    this.blackMinorBb = this.blackKnightBb | this.blackBishopBb;
    this.blackBb = this.blackMajorBb | this.blackMinorBb | this.blackPawnBb |
      this.blackKingBb;
  }

  setBoardBb() {
    this.bb = this.whiteBb | this.blackBb;
  }

  #finishedReadingBoard(ranksRead, whiteSpace) {
    return ranksRead == 8 && whiteSpace == 1;
  }

  #fenIsSidetoMove(fenChar) {
    return 'wb'.includes(fenChar);
  }

  #fenIsCastlingSymbol(fenChar) {
    return 'KQkq'.includes(fenChar);
  }

  #fenIsWhitePiece(fenChar) {
    return 'KQRBNP'.includes(fenChar);
  }

  #fenIsBlackPiece(fenChar) {
    return 'kqrbnp'.includes(fenChar);
  }

  #fenIsEmptySquare(fenChar) {
    return '12345678'.includes(fenChar);
  }

  #fenIsNewRank(fenChar) {
    return fenChar == '/';
  }

  #fenIsSpace(fenChar) {
    return fenChar == ' ';
  }
}

module.exports = {
  Board: Board,
};
