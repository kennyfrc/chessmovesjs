const BitHelper = require('./helpers.js').BitHelper;

class Board {
  constructor() {
    this.start_fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    this.bb = BigInt(0);
    this.pieceBoards = {'k': BigInt(0), 'q': BigInt(0), 'r': BigInt(0),
      'b': BigInt(0), 'n': BigInt(0), 'p': BigInt(0), 'K': BigInt(0),
      'Q': BigInt(0), 'R': BigInt(0), 'B': BigInt(0), 'N': BigInt(0),
      'P': BigInt(0),
    };

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
        if ('kqrbnpKQRBNP'.includes(fen[i])) {
          this.pieceBoards[fen[i]] = BitHelper.setBit(this.pieceBoards[fen[i]],
              fenIndex);
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

    Object.keys(this.pieceBoards).forEach((piece) => {
      this.bb |= this.pieceBoards[piece];
    });
  }

  // A8 = 56 thus, that's where we do the exclusive xor (where you flip)
  // you might need to flip the main boards first
  flipBoard() {
    for (let sq = 0; sq < 32; sq++) {
      for (let [piece, board] of Object.entries(this.pieceBoards)) {
        const bit = BitHelper.getBit(board, sq);
        const invertedBit = BitHelper.getBit(board, sq ^ 56);

        board = BitHelper.updateBit(board, sq, invertedBit);
        board = BitHelper.updateBit(board, sq ^ 56, bit);

        this.pieceBoards[piece] = board;
      }
    }
  }

  resetBoard() {
    this.pieceBoards = {'k': BigInt(0), 'q': BigInt(0), 'r': BigInt(0),
      'b': BigInt(0), 'n': BigInt(0), 'p': BigInt(0), 'K': BigInt(0),
      'Q': BigInt(0), 'R': BigInt(0), 'B': BigInt(0), 'N': BigInt(0),
      'P': BigInt(0)};
  }
}

// Least Significant File Mapping
// function squareIdx(rank_idx, file_idx) {
//   return ( 8 * rank_idx + file_idx );
// }

// LERF-mapping constants
// const A_FILE = BigInt('0x0101010101010101');
// const H_FILE = BigInt('0x8080808080808080');
// const FIRST_RANK = BigInt('0x00000000000000FF');
// const EIGHTH_RANK = BigInt('0xFF00000000000000');
// const A1_H8_DIAGONAL = BigInt('0x8040201008040201');
// const H1_A8_DIAGONAL = BigInt('0x0102040810204080');
// const LIGHT_SQ = BigInt('0x55AA55AA55AA55AA');
// const DARK_SQ = BigInt('0xAA55AA55AA55AA55');

// noWe         nort         noEa
//         +7    +8    +9
//             \  |  /
// west    -1 <-  0 -> +1    east
//             /  |  \
//         -9    -8    -7
// soWe         sout         soEa


module.exports = {
  Board: Board,
};
