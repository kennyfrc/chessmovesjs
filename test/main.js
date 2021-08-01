const assert = require('assert');
const Board = require('../src/board.js').Board;
const BoardView = require('../src/boardview.js').BoardView;
const SquareHelper = require('../src/helpers.js').SquareHelper;
const U64 = require('../src/helpers.js').U64;
// const PieceBoard = require('../src/board.js').PieceBoard;
const ViewHelper = require('../src/helpers.js').ViewHelper;

const board = new Board();
board.parseFenToBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); // eslint-disable-line

Error.stackTraceLimit = 10;

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
      assert.equal(board.castleStatus, U64('0x8100000000000081'));
    });
  });

  describe('half-move counter', function() {
    it('returns the integer representing the castling status', function() {
      const boardW43hmc = new Board();
      const boardW3hmc = new Board();
      boardW43hmc.parseFenToBoard('r1bqk12/p2p1ppp/2n5/2b1p3/31P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 43 86')
      boardW3hmc.parseFenToBoard('r1bqk12/p2p1ppp/2n5/2b1p3/31P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 6')
      assert.equal(boardW43hmc.halfMoveClock, 43);
      assert.equal(boardW3hmc.halfMoveClock, 3);
    });
  });

  describe('full move number', function() {
    it('returns the integer representing the castling status', function() {
      const boardW83fmn = new Board();
      const boardW3fmn = new Board();
      boardW83fmn.parseFenToBoard('r1bqk12/p2p1ppp/2n5/2b1p3/31P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 21 83')
      boardW3fmn.parseFenToBoard('r1bqk12/p2p1ppp/2n5/2b1p3/31P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 3')
      assert.equal(boardW83fmn.fullMoveNo, 83);
      assert.equal(boardW3fmn.fullMoveNo, 3);
    });
  });

  describe('attacksTo() & attackedByPiece()', function() {
    const board = new Board();
    board.parseFenToBoard('1n2kb1r/1bpp1ppp/3qpn1P/r6R/pp4P1/P1N1PQ2/1PPP1PB1/R1B1K1N1 w Qk - 1 11');

    it('should return true if attacked', function() {
      assert.equal(board.attacksTo(SquareHelper.for('d5')), true);    
      assert.equal(board.attacksTo(SquareHelper.for('b8')), false);     
      assert.equal(board.attacksTo(SquareHelper.for('g1')), false);
    });

    // TODO: add attackedbypiece?
  });

  describe('inCheck()', function() {
    const board = new Board();
    const otherBoard = new Board();
    board.parseFenToBoard('3K4/8/8/8/8/2N5/8/3k4 b - - 0 1');
    otherBoard.parseFenToBoard('4k3/6N1/5b2/4R3/8/8/8/4K3 b - - 0 1');

    it('should return true if side to move is in check', function() {
      assert.equal(board.inCheck(), true);
      assert.equal(otherBoard.inCheck(), true);
    });

    it('should return valid moves when in check', fucntion() {
      
    });
  })

  // describe('king shouldnt be able to castle', function() {
  //   it('cant castle', function() {
  //     const board = new Board();
  //     board.parseFenToBoard('r2qkb1r/p1ppnppp/bpn1p3/8/5P2/4PNP1/PPPP2BP/RNBQK2R w KQkq - 3 6');
  //     // ViewHelper.display(board.movesFor('k'), 'blackkingmoves')

  //     assert.equal(true, false)
  //   })
  // })
});

