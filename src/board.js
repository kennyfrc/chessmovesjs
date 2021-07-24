const BitHelper = require('./helpers.js').BitHelper;
const PieceBoard = require('./pieceboard.js').PieceBoard;
const PieceBoardList = require('./pieceboard.js').PieceBoardList;
const ViewHelper = require('./helpers.js').ViewHelper;

class Board {
  constructor() {
    this.bb = BigInt(0);
    this.whiteBb = BigInt(0);
    this.blackBb = BigInt(0);
    this.whiteKingBb = BigInt(0);
    this.blackKingBb = BigInt(0);
    this.whitePawnBb = BigInt(0);
    this.blackPawnBb = BigInt(0);
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

    this.setPieceBbs(this.pieceBoardList);
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

  setPieceBbs(pbList) {
    this.whiteKingBb |= pbList.K.bb;
    this.blackKingBb |= pbList.k.bb;
    this.whiteQueenBb |= pbList.Q.bb;
    this.blackQueenBb |= pbList.q.bb;
    this.whiteRookBb |= pbList.R.bb;
    this.blackRookBb |= pbList.r.bb;
    this.whiteBishopBb |= pbList.B.bb;
    this.blackBishopBb |= pbList.b.bb;
    this.whiteKnightBb |= pbList.N.bb;
    this.blackKnightBb |= pbList.n.bb;
    this.whitePawnBb |= pbList.P.bb;
    this.blackPawnBb |= pbList.p.bb;
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
