const assert = require('assert');
const Board = require('../src/board.js').Board;
const BoardView = require('../src/boardview.js').BoardView;
const SquareHelper = require('../src/helpers.js').SquareHelper;
// const PieceBoard = require('../src/board.js').PieceBoard;
// const ViewHelper = require('../src/pieceboard.js').ViewHelper;

const board = new Board();
board.parseFenToBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); // eslint-disable-line


// Boards should return BigInts
describe('Board', function() {
  describe('#parseFenToBoard()', function() {
    it('returns a bitboard for a given fen', function() {
      assert.equal(board.bb, 18446462598732906495n);
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
      boardWManyPawnAttacks.parseFenToBoard('rnbqkbnr/1p2pp1p/8/p1pp2p1/1P2PP1P/8/P1PP2P1/RNBQKBNR');
      const whitePawn = boardWManyPawnAttacks.pieceBoardList.P;
      const blackPawn = boardWManyPawnAttacks.pieceBoardList.p;

      whitePawn.on(boardWManyPawnAttacks);
      blackPawn.on(boardWManyPawnAttacks);

      assert.equal(whitePawn.moves()[0].from, 8);
      assert.equal(whitePawn.moves()[0].to, 16);
      assert.equal(whitePawn.moves()[1].from, 8);
      assert.equal(whitePawn.moves()[1].to, 24);
      assert.equal(whitePawn.moves()[2].from, 10);
      assert.equal(whitePawn.moves()[2].to, 18);
      assert.equal(whitePawn.moves()[3].from, 10);
      assert.equal(whitePawn.moves()[3].to, 26);
      assert.equal(whitePawn.moves()[4].from, 11);
      assert.equal(whitePawn.moves()[4].to, 19);
      assert.equal(blackPawn.moves()[0].from, 32);
      assert.equal(blackPawn.moves()[0].to, 24);
      assert.equal(blackPawn.moves()[1].from, 32);
      assert.equal(blackPawn.moves()[1].to, 25);
      assert.equal(blackPawn.moves()[2].from, 34);
      assert.equal(blackPawn.moves()[2].to, 25);
      assert.equal(blackPawn.moves()[3].from, 34);
      assert.equal(blackPawn.moves()[3].to, 26);
      assert.equal(blackPawn.moves()[4].from, 35);
      assert.equal(blackPawn.moves()[4].to, 27);
    });

    it('shows attacks', function() {
      const wBoardWAttacks = new Board();
      wBoardWAttacks.parseFenToBoard('r1bqkbnr/pppppppp/8/n7/4PP2/8/PPPP2PP/RNBQKBNR w KQkq - 1 3');
      const whitePawn = wBoardWAttacks.pieceBoardList.P;
      whitePawn.on(wBoardWAttacks);
      
      const bBoardWAttacks = new Board();
      bBoardWAttacks.parseFenToBoard('r1bqkb1r/pppp1ppp/5n2/4P3/3Q4/8/PPP2PPP/RNB1KB1R b KQkq - 0 6');
      const blackPawn = bBoardWAttacks.pieceBoardList.p;
      blackPawn.on(bBoardWAttacks);

      assert.equal(whitePawn.moves()[3].attack, true);
      assert.equal(blackPawn.moves()[4].attack, true);
    });

    it('shows checks', function() {
      const wBoardWChecks = new Board();
      wBoardWChecks.parseFenToBoard('r1bqkb1r/pp2pppp/4Pn2/n1pp1P2/8/8/PPPP2PP/RNBQKBNR w KQkq - 1 6');
      const whitePawn = wBoardWChecks.pieceBoardList.P;
      whitePawn.on(wBoardWChecks);
      const wPawnLen = whitePawn.moves().length;

      const bBoardWChecks = new Board();
      bBoardWChecks.parseFenToBoard('rnbq1bnr/pp2pkpp/8/3p4/5P2/2p2N2/PPPP2PP/RNBQKB1R b KQ - 1 6');
      const blackPawn = bBoardWChecks.pieceBoardList.p;
      blackPawn.on(bBoardWChecks);

      assert.equal(blackPawn.moves()[1].capture, true);
      assert.equal(blackPawn.moves()[1].check, true);
    })
  });
});