// PieceBoard should return BigInts
// Not sure if this is good as it relies on the parent class
describe('PieceBoard', function() {
  describe('.bb', function() {
    it('returns the correct bigint', function() {
      const boardWRooksAtCorner = new Board();
      boardWRooksAtCorner.parseFenToBoard('r2qkb1r/p1ppnppp/bpn1p3/8/5P2/4PNP1/PPPP2BP/RNBQK2R w KQkq - 3 6');
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

      let whitePawnMoves = boardWManyPawnAttacks.moves('P');
      let blackPawnMoves = boardWManyPawnAttacks.moves('p');

      assert.equal(whitePawnMoves[0].from, 8);
      assert.equal(whitePawnMoves[0].to, 16);
      assert.equal(whitePawnMoves[1].from, 8);
      assert.equal(whitePawnMoves[1].to, 24);
      assert.equal(whitePawnMoves[2].from, 10);
      assert.equal(whitePawnMoves[2].to, 18);
      assert.equal(whitePawnMoves[3].from, 10);
      assert.equal(whitePawnMoves[3].to, 26);
      assert.equal(whitePawnMoves[4].from, 11);
      assert.equal(whitePawnMoves[4].to, 19);
      assert.equal(blackPawnMoves[0].from, 32);
      assert.equal(blackPawnMoves[0].to, 24);
      assert.equal(blackPawnMoves[1].from, 32);
      assert.equal(blackPawnMoves[1].to, 25);
      assert.equal(blackPawnMoves[2].from, 34);
      assert.equal(blackPawnMoves[2].to, 25);
      assert.equal(blackPawnMoves[3].from, 34);
      assert.equal(blackPawnMoves[3].to, 26);
      assert.equal(blackPawnMoves[4].from, 35);
      assert.equal(blackPawnMoves[4].to, 27);
    });

    it('shows threats', function() {
      const wBoardWAttacks = new Board();
      wBoardWAttacks.parseFenToBoard('r1bqkbnr/pppppppp/8/n7/4PP2/8/PPPP2PP/RNBQKBNR w KQkq - 1 3');
      let whitePawnMoves = wBoardWAttacks.moves('P')
      
      const bBoardWAttacks = new Board();
      bBoardWAttacks.parseFenToBoard('r1bqkb1r/pppp1ppp/5n2/4P3/3Q4/8/PPP2PPP/RNB1KB1R b KQkq - 0 6');
      let blackPawnMoves = bBoardWAttacks.moves('p')

      assert.equal(whitePawnMoves[3].threat, true);
      assert.equal(blackPawnMoves[4].threat, true);
    });

    it('shows checks', function() {
      const wBoardWChecks = new Board();
      wBoardWChecks.parseFenToBoard('r1bqkb1r/pp2pppp/4Pn2/n1pp1P2/8/8/PPPP2PP/RNBQKBNR w KQkq - 1 6');
      let whitePawnMoves = wBoardWChecks.moves('P')

      const bBoardWChecks = new Board();
      bBoardWChecks.parseFenToBoard('rnbq1bnr/pp2pkpp/8/3p4/5P2/2p2N2/PPPP2PP/RNBQKB1R b KQ - 1 6');

      let blackPawnMoves = bBoardWChecks.moves('p');


      // add white pawn moves
      assert.equal(blackPawnMoves[1].capture, true);
      assert.equal(blackPawnMoves[1].check, true);
    });

    it('knows en passant', function() {
      const boardWep = new Board();
      boardWep.parseFenToBoard('rnbq1bnr/p1p1kppp/8/1pPpp3/4P3/8/PP1PKPPP/RNBQ1BNR w - b6 0 5');
      let whitePawnMoves = boardWep.moves('P')
      
      const boardBlkWep = new Board();
      boardBlkWep.parseFenToBoard('rnbq1bnr/p1p1kppp/8/2Ppp3/Pp2P3/3P4/1P2KPPP/RNBQ1BNR b - a3 0 6');
      let blackPawnMoves = boardBlkWep.moves('p');

      assert.equal(whitePawnMoves[13].capture, true);
      assert.equal(whitePawnMoves[13].ep, true);
      assert.equal(blackPawnMoves[0].capture, true);
      assert.equal(blackPawnMoves[0].ep, true);
    });
  });
});

