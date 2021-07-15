const BitHelper = require('./helpers.js').BitHelper;
const Board = require('./board.js').Board;

class PieceBoard {
  constructor(pieceBit) {
    this.bb = pieceBit || BigInt(0);
    this.mainBoard;
  }

  static for(fenChar, fenIndex) {
    let PieceClass;
    if ('rR'.includes(fenChar)) {
      PieceClass = RookBoard;
    }
    if ('pP'.includes(fenChar)) {
      PieceClass = PawnBoard;
    }

    return new PieceClass(BigInt(0), fenIndex);
  }

  // on(board) {
  //   this.mainBoard = board;
  //   return this
  // }
}

class RookBoard extends PieceBoard {
  constructor(bb, fenIndex) {
    super();
    this.bb = BitHelper.setBit(bb, fenIndex);
  }
}

// class PawnBoard extends PieceBoard {
//   constructor(bb, fenIndex, fenChar) {
//     super();
//     this.bb = BitHelper.setBit(bb, fenIndex);
//     this.fenChar = fenChar;
//   }

//   moves() {
//     if (!(this.bb & BigInt('0x8080808080808080'))) {
//       return Attacks.wSinglePush(this);
//     }
//   }
// }

// class Attacks {
//   static wSinglePush(pawnBoard) {
//     return Attacks.northOne(pawnBoard.bb) & ~pawnBoard.mainBoard;
//   }

//   static northOne(bb) {
//     return bb << BigInt(8);
//   }
// }

class PieceBoardList {
  constructor() {
    this.K = new PieceBoard()
    this.Q = new PieceBoard()
    this.R = new PieceBoard()
    this.B = new PieceBoard()
    this.N = new PieceBoard()
    this.P = new PieceBoard()
    this.k = new PieceBoard()
    this.q = new PieceBoard()
    this.r = new PieceBoard()
    this.b = new PieceBoard()
    this.n = new PieceBoard()
    this.p = new PieceBoard()
  }

  set(fenChar, pieceBoard) {
    switch (fenChar) {
      case 'k':
        this.k = pieceBoard;
        break;
      case 'q':
        this.q = pieceBoard;
        break;
      case 'r':
        this.r = pieceBoard;
        break;
      case 'b':
        this.b = pieceBoard;
        break;
      case 'n':
        this.n = pieceBoard;
        break;
      case 'p':
        this.p = pieceBoard;
        break;
      case 'K':
        this.K = pieceBoard;
        break;
      case 'Q':
        this.Q = pieceBoard;
        break;
      case 'R':
        this.R = pieceBoard;
        break;
      case 'B':
        this.B = pieceBoard;
        break;
      case 'N':
        this.N = pieceBoard;
        break;
      case 'P':
        this.P = pieceBoard;
        break;
    }
  }

  get(fenChar) {
    let pieceBoard;
    switch (fenChar) {
      case 'k':
        pieceBoard = this.k;
        break;
      case 'q':
        pieceBoard = this.q;
        break;
      case 'r':
        pieceBoard = this.r;
        break;
      case 'b':
        pieceBoard = this.b;
        break;
      case 'n':
        pieceBoard = this.n;
        break;
      case 'p':
        pieceBoard = this.p
        break;
      case 'K':
        pieceBoard = this.K;
        break;
      case 'Q':
        pieceBoard = this.Q;
        break;
      case 'R':
        pieceBoard = this.R;
        break;
      case 'B':
        pieceBoard = this.B;
        break;
      case 'N':
        pieceBoard = this.N;
        break;
      case 'P':
        pieceBoard = this.P;
        break;
    }
    return pieceBoard;
  }
}

// LERF-mapping constants
// const A_FILE = BigInt('0x0101010101010101');
// const H_FILE = BigInt('0x8080808080808080');
// const FIRST_RANK = BigInt('0x00000000000000FF');
// const EIGHTH_RANK = BigInt('0xFF00000000000000');
// const A1_H8_DIAGONAL = BigInt('0x8040201008040201');
// const H1_A8_DIAGONAL = BigInt('0x0102040810204080');
// const LIGHT_SQ = BigInt('0x55AA55AA55AA55AA');
// const DARK_SQ = BigInt('0xAA55AA55AA55AA55');

// class RookBoard {
//   constructor(fenIndex) {
//     this.fenIndex = fenIndex;
//   }
// }

// class Attack {
//   static northFill(bb) {
//     bb |= (bb << BigInt(8));
//     bb |= (bb << BigInt(16));
//     bb |= (bb << BigInt(32));
//     return bb;
//   }
// }

// Pawn.moves(idx)

module.exports = {
  PieceBoard: PieceBoard,
  PieceBoardList: PieceBoardList,
};