describe('KnightBoard', function() {
  describe('#moves()', function() {
    it('returns pseudo-legal moves', function() {
      const boardWManyKnightMoves = new Board();
      boardWManyKnightMoves.parseFenToBoard('rnbqkb1r/ppppp1pp/n7/5p2/3P1PN1/2P5/PP2P1PP/RNBQKB1R b KQkq - 1 6');
      const whiteKnight = boardWManyKnightMoves.pieceBoardList.N;
      const blackKnight = boardWManyKnightMoves.pieceBoardList.n;
      whiteKnight.on(boardWManyKnightMoves);
      blackKnight.on(boardWManyKnightMoves);

      assert.equal(whiteKnight.moves()[0].from, 1);
      assert.equal(whiteKnight.moves()[0].to, 11);
      assert.equal(whiteKnight.moves()[1].from, 1);
      assert.equal(whiteKnight.moves()[1].to, 16);
      assert.equal(whiteKnight.moves()[2].from, 30);
      assert.equal(whiteKnight.moves()[2].to, 13);
      assert.equal(whiteKnight.moves()[3].from, 30);
      assert.equal(whiteKnight.moves()[3].to, 20);
      assert.equal(whiteKnight.moves()[4].from, 30);
      assert.equal(whiteKnight.moves()[4].to, 36);
      assert.equal(blackKnight.moves()[0].from, 40);
      assert.equal(blackKnight.moves()[0].to, 25);
      assert.equal(blackKnight.moves()[1].from, 40);
      assert.equal(blackKnight.moves()[1].to, 34);
      assert.equal(blackKnight.moves()[2].from, 57);
      assert.equal(blackKnight.moves()[2].to, 42);
    });

    it('shows attacks', function() {
      const boardWManyKnightAttacks = new Board();
      boardWManyKnightAttacks.parseFenToBoard('1nb1kb1r/1ppp1ppp/2n3q1/pQ1rp3/P3P1P1/1PN2N1P/2PP1P2/R1B1KB1R w KQk - 5 10');
      const whiteKnight = boardWManyKnightAttacks.pieceBoardList.N;
      const blackKnight = boardWManyKnightAttacks.pieceBoardList.n;
      whiteKnight.on(boardWManyKnightAttacks);
      blackKnight.on(boardWManyKnightAttacks);

      assert.equal(whiteKnight.moves()[8].attack, true);
      assert.equal(blackKnight.moves()[1].attack, true);

    });

    it('shows checks', function() {
      const boardWKnightChecks = new Board();
      boardWKnightChecks.parseFenToBoard('r1bqkb1r/pppp1ppp/5n2/3Np3/3nP3/5N2/PPPP1PPP/R1BQKB1R w KQkq - 6 5');
      const whiteKnight = boardWKnightChecks.pieceBoardList.N;
      const blackKnight = boardWKnightChecks.pieceBoardList.n;
      whiteKnight.on(boardWKnightChecks);
      blackKnight.on(boardWKnightChecks);

      assert.equal(whiteKnight.moves()[10].check, true);
      assert.equal(whiteKnight.moves()[11].check, true);
      assert.equal(blackKnight.moves()[0].check, true);
      assert.equal(blackKnight.moves()[3].check, true);
    });
  });
});