describe('KnightBoard', function() {
  describe('#moves()', function() {
    it('returns pseudo-legal moves', function() {
      const boardWManyKnightMoves = new Board();
      boardWManyKnightMoves.parseFenToBoard('rnbqkb1r/ppppp1pp/n7/5p2/3P1PN1/2P5/PP2P1PP/RNBQKB1R b KQkq - 1 6');

      let whiteKnightMoves = boardWManyKnightMoves.moves('N');
      let blackKnightMoves = boardWManyKnightMoves.moves('n');

      assert.equal(whiteKnightMoves[0].from, 1);
      assert.equal(whiteKnightMoves[0].to, 11);
      assert.equal(whiteKnightMoves[1].from, 1);
      assert.equal(whiteKnightMoves[1].to, 16);
      assert.equal(whiteKnightMoves[2].from, 30);
      assert.equal(whiteKnightMoves[2].to, 13);
      assert.equal(whiteKnightMoves[3].from, 30);
      assert.equal(whiteKnightMoves[3].to, 20);
      assert.equal(whiteKnightMoves[4].from, 30);
      assert.equal(whiteKnightMoves[4].to, 36);
      assert.equal(blackKnightMoves[0].from, 40);
      assert.equal(blackKnightMoves[0].to, 25);
      assert.equal(blackKnightMoves[1].from, 40);
      assert.equal(blackKnightMoves[1].to, 34);
      assert.equal(blackKnightMoves[2].from, 57);
      assert.equal(blackKnightMoves[2].to, 42);
    });

    it('shows threats', function() {
      const boardWManyKnightAttacks = new Board();
      boardWManyKnightAttacks.parseFenToBoard('1nb1kb1r/1ppp1ppp/2n3q1/pQ1rp3/P3P1P1/1PN2N1P/2PP1P2/R1B1KB1R w KQk - 5 10');
     
      let whiteKnightMoves = boardWManyKnightAttacks.moves('N');
      let blackKnightMoves = boardWManyKnightAttacks.moves('n'); 

      assert.equal(whiteKnightMoves[8].threat, true);
      assert.equal(blackKnightMoves[1].threat, true);

    });

    it('shows checks', function() {
      const boardWKnightChecks = new Board();
      boardWKnightChecks.parseFenToBoard('r1bqkb1r/pppp1ppp/5n2/3Np3/3nP3/5N2/PPPP1PPP/R1BQKB1R w KQkq - 6 5');

      let whiteKnightMoves = boardWKnightChecks.moves('N');
      let blackKnightMoves = boardWKnightChecks.moves('n'); 

      assert.equal(whiteKnightMoves[10].check, true);
      assert.equal(whiteKnightMoves[11].check, true);
      assert.equal(blackKnightMoves[0].check, true);
      assert.equal(blackKnightMoves[3].check, true);
    });
  });
});

