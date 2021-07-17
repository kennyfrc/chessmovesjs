const assert = require('assert');
const Board = require('../src/board.js').Board;
const BoardView = require('../src/boardview.js').BoardView;
const Square = require('../src/square.js').Square;
// const PieceBoard = require('../src/board.js').PieceBoard;
// const ViewHelper = require('../src/pieceboard.js').ViewHelper;

const board = new Board();
board.parseFenToBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); // eslint-disable-line


// Boards should return BigInts
describe('Board', function() {
  describe('#parseFenToBoard()', function() {
    it('returns a bitboard for a given fen', function() {
      assert.equal(board.bb, 18446462598732906495n);
      assert.equal(board.whiteBb, 65535n);
      assert.equal(board.blackBb, 18446462598732840960n);
    });
  });

  describe('#flipBoard()', function() {
    it('flips the board', function() {
      const flippedBoard = new Board();
      flippedBoard.parseFenToBoard('r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq '); // eslint-disable-line
      flippedBoard.flipBoard();

      assert.equal(flippedBoard.bb, 15992005286099480479n);
    });
  });

  describe('.displayCastleStatus', function() {
    it('returns the integer representing the castling status', function() {
      assert.equal(board.castleStatus, 15);
    });
  });
});

// PieceBoard should return BigInts
// Not sure if this is good as it relies on the parent class
describe('PieceBoard', function() {
  describe('.bb', function() {
    it('returns the correct bigint', function() {
      const boardWRooksAtCorner = new Board();
      boardWRooksAtCorner.parseFenToBoard('r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq ');
      assert.equal(boardWRooksAtCorner.pieceBoardList.r.bb, 9295429630892703744n);
      assert.equal(boardWRooksAtCorner.pieceBoardList.R.bb, 129n);
    });
  });
});

// PawnBoards, RookBoards, etc are children of PieceBoard
describe('PawnBoard', function() {
  describe('#moves()', function() {
    it('returns pseudo-legal pawn moves', function() {
      const boardWManyPawnAttacks = new Board();
      boardWManyPawnAttacks.parseFenToBoard('rnbqkbnr/1p2pp1p/8/p1pp2p1/1P2PP1P/8/P1PP2P1/RNBQKBNR w KQkq - 0 5');

      assert.equal(boardWManyPawnAttacks.pieceBoardList.P.moves(), 1096513552384n);
      assert.equal(boardWManyPawnAttacks.pieceBoardList.p.moves(), 196481852112896n);
    });
  });
});

// BoardView should return Strings
/* eslint-disable max-len */
describe('BoardView', function() {
  // in binary, you have to read from right to left
  // so you need to imagine going through the FEN in reverse order of rank and file
  // ...b8b7b6b5b4b3b2b1a8a7a6a5a4a3a2a1
  // with this function, this makes it easier to understand for regular people
  describe('#display()', function() {
    it('shows the all the pieces on the board', function() {
      assert.equal(new BoardView(board.pieceBoardList).display(), '11111111\n11111111\n00000000\n00000000\n00000000\n00000000\n11111111\n11111111');
    });

    it('correctly flips the board', function() {
      const flippedBoard = new Board();
      flippedBoard.parseFenToBoard('r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq ');
      flippedBoard.flipBoard();

      assert.equal(new BoardView(flippedBoard.pieceBoardList).display(), '11111001\n11110111\n00000100\n00101000\n00101000\n00100000\n11110111\n10111011');
    });
  });
});
/* eslint-enable max-len */

// Square should return integer indices
describe('Square', function() {
  describe('#indicesFor', function() {
    const rookBoard = board.pieceBoardList.r;
    const bKingBoard = board.pieceBoardList.k;
    const wKingBoard = board.pieceBoardList.K;

    it('shows indices of black rook', function() {
      assert.equal(Square.indicesFor(rookBoard)[0], 56);
      assert.equal(Square.indicesFor(rookBoard)[1], 63);
    });

    it('shows indices of black king', function() {
      assert.equal(Square.indicesFor(bKingBoard)[0], 60);
    });

    it('shows indices of white king', function() {
      assert.equal(Square.indicesFor(wKingBoard)[0], 4);
    });
  });
});