describe('BishopBoard', function() {
  describe('#moves()', function() {
    const boardWManyBishopAttacks = new Board()
    boardWManyBishopAttacks.parseFenToBoard('rn2k2r/p1pq1ppp/1p1p1n2/2b1p3/2B1P1b1/BPNP4/P1PQ1PPP/R3K1NR w KQkq - 6 8');
    const whiteBishop = boardWManyBishopAttacks.pieceBoardList.B;
    const blackBishop = boardWManyBishopAttacks.pieceBoardList.b;
    whiteBishop.on(boardWManyBishopAttacks);
    blackBishop.on(boardWManyBishopAttacks);

    console.log(whiteBishop.moves())
    console.log(blackBishop.moves())

    it('returns pseudo-legal moves', function() {
      assert.equal(whiteBishop.moves()[0].from, 16);
      assert.equal(whiteBishop.moves()[0].to, 2);
      assert.equal(whiteBishop.moves()[1].from, 16);
      assert.equal(whiteBishop.moves()[1].to, 9);
      assert.equal(whiteBishop.moves()[2].from, 16);
      assert.equal(whiteBishop.moves()[2].to, 25);
      assert.equal(whiteBishop.moves()[3].from, 16);
      assert.equal(whiteBishop.moves()[3].to, 34);
      assert.equal(whiteBishop.moves()[4].from, 26);
      assert.equal(whiteBishop.moves()[4].to, 33);
      assert.equal(whiteBishop.moves()[5].from, 26);
      assert.equal(whiteBishop.moves()[5].to, 35);
      assert.equal(whiteBishop.moves()[6].from, 26);
      assert.equal(whiteBishop.moves()[6].to, 40);
      assert.equal(whiteBishop.moves()[7].from, 26);
      assert.equal(whiteBishop.moves()[7].to, 44);
      assert.equal(whiteBishop.moves()[8].from, 26);
      assert.equal(whiteBishop.moves()[8].to, 53);
      assert.equal(blackBishop.moves()[0].from, 30);
      assert.equal(blackBishop.moves()[0].to, 3);
      assert.equal(blackBishop.moves()[1].from, 30);
      assert.equal(blackBishop.moves()[1].to, 12);
      assert.equal(blackBishop.moves()[2].from, 30);
      assert.equal(blackBishop.moves()[2].to, 21);
      assert.equal(blackBishop.moves()[3].from, 30);
      assert.equal(blackBishop.moves()[3].to, 23);
      assert.equal(blackBishop.moves()[4].from, 30);
      assert.equal(blackBishop.moves()[4].to, 37);
      assert.equal(blackBishop.moves()[5].from, 30);
      assert.equal(blackBishop.moves()[5].to, 39);
      assert.equal(blackBishop.moves()[6].from, 30);
      assert.equal(blackBishop.moves()[6].to, 44);
      assert.equal(blackBishop.moves()[7].from, 34);
      assert.equal(blackBishop.moves()[7].to, 13);
      assert.equal(blackBishop.moves()[8].from, 34);
      assert.equal(blackBishop.moves()[8].to, 16);
      assert.equal(blackBishop.moves()[9].from, 34);
      assert.equal(blackBishop.moves()[9].to, 20);
      assert.equal(blackBishop.moves()[10].from, 34);
      assert.equal(blackBishop.moves()[10].to, 25);
      assert.equal(blackBishop.moves()[11].from, 34);
      assert.equal(blackBishop.moves()[11].to, 27);
    });

    it('shows attacks', function() {
      assert.equal(whiteBishop.moves()[4].attack, true);
      assert.equal(blackBishop.moves()[9].attack, true);
    });

    it('shows checks', function() {
      assert.equal(whiteBishop.moves()[8].check, true);
      assert.equal(blackBishop.moves()[7].check, true)
    });
  });
});


// describe('NullPieceBoard', function() {
//   describe('#moves()', function() {
//     it('returns pseudo-legal moves', function() {

//     });

//     it('shows attacks', function() {

//     });

//     it('shows checks', function() {

//     });
//   });
// });

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

// SquareHelper should return integer indices
describe('SquareHelper', function() {
  describe('#indicesFor', function() {
    const rookBoard = board.pieceBoardList.r;
    const bKingBoard = board.pieceBoardList.k;
    const wKingBoard = board.pieceBoardList.K;

    it('shows indices of black rook', function() {
      assert.equal(SquareHelper.indicesFor(rookBoard.bb)[0], 56);
      assert.equal(SquareHelper.indicesFor(rookBoard.bb)[1], 63);
    });

    it('shows indices of black king', function() {
      assert.equal(SquareHelper.indicesFor(bKingBoard.bb)[0], 60);
    });

    it('shows indices of white king', function() {
      assert.equal(SquareHelper.indicesFor(wKingBoard.bb)[0], 4);
    });
  });
});