describe('BishopBoard', function() {
  describe('#moves()', function() {
    const boardWManyBishopAttacks = new Board()
    boardWManyBishopAttacks.parseFenToBoard('rn2k2r/p1pq1ppp/1p1p1n2/2b1p3/2B1P1b1/BPNP4/P1PQ1PPP/R3K1NR w KQkq - 6 8');

    let whiteBishopMoves = boardWManyBishopAttacks.moves('B');
    let blackBishopMoves = boardWManyBishopAttacks.moves('b');

    it('returns pseudo-legal moves', function() {
      assert.equal(whiteBishopMoves[0].from, 16);
      assert.equal(whiteBishopMoves[0].to, 2);
      assert.equal(whiteBishopMoves[1].from, 16);
      assert.equal(whiteBishopMoves[1].to, 9);
      assert.equal(whiteBishopMoves[2].from, 16);
      assert.equal(whiteBishopMoves[2].to, 25);
      assert.equal(whiteBishopMoves[3].from, 16);
      assert.equal(whiteBishopMoves[3].to, 34);
      assert.equal(whiteBishopMoves[4].from, 26);
      assert.equal(whiteBishopMoves[4].to, 33);
      assert.equal(whiteBishopMoves[5].from, 26);
      assert.equal(whiteBishopMoves[5].to, 35);
      assert.equal(whiteBishopMoves[6].from, 26);
      assert.equal(whiteBishopMoves[6].to, 40);
      assert.equal(whiteBishopMoves[7].from, 26);
      assert.equal(whiteBishopMoves[7].to, 44);
      assert.equal(whiteBishopMoves[8].from, 26);
      assert.equal(whiteBishopMoves[8].to, 53);
      assert.equal(blackBishopMoves[0].from, 30);
      assert.equal(blackBishopMoves[0].to, 3);
      assert.equal(blackBishopMoves[1].from, 30);
      assert.equal(blackBishopMoves[1].to, 12);
      assert.equal(blackBishopMoves[2].from, 30);
      assert.equal(blackBishopMoves[2].to, 21);
      assert.equal(blackBishopMoves[3].from, 30);
      assert.equal(blackBishopMoves[3].to, 23);
      assert.equal(blackBishopMoves[4].from, 30);
      assert.equal(blackBishopMoves[4].to, 37);
      assert.equal(blackBishopMoves[5].from, 30);
      assert.equal(blackBishopMoves[5].to, 39);
      assert.equal(blackBishopMoves[6].from, 30);
      assert.equal(blackBishopMoves[6].to, 44);
      assert.equal(blackBishopMoves[7].from, 34);
      assert.equal(blackBishopMoves[7].to, 13);
      assert.equal(blackBishopMoves[8].from, 34);
      assert.equal(blackBishopMoves[8].to, 16);
      assert.equal(blackBishopMoves[9].from, 34);
      assert.equal(blackBishopMoves[9].to, 20);
      assert.equal(blackBishopMoves[10].from, 34);
      assert.equal(blackBishopMoves[10].to, 25);
      assert.equal(blackBishopMoves[11].from, 34);
      assert.equal(blackBishopMoves[11].to, 27);
    });

    it('shows threats', function() {
      assert.equal(whiteBishopMoves[4].threat, true);
      assert.equal(blackBishopMoves[9].threat, true);
    });

    it('shows checks', function() {
      assert.equal(whiteBishopMoves[8].check, true);
      assert.equal(blackBishopMoves[7].check, true)
    });
  });
});

describe('RookBoard', function() {
  describe('#moves()', function() {
    const boardWManyRookAttacks = new Board();
    boardWManyRookAttacks.parseFenToBoard('1nb1kb2/1pqpppp1/2pr1r1n/p6p/P3R2P/2R2P2/1PPPPKP1/1NBQ1BN1 b - - 5 10');

    let whiteRookMoves = boardWManyRookAttacks.moves('R');
    let blackRookMoves = boardWManyRookAttacks.moves('r');

    it('returns pseudo-legal moves', function() {
      assert.equal(whiteRookMoves[0].from, 18);
      assert.equal(whiteRookMoves[0].to, 16);
      assert.equal(whiteRookMoves[1].from, 18);
      assert.equal(whiteRookMoves[1].to, 17);
      assert.equal(whiteRookMoves[2].from, 18);
      assert.equal(whiteRookMoves[2].to, 19);
      assert.equal(whiteRookMoves[3].from, 18);
      assert.equal(whiteRookMoves[3].to, 20);
      assert.equal(whiteRookMoves[4].from, 18);
      assert.equal(whiteRookMoves[4].to, 26);
      assert.equal(whiteRookMoves[5].from, 18);
      assert.equal(whiteRookMoves[5].to, 34);
      assert.equal(whiteRookMoves[6].from, 18);
      assert.equal(whiteRookMoves[6].to, 42);
      assert.equal(whiteRookMoves[7].from, 28);
      assert.equal(whiteRookMoves[7].to, 20);
      assert.equal(whiteRookMoves[8].from, 28);
      assert.equal(whiteRookMoves[8].to, 25);
      assert.equal(whiteRookMoves[9].from, 28);
      assert.equal(whiteRookMoves[9].to, 26);
      assert.equal(whiteRookMoves[10].from, 28);
      assert.equal(whiteRookMoves[10].to, 27);
      assert.equal(whiteRookMoves[11].from, 28);
      assert.equal(whiteRookMoves[11].to, 29);
      assert.equal(whiteRookMoves[12].from, 28);
      assert.equal(whiteRookMoves[12].to, 30);
      assert.equal(whiteRookMoves[13].from, 28);
      assert.equal(whiteRookMoves[13].to, 36);
      assert.equal(whiteRookMoves[14].from, 28);
      assert.equal(whiteRookMoves[14].to, 44);
      assert.equal(whiteRookMoves[15].from, 28);
      assert.equal(whiteRookMoves[15].to, 52);
      assert.equal(blackRookMoves[0].from, 43);
      assert.equal(blackRookMoves[0].to, 11);
      assert.equal(blackRookMoves[1].from, 43);
      assert.equal(blackRookMoves[1].to, 19);
      assert.equal(blackRookMoves[2].from, 43);
      assert.equal(blackRookMoves[2].to, 27);
      assert.equal(blackRookMoves[3].from, 43);
      assert.equal(blackRookMoves[3].to, 35);
      assert.equal(blackRookMoves[4].from, 43);
      assert.equal(blackRookMoves[4].to, 44);
      assert.equal(blackRookMoves[5].from, 45);
      assert.equal(blackRookMoves[5].to, 21);
      assert.equal(blackRookMoves[6].from, 45);
      assert.equal(blackRookMoves[6].to, 29);
      assert.equal(blackRookMoves[7].from, 45);
      assert.equal(blackRookMoves[7].to, 37);
      assert.equal(blackRookMoves[8].from, 45);
      assert.equal(blackRookMoves[8].to, 44);
      assert.equal(blackRookMoves[9].from, 45);
      assert.equal(blackRookMoves[9].to, 46);
    });

    it('shows threats', function() {
      assert.equal(whiteRookMoves[6].threat, true);
      assert.equal(blackRookMoves[0].threat, true);
    });

    it('shows checks', function() {
      assert.equal(whiteRookMoves[15].check, true);
      assert.equal(blackRookMoves[5].check, true);
    });
  });
});

describe('QueenBoard', function() {
  describe('#moves()', function() {
    const boardWManyQueenAttacks = new Board();
    boardWManyQueenAttacks.parseFenToBoard('rnb1kbnr/pp1p1ppp/8/q1p1p2Q/4P3/5N2/PPPP1PPP/RNB1KB1R w KQkq - 2 4');

    let whiteQueenMoves = boardWManyQueenAttacks.moves('Q');
    let blackQueenMoves = boardWManyQueenAttacks.moves('q');

    it('returns pseudo-legal moves', function() {
      assert.equal(whiteQueenMoves[0].from, 39)
      assert.equal(whiteQueenMoves[0].to, 23)
      assert.equal(whiteQueenMoves[1].from, 39)
      assert.equal(whiteQueenMoves[1].to, 30)
      assert.equal(whiteQueenMoves[2].from, 39)
      assert.equal(whiteQueenMoves[2].to, 31)
      assert.equal(whiteQueenMoves[3].from, 39)
      assert.equal(whiteQueenMoves[3].to, 36)
      assert.equal(whiteQueenMoves[4].from, 39)
      assert.equal(whiteQueenMoves[4].to, 37)
      assert.equal(whiteQueenMoves[5].from, 39)
      assert.equal(whiteQueenMoves[5].to, 38)
      assert.equal(whiteQueenMoves[6].from, 39)
      assert.equal(whiteQueenMoves[6].to, 46)
      assert.equal(whiteQueenMoves[7].from, 39)
      assert.equal(whiteQueenMoves[7].to, 47)
      assert.equal(whiteQueenMoves[8].from, 39)
      assert.equal(whiteQueenMoves[8].to, 53)
      assert.equal(whiteQueenMoves[9].from, 39)
      assert.equal(whiteQueenMoves[9].to, 55)
      assert.equal(blackQueenMoves[0].from, 32)
      assert.equal(blackQueenMoves[0].to, 8)
      assert.equal(blackQueenMoves[1].from, 32)
      assert.equal(blackQueenMoves[1].to, 11)
      assert.equal(blackQueenMoves[2].from, 32)
      assert.equal(blackQueenMoves[2].to, 16)
      assert.equal(blackQueenMoves[3].from, 32)
      assert.equal(blackQueenMoves[3].to, 18)
      assert.equal(blackQueenMoves[4].from, 32)
      assert.equal(blackQueenMoves[4].to, 24)
      assert.equal(blackQueenMoves[5].from, 32)
      assert.equal(blackQueenMoves[5].to, 25)
      assert.equal(blackQueenMoves[6].from, 32)
      assert.equal(blackQueenMoves[6].to, 33)
      assert.equal(blackQueenMoves[7].from, 32)
      assert.equal(blackQueenMoves[7].to, 40)
      assert.equal(blackQueenMoves[8].from, 32)
      assert.equal(blackQueenMoves[8].to, 41)
      assert.equal(blackQueenMoves[9].from, 32)
      assert.equal(blackQueenMoves[9].to, 50)
      assert.equal(blackQueenMoves[10].from, 32)
      assert.equal(blackQueenMoves[10].to, 59)
    });

    it('shows checks', function() {
      assert.equal(whiteQueenMoves[8].check, true)
      assert.equal(blackQueenMoves[1].check, true)
    });
  });
});

describe('KingBoard', function() {
  describe('#moves()', function() {
    it('returns legal moves', function() {
      const boardWManyKingMoves = new Board();
      boardWManyKingMoves.parseFenToBoard('1r3r2/p1pp3p/Pp1k2p1/3p1p2/5P1P/2K1P3/P1PP3P/R1B4R b - - 0 19');

      let whiteKingMoves = boardWManyKingMoves.moves('K');
      let blackKingMoves = boardWManyKingMoves.moves('k');

      assert.equal(whiteKingMoves[0].from, 18)
      assert.equal(whiteKingMoves[0].to, 9)
      assert.equal(whiteKingMoves[1].from, 18)
      assert.equal(whiteKingMoves[1].to, 17)
      assert.equal(whiteKingMoves[2].from, 18)
      assert.equal(whiteKingMoves[2].to, 19)
      assert.equal(whiteKingMoves[3].from, 18)
      assert.equal(whiteKingMoves[3].to, 25)
      assert.equal(whiteKingMoves[4].from, 18)
      assert.equal(whiteKingMoves[4].to, 27)
      assert.equal(blackKingMoves[0].from, 43)
      assert.equal(blackKingMoves[0].to, 34)
      assert.equal(blackKingMoves[1].from, 43)
      assert.equal(blackKingMoves[1].to, 42)
      assert.equal(blackKingMoves[2].from, 43)
      assert.equal(blackKingMoves[2].to, 44)
      assert.equal(blackKingMoves[3].from, 43)
      assert.equal(blackKingMoves[3].to, 52)
    });

    it('can castle', function() {
      const boardWCastles = new Board();
      boardWCastles.parseFenToBoard('r3k2r/ppqbbppp/3p1n2/4p1B1/2B1P3/2N4P/PPPQ1PP1/R3K2R w KQkq - 1 11');

      let whiteKingMoves = boardWCastles.moves('K');
      let blackKingMoves = boardWCastles.moves('k');

      assert.equal(whiteKingMoves[0].castle, true)
      assert.equal(whiteKingMoves[3].castle, true)
      assert.equal(blackKingMoves[0].castle, true)
      assert.equal(blackKingMoves[3].castle, true)
    });

    it('cannot move to a square attacked by a rook', function() {
      const boardWSqAttackedByRook = new Board();
      boardWSqAttackedByRook.parseFenToBoard('4k3/8/8/5R2/8/8/8/4K3 b - - 0 1');

      let blackKingMoves = boardWSqAttackedByRook.moves('k');

      assert.equal(blackKingMoves.length, 3);
    });

    it('should not move to a blocked square', function() {
      const boardWSqAttackedByRook = new Board();
      boardWSqAttackedByRook.parseFenToBoard('8/4k3/8/8/4R3/8/8/4K3 b - - 0 1');

      let blackKingMoves = boardWSqAttackedByRook.moves('k');

      assert.equal(blackKingMoves.length, 6);
    })
  });
});


// describe('NullPieceBoard', function() {
//   describe('#moves()', function() {
//     it('returns pseudo-legal moves', function() {

//     });

//     it('shows threats', function() {

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

