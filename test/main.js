const assert = require('assert')
const Board = require('../src/board.js').Board
const BoardView = require('../src/boardview.js').BoardView
const SquareHelper = require('../src/helpers.js').SquareHelper
// const PieceBoard = require('../src/board.js').PieceBoard
const ViewHelper = require('../src/helpers.js').ViewHelper
const PerftHelper = require('../src/helpers.js').PerftHelper
const Engine = require('../src/engine.js').Engine
// const PieceBoardList = require('../src/pieceboard.js').PieceBoardList

Error.stackTraceLimit = 10

// Boards should return BigInts
describe('Board', function () {
  describe('#parseFenToBoard()', function () {
    it('returns a bitboard for a given fen', function () {
      const board = new Board()
      board.parseFenToBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')

      assert.equal(board.bb, 18446462598732906495n)
    })
  })

  describe('#flipBoard()', function () {
    it('flips the board', function () {
      const flippedBoard = new Board()
      flippedBoard.parseFenToBoard('r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq ')
      flippedBoard.flipBoard()

      assert.equal(flippedBoard.bb, 15992005286099480479n)
    })
  })

  describe('.displayCastleStatus', function () {
    it('returns the integer representing the castling status', function () {
      const board = new Board()
      board.parseFenToBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')

      assert.equal(board.castleStatus, BigInt('0x8100000000000081'))
    })
  })

  describe('half-move counter', function () {
    it('returns the integer representing the castling status', function () {
      const boardW43hmc = new Board()
      const boardW3hmc = new Board()
      boardW43hmc.parseFenToBoard('r1bqk12/p2p1ppp/2n5/2b1p3/31P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 43 86')
      boardW3hmc.parseFenToBoard('r1bqk12/p2p1ppp/2n5/2b1p3/31P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 6')
      assert.equal(boardW43hmc.halfMoveClock, 43)
      assert.equal(boardW3hmc.halfMoveClock, 3)
    })
  })

  describe('full move number', function () {
    it('returns the integer representing the castling status', function () {
      const boardW83fmn = new Board()
      const boardW3fmn = new Board()
      boardW83fmn.parseFenToBoard('r1bqk12/p2p1ppp/2n5/2b1p3/31P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 21 83')
      boardW3fmn.parseFenToBoard('r1bqk12/p2p1ppp/2n5/2b1p3/31P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 3')
      assert.equal(boardW83fmn.fullMoveNo, 83)
      assert.equal(boardW3fmn.fullMoveNo, 3)
    })
  })

  describe('isSqAttacked()', function () {
    const board = new Board()
    board.parseFenToBoard('1n2kb1r/1bpp1ppp/3qpn1P/r6R/pp4P1/P1N1PQ2/1PPP1PB1/R1B1K1N1 w Qk - 1 11')

    it('should return true if attacked', function () {
      assert.equal(board.isSqAttacked(SquareHelper.for('d5')), true)
      assert.equal(board.isSqAttacked(SquareHelper.for('b8')), false)
      assert.equal(board.isSqAttacked(SquareHelper.for('g1')), false)
    })

    // TODO: add attackedbypiece?
  })

  describe('inCheck()', function () {
    it('should return true if side to move is in check', function () {
      const board = new Board()
      const otherBoard = new Board()
      board.parseFenToBoard('3K4/8/8/8/8/2N5/8/3k4 b - - 0 1')
      otherBoard.parseFenToBoard('4k3/6N1/5b2/4R3/8/8/8/4K3 b - - 0 1')

      assert.equal(board.isInCheck(), true)
      assert.equal(otherBoard.isInCheck(), true)
    })

    it('should also return >0 checkerCount', function () {
      const board = new Board()
      const otherBoard = new Board()
      board.parseFenToBoard('3K4/8/8/8/8/2N5/8/3k4 b - - 0 1')
      otherBoard.parseFenToBoard('4k3/6N1/5b2/4R3/8/8/8/4K3 b - - 0 1')

      assert.equal(board.checkerCount, 1)
      assert.equal(otherBoard.checkerCount, 2)
    })
  })

  describe('legalMoves()', function () {
    it('should show moves that capture the checker', function () {
      const board = new Board()
      board.parseFenToBoard('3K4/8/8/8/8/2b5/1N6/3k4 b - - 0 1')

      assert.equal(board.legalMoves()[0].from, 3)
      assert.equal(board.legalMoves()[0].to, 2)
      assert.equal(board.legalMoves()[1].from, 3)
      assert.equal(board.legalMoves()[1].to, 4)
      assert.equal(board.legalMoves()[2].from, 3)
      assert.equal(board.legalMoves()[2].to, 10)
      assert.equal(board.legalMoves()[3].from, 3)
      assert.equal(board.legalMoves()[3].to, 11)
      assert.equal(board.legalMoves()[4].from, 3)
      assert.equal(board.legalMoves()[4].to, 12)
      assert.equal(board.legalMoves()[5].from, 18)
      assert.equal(board.legalMoves()[5].to, 9)
    })

    it('should show moves that can block the checker', function () {
      const board = new Board()
      board.parseFenToBoard('3K4/8/8/3Q4/8/2b5/8/3k4 b - - 0 1')

      assert.equal(board.legalMoves()[0].from, 3)
      assert.equal(board.legalMoves()[0].to, 2)
      assert.equal(board.legalMoves()[1].from, 3)
      assert.equal(board.legalMoves()[1].to, 4)
      assert.equal(board.legalMoves()[2].from, 3)
      assert.equal(board.legalMoves()[2].to, 10)
      assert.equal(board.legalMoves()[3].from, 3)
      assert.equal(board.legalMoves()[3].to, 12)
      assert.equal(board.legalMoves()[4].from, 18)
      assert.equal(board.legalMoves()[4].to, 11)
      assert.equal(board.legalMoves()[5].from, 18)
      assert.equal(board.legalMoves()[5].to, 27)
    })

    it('when in double check, can only do king moves', function () {
      const board = new Board()
      board.parseFenToBoard('4k3/6N1/5b2/4R3/8/8/8/4K3 b - - 0 1')

      assert.equal(board.legalMoves()[0].from, 60)
      assert.equal(board.legalMoves()[0].to, 51)
      assert.equal(board.legalMoves()[1].from, 60)
      assert.equal(board.legalMoves()[1].to, 53)
      assert.equal(board.legalMoves()[2].from, 60)
      assert.equal(board.legalMoves()[2].to, 59)
      assert.equal(board.legalMoves()[3].from, 60)
      assert.equal(board.legalMoves()[3].to, 61)
    })

    it('knows how to handle en passant check evasions', function () {
      const board = new Board()
      board.parseFenToBoard('8/8/8/2k5/3Pp3/8/8/4K3 b - d3 0 1')

      assert.equal(board.legalMoves()[0].from, 34)
      assert.equal(board.legalMoves()[0].to, 25)
      assert.equal(board.legalMoves()[1].from, 34)
      assert.equal(board.legalMoves()[1].to, 26)
      assert.equal(board.legalMoves()[2].from, 34)
      assert.equal(board.legalMoves()[2].to, 27)
      assert.equal(board.legalMoves()[3].from, 34)
      assert.equal(board.legalMoves()[3].to, 33)
      assert.equal(board.legalMoves()[4].from, 34)
      assert.equal(board.legalMoves()[4].to, 35)
      assert.equal(board.legalMoves()[5].from, 34)
      assert.equal(board.legalMoves()[5].to, 41)
      assert.equal(board.legalMoves()[6].from, 34)
      assert.equal(board.legalMoves()[6].to, 42)
      assert.equal(board.legalMoves()[7].from, 34)
      assert.equal(board.legalMoves()[7].to, 43)
      assert.equal(board.legalMoves()[8].from, 28)
      assert.equal(board.legalMoves()[8].to, 19)
    })

    it('knows that king cannot capture a defended piece', function () {
      const board = new Board()
      board.parseFenToBoard('1kr5/Bb3R2/4p3/4Pn1p/R7/2P3p1/1KP4r/8 b - - 1 1')

      assert.equal(board.legalMoves().length, 1)
    })
  })

  describe('#xrayBb()', function () {
    it('shows that king is xrayed', function () {
      const board = new Board()
      board.parseFenToBoard('rn2kbnr/ppp2ppp/3p4/4p3/2B1P1bq/P4N2/1PPP1PPP/RNBQK2R w KQkq - 1 5')

      assert.equal(board.isOurKingXrayed(), true)
    })

    it('aware of various moves to block', function () {
      const board = new Board()
      board.parseFenToBoard('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1')

      assert.equal(board.legalMoves().length, 6)
    })
  })

  describe('#pins()', function () {
    it('should limit moves when pinned', function () {
      const filePin = new Board()
      const filePinPawn = new Board()
      const rankPin = new Board()
      const rankPinPawn = new Board()
      // const diagPin = new Board();
      // const diagPinPawn = new Board();
      // const antiDiagPin = new Board();
      // const antiDiagPinPawn = new Board();

      filePin.parseFenToBoard('4k3/8/4r3/8/8/4Q3/8/2K5 b - - 0 1')
      const filePinMoves = filePin.legalMoves()
      filePinPawn.parseFenToBoard('4k3/4p3/3P4/8/4Q3/8/8/2K5 b - - 0 1')
      const filePinPawnMoves = filePinPawn.legalMoves()
      rankPin.parseFenToBoard('R2rk3/8/8/8/8/8/8/2K5 b - - 0 1')
      const rankPinMoves = rankPin.legalMoves()
      rankPinPawn.parseFenToBoard('8/1R2pk2/8/8/8/8/8/2K5 b - - 0 1')
      const rankPinPawnMoves = rankPinPawn.legalMoves()
      // diagPin.parseFenToBoard('4k3/3r4/8/1B6/8/8/8/2K5 b - - 0 1');
      // diagPinMoves = diagPin.legalMoves()
      // diagPinPawn.parseFenToBoard('4k3/3p4/8/1B6/8/8/8/2K5 b - - 0 1');
      // antiDiagPin.parseFenToBoard('4k3/5r2/8/7B/8/8/8/2K5 b - - 0 1');
      // antiDiagPinPawn.parseFenToBoard('8/2k5/3p4/8/5Q2/8/8/2K5 b - - 0 1');

      // console.log(diagPinMoves)

      assert.equal(filePinMoves[0].from, 60)
      assert.equal(filePinMoves[0].to, 51)
      assert.equal(filePinMoves[1].from, 60)
      assert.equal(filePinMoves[1].to, 52)
      assert.equal(filePinMoves[2].from, 60)
      assert.equal(filePinMoves[2].to, 53)
      assert.equal(filePinMoves[3].from, 60)
      assert.equal(filePinMoves[3].to, 59)
      assert.equal(filePinMoves[4].from, 60)
      assert.equal(filePinMoves[4].to, 61)
      assert.equal(filePinMoves[5].from, 44)
      assert.equal(filePinMoves[5].to, 20)
      assert.equal(filePinMoves[6].from, 44)
      assert.equal(filePinMoves[6].to, 28)
      assert.equal(filePinMoves[7].from, 44)
      assert.equal(filePinMoves[7].to, 36)
      assert.equal(filePinMoves[8].from, 44)
      assert.equal(filePinMoves[8].to, 52)

      assert.equal(filePinPawnMoves[0].from, 60)
      assert.equal(filePinPawnMoves[0].to, 51)
      assert.equal(filePinPawnMoves[1].from, 60)
      assert.equal(filePinPawnMoves[1].to, 53)
      assert.equal(filePinPawnMoves[2].from, 60)
      assert.equal(filePinPawnMoves[2].to, 59)
      assert.equal(filePinPawnMoves[3].from, 60)
      assert.equal(filePinPawnMoves[3].to, 61)
      assert.equal(filePinPawnMoves[4].from, 52)
      assert.equal(filePinPawnMoves[4].to, 36)
      assert.equal(filePinPawnMoves[5].from, 52)
      assert.equal(filePinPawnMoves[5].to, 44)

      assert.equal(rankPinMoves[0].from, 60)
      assert.equal(rankPinMoves[0].to, 51)
      assert.equal(rankPinMoves[1].from, 60)
      assert.equal(rankPinMoves[1].to, 52)
      assert.equal(rankPinMoves[2].from, 60)
      assert.equal(rankPinMoves[2].to, 53)
      assert.equal(rankPinMoves[3].from, 60)
      assert.equal(rankPinMoves[3].to, 61)
      assert.equal(rankPinMoves[4].from, 59)
      assert.equal(rankPinMoves[4].to, 56)
      assert.equal(rankPinMoves[5].from, 59)
      assert.equal(rankPinMoves[5].to, 57)
      assert.equal(rankPinMoves[6].from, 59)
      assert.equal(rankPinMoves[6].to, 58)

      assert.equal(rankPinPawnMoves[0].from, 53)
      assert.equal(rankPinPawnMoves[0].to, 44)
      assert.equal(rankPinPawnMoves[1].from, 53)
      assert.equal(rankPinPawnMoves[1].to, 45)
      assert.equal(rankPinPawnMoves[2].from, 53)
      assert.equal(rankPinPawnMoves[2].to, 46)
      assert.equal(rankPinPawnMoves[3].from, 53)
      assert.equal(rankPinPawnMoves[3].to, 54)
      assert.equal(rankPinPawnMoves[4].from, 53)
      assert.equal(rankPinPawnMoves[4].to, 60)
      assert.equal(rankPinPawnMoves[5].from, 53)
      assert.equal(rankPinPawnMoves[5].to, 61)
      assert.equal(rankPinPawnMoves[6].from, 53)
      assert.equal(rankPinPawnMoves[6].to, 62)
    })
  })
})

// PieceBoard should return BigInts
// Not sure if this is good as it relies on the parent class
describe('PieceBoard', function () {
  describe('.bb', function () {
    it('returns the correct bigint', function () {
      const boardWRooksAtCorner = new Board()
      boardWRooksAtCorner.parseFenToBoard('r2qkb1r/p1ppnppp/bpn1p3/8/5P2/4PNP1/PPPP2BP/RNBQK2R w KQkq - 3 6')
      assert.equal(boardWRooksAtCorner.pieceBoardList.r.bb, 9295429630892703744n)
      assert.equal(boardWRooksAtCorner.pieceBoardList.R.bb, 129n)
    })
  })
})

// PawnBoards, RookBoards, etc are children of PieceBoard
describe('PawnBoard', function () {
  describe('#moves()', function () {
    it('returns legal pawn moves', function () {
      const boardWManyPawnAttacks = new Board()
      boardWManyPawnAttacks.parseFenToBoard('rnbqkbnr/1p2pp1p/8/p1pp2p1/1P2PP1P/8/P1PP2P1/RNBQKBNR')

      const whitePawnMoves = boardWManyPawnAttacks.moves('P')
      const blackPawnMoves = boardWManyPawnAttacks.moves('p')

      assert.equal(whitePawnMoves[0].from, 8)
      assert.equal(whitePawnMoves[0].to, 16)
      assert.equal(whitePawnMoves[1].from, 8)
      assert.equal(whitePawnMoves[1].to, 24)
      assert.equal(whitePawnMoves[2].from, 10)
      assert.equal(whitePawnMoves[2].to, 18)
      assert.equal(whitePawnMoves[3].from, 10)
      assert.equal(whitePawnMoves[3].to, 26)
      assert.equal(whitePawnMoves[4].from, 11)
      assert.equal(whitePawnMoves[4].to, 19)
      assert.equal(blackPawnMoves[0].from, 32)
      assert.equal(blackPawnMoves[0].to, 24)
      assert.equal(blackPawnMoves[1].from, 32)
      assert.equal(blackPawnMoves[1].to, 25)
      assert.equal(blackPawnMoves[2].from, 34)
      assert.equal(blackPawnMoves[2].to, 25)
      assert.equal(blackPawnMoves[3].from, 34)
      assert.equal(blackPawnMoves[3].to, 26)
      assert.equal(blackPawnMoves[4].from, 35)
      assert.equal(blackPawnMoves[4].to, 27)
    })

    it('shows threats', function () {
      const wBoardWAttacks = new Board()
      wBoardWAttacks.parseFenToBoard('r1bqkbnr/pppppppp/8/n7/4PP2/8/PPPP2PP/RNBQKBNR w KQkq - 1 3')
      const whitePawnMoves = wBoardWAttacks.moves('P')

      const bBoardWAttacks = new Board()
      bBoardWAttacks.parseFenToBoard('r1bqkb1r/pppp1ppp/5n2/4P3/3Q4/8/PPP2PPP/RNB1KB1R b KQkq - 0 6')
      const blackPawnMoves = bBoardWAttacks.moves('p')

      assert.equal(whitePawnMoves[3].threat, true)
      assert.equal(blackPawnMoves[4].threat, true)
    })

    it('shows checks', function () {
      const bBoardWChecks = new Board()
      bBoardWChecks.parseFenToBoard('rnbq1bnr/pp2pkpp/8/3p4/5P2/2p2N2/PPPP2PP/RNBQKB1R b KQ - 1 6')

      const blackPawnMoves = bBoardWChecks.moves('p')

      assert.equal(blackPawnMoves[1].capture, true)
      assert.equal(blackPawnMoves[1].check, true)
    })

    it('knows en passant', function () {
      const boardWep = new Board()
      boardWep.parseFenToBoard('rnbq1bnr/p1p1kppp/8/1pPpp3/4P3/8/PP1PKPPP/RNBQ1BNR w - b6 0 5')
      const whitePawnMoves = boardWep.moves('P')

      const boardBlkWep = new Board()
      boardBlkWep.parseFenToBoard('rnbq1bnr/p1p1kppp/8/2Ppp3/Pp2P3/3P4/1P2KPPP/RNBQ1BNR b - a3 0 6')
      const blackPawnMoves = boardBlkWep.moves('p')

      assert.equal(whitePawnMoves[13].capture, true)
      assert.equal(whitePawnMoves[13].ep, true)
      assert.equal(blackPawnMoves[0].capture, true)
      assert.equal(blackPawnMoves[0].ep, true)
    })

    it('knows promotions', function () {
      const board = new Board()
      board.parseFenToBoard('r2qkb1r/pP1b1ppp/2n2n2/4p3/8/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 3 7')
      const whitePawnMoves = board.legalMoves()

      assert.equal(whitePawnMoves[30].promoteTo, 'Q')
      assert.equal(whitePawnMoves[31].promoteTo, 'R')
      assert.equal(whitePawnMoves[32].promoteTo, 'B')
      assert.equal(whitePawnMoves[33].promoteTo, 'N')
      assert.equal(whitePawnMoves[34].promoteTo, 'Q')
      assert.equal(whitePawnMoves[35].promoteTo, 'R')
      assert.equal(whitePawnMoves[36].promoteTo, 'B')
      assert.equal(whitePawnMoves[37].promoteTo, 'N')
    })
  })
})

describe('KnightBoard', function () {
  describe('#moves()', function () {
    it('returns legal moves', function () {
      const boardWManyKnightMoves = new Board()
      boardWManyKnightMoves.parseFenToBoard('rnbqkb1r/ppppp1pp/n7/5p2/3P1PN1/2P5/PP2P1PP/RNBQKB1R b KQkq - 1 6')

      const blackKnightMoves = boardWManyKnightMoves.moves('n')

      assert.equal(blackKnightMoves[0].from, 40)
      assert.equal(blackKnightMoves[0].to, 25)
      assert.equal(blackKnightMoves[1].from, 40)
      assert.equal(blackKnightMoves[1].to, 34)
      assert.equal(blackKnightMoves[2].from, 57)
      assert.equal(blackKnightMoves[2].to, 42)
    })

    it('shows threats', function () {
      const boardWManyKnightAttacks = new Board()
      boardWManyKnightAttacks.parseFenToBoard('1nb1kb1r/1ppp1ppp/2n3q1/pQ1rp3/P3P1P1/1PN2N1P/2PP1P2/R1B1KB1R w KQk - 5 10')

      const whiteKnightMoves = boardWManyKnightAttacks.moves('N')

      assert.equal(whiteKnightMoves[8].threat, true)
    })

    it('shows checks', function () {
      const boardWKnightChecks = new Board()
      boardWKnightChecks.parseFenToBoard('r1bqkb1r/pppp1ppp/5n2/3Np3/3nP3/5N2/PPPP1PPP/R1BQKB1R w KQkq - 6 5')

      const whiteKnightMoves = boardWKnightChecks.moves('N')

      assert.equal(whiteKnightMoves[10].check, true)
      assert.equal(whiteKnightMoves[11].check, true)
    })
  })
})

describe('BishopBoard', function () {
  describe('#moves()', function () {
    it('returns legal moves', function () {
      const boardWManyBishopAttacks = new Board()
      boardWManyBishopAttacks.parseFenToBoard('rn2k2r/p1pq1ppp/1p1p1n2/2b1p3/2B1P1b1/BPNP4/P1PQ1PPP/R3K1NR w KQkq - 6 8')

      const whiteBishopMoves = boardWManyBishopAttacks.moves('B')

      assert.equal(whiteBishopMoves[0].from, 16)
      assert.equal(whiteBishopMoves[0].to, 2)
      assert.equal(whiteBishopMoves[1].from, 16)
      assert.equal(whiteBishopMoves[1].to, 9)
      assert.equal(whiteBishopMoves[2].from, 16)
      assert.equal(whiteBishopMoves[2].to, 25)
      assert.equal(whiteBishopMoves[3].from, 16)
      assert.equal(whiteBishopMoves[3].to, 34)
      assert.equal(whiteBishopMoves[4].from, 26)
      assert.equal(whiteBishopMoves[4].to, 33)
      assert.equal(whiteBishopMoves[5].from, 26)
      assert.equal(whiteBishopMoves[5].to, 35)
      assert.equal(whiteBishopMoves[6].from, 26)
      assert.equal(whiteBishopMoves[6].to, 40)
      assert.equal(whiteBishopMoves[7].from, 26)
      assert.equal(whiteBishopMoves[7].to, 44)
      assert.equal(whiteBishopMoves[8].from, 26)
      assert.equal(whiteBishopMoves[8].to, 53)
    })

    it('shows threats', function () {
      const boardWManyBishopAttacks = new Board()
      boardWManyBishopAttacks.parseFenToBoard('rn2k2r/p1pq1ppp/1p1p1n2/2b1p3/2B1P1b1/BPNP4/P1PQ1PPP/R3K1NR w KQkq - 6 8')

      const whiteBishopMoves = boardWManyBishopAttacks.moves('B')

      assert.equal(whiteBishopMoves[4].threat, true)
    })

    it('shows checks', function () {
      const boardWManyBishopAttacks = new Board()
      boardWManyBishopAttacks.parseFenToBoard('rn2k2r/p1pq1ppp/1p1p1n2/2b1p3/2B1P1b1/BPNP4/P1PQ1PPP/R3K1NR w KQkq - 6 8')

      const whiteBishopMoves = boardWManyBishopAttacks.moves('B')

      assert.equal(whiteBishopMoves[8].check, true)
    })
  })
})

describe('RookBoard', function () {
  describe('#moves()', function () {
    it('returns legal moves', function () {
      const boardWManyRookAttacks = new Board()
      boardWManyRookAttacks.parseFenToBoard('1nb1kb2/1pqpppp1/2pr1r1n/p6p/P3R2P/2R2P2/1PPPPKP1/1NBQ1BN1 b - - 5 10')

      const blackRookMoves = boardWManyRookAttacks.moves('r')

      assert.equal(blackRookMoves[0].from, 43)
      assert.equal(blackRookMoves[0].to, 11)
      assert.equal(blackRookMoves[1].from, 43)
      assert.equal(blackRookMoves[1].to, 19)
      assert.equal(blackRookMoves[2].from, 43)
      assert.equal(blackRookMoves[2].to, 27)
      assert.equal(blackRookMoves[3].from, 43)
      assert.equal(blackRookMoves[3].to, 35)
      assert.equal(blackRookMoves[4].from, 43)
      assert.equal(blackRookMoves[4].to, 44)
      assert.equal(blackRookMoves[5].from, 45)
      assert.equal(blackRookMoves[5].to, 21)
      assert.equal(blackRookMoves[6].from, 45)
      assert.equal(blackRookMoves[6].to, 29)
      assert.equal(blackRookMoves[7].from, 45)
      assert.equal(blackRookMoves[7].to, 37)
      assert.equal(blackRookMoves[8].from, 45)
      assert.equal(blackRookMoves[8].to, 44)
      assert.equal(blackRookMoves[9].from, 45)
      assert.equal(blackRookMoves[9].to, 46)
    })

    it('shows threats', function () {
      const boardWManyRookAttacks = new Board()
      boardWManyRookAttacks.parseFenToBoard('1nb1kb2/1pqpppp1/2pr1r1n/p6p/P3R2P/2R2P2/1PPPPKP1/1NBQ1BN1 b - - 5 10')

      const blackRookMoves = boardWManyRookAttacks.moves('r')

      assert.equal(blackRookMoves[0].threat, true)
    })

    it('shows checks', function () {
      const boardWManyRookAttacks = new Board()
      boardWManyRookAttacks.parseFenToBoard('1nb1kb2/1pqpppp1/2pr1r1n/p6p/P3R2P/2R2P2/1PPPPKP1/1NBQ1BN1 b - - 5 10')

      const blackRookMoves = boardWManyRookAttacks.moves('r')

      assert.equal(blackRookMoves[5].check, true)
    })
  })
})

describe('QueenBoard', function () {
  describe('#moves()', function () {
    it('returns legal moves', function () {
      const boardWManyQueenAttacks = new Board()
      boardWManyQueenAttacks.parseFenToBoard('rnb1kbnr/pp1p1ppp/8/q1p1p2Q/4P3/5N2/PPPP1PPP/RNB1KB1R w KQkq - 2 4')

      const whiteQueenMoves = boardWManyQueenAttacks.moves('Q')

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
    })

    it('shows checks', function () {
      const boardWManyQueenAttacks = new Board()
      boardWManyQueenAttacks.parseFenToBoard('rnb1kbnr/pp1p1ppp/8/q1p1p2Q/4P3/5N2/PPPP1PPP/RNB1KB1R w KQkq - 2 4')

      const whiteQueenMoves = boardWManyQueenAttacks.moves('Q')

      assert.equal(whiteQueenMoves[8].check, true)
    })
  })
})

describe('KingBoard', function () {
  describe('#moves()', function () {
    it('returns legal moves', function () {
      const boardWManyKingMoves = new Board()
      boardWManyKingMoves.parseFenToBoard('1r3r2/p1pp3p/Pp1k2p1/3p1p2/5P1P/2K1P3/P1PP3P/R1B4R w - - 0 19')

      const whiteKingMoves = boardWManyKingMoves.moves('K')

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
    })

    it('can castle', function () {
      const boardWCastles = new Board()
      boardWCastles.parseFenToBoard('r3k2r/ppqbbppp/3p1n2/4p1B1/2B1P3/2N4P/PPPQ1PP1/R3K2R w KQkq - 1 11')

      const whiteKingMoves = boardWCastles.moves('K')

      assert.equal(whiteKingMoves[0].castle, true)
      assert.equal(whiteKingMoves[3].castle, true)
    })

    it('cannot castle when in check', function () {
      const board = new Board()
      board.parseFenToBoard('r1bqk2r/pppp1ppp/2n1pn2/1B6/1b1PP3/5N2/PPP2PPP/RNBQK2R w KQkq - 5 5')
      const kingMoves = board.legalMoves()

      assert.equal(kingMoves[0].from, 4)
      assert.equal(kingMoves[0].to, 5)
      assert.equal(kingMoves[1].from, 4)
      assert.equal(kingMoves[1].to, 12)
    })

    it('cannot move to a square attacked by a rook', function () {
      const boardWSqAttackedByRook = new Board()
      boardWSqAttackedByRook.parseFenToBoard('4k3/8/8/5R2/8/8/8/4K3 b - - 0 1')

      const blackKingMoves = boardWSqAttackedByRook.moves('k')

      assert.equal(blackKingMoves.length, 3)
    })

    it('should not move to a blocked square', function () {
      const boardWSqAttackedByRook = new Board()
      boardWSqAttackedByRook.parseFenToBoard('8/4k3/8/8/4R3/8/8/4K3 b - - 0 1')

      const blackKingMoves = boardWSqAttackedByRook.moves('k')

      assert.equal(blackKingMoves.length, 6)
    })

    it('should not castle when castling sq is attacked', function () {
      const board = new Board()
      board.parseFenToBoard('r3k2r/p1ppqpb1/bnN1pnp1/3P4/1p2P3/2N2Q1p/PPPBBPPP/R3K2R b KQkq - 1 1')

      assert.equal(board.legalMoves().length, 41)
    })
  })
})

// BoardView should return Strings
/* eslint-disable max-len */
describe('BoardView', function () {
  // in binary, you have to read from right to left
  // so you need to imagine going through the FEN in reverse order of rank and file
  // ...b8b7b6b5b4b3b2b1a8a7a6a5a4a3a2a1
  // with this function, this makes it easier to understand for regular people
  describe('#display()', function () {
    it('shows the all the pieces on the board', function () {
      const board = new Board()
      board.parseFenToBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')

      assert.equal(new BoardView(board.pieceBoardList).display(), '11111111\n11111111\n00000000\n00000000\n00000000\n00000000\n11111111\n11111111')
    })

    it('correctly flips the board', function () {
      const flippedBoard = new Board()
      flippedBoard.parseFenToBoard('r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq ')
      flippedBoard.flipBoard()

      assert.equal(new BoardView(flippedBoard.pieceBoardList).display(), '11111001\n11110111\n00000100\n00101000\n00101000\n00100000\n11110111\n10111011')
    })
  })
})
/* eslint-enable max-len */

// SquareHelper should return integer indices
describe('SquareHelper', function () {
  describe('#indicesFor', function () {
    it('shows indices of black rook', function () {
      const board = new Board()
      board.parseFenToBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
      const rookBoard = board.pieceBoardList.r
      const bKingBoard = board.pieceBoardList.k
      const wKingBoard = board.pieceBoardList.K

      assert.equal(SquareHelper.indicesFor(rookBoard.bb)[0], 56)
      assert.equal(SquareHelper.indicesFor(rookBoard.bb)[1], 63)
    })

    it('shows indices of black king', function () {
      const board = new Board()
      board.parseFenToBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
      const rookBoard = board.pieceBoardList.r
      const bKingBoard = board.pieceBoardList.k
      const wKingBoard = board.pieceBoardList.K

      assert.equal(SquareHelper.indicesFor(bKingBoard.bb)[0], 60)
    })

    it('shows indices of white king', function () {
      const board = new Board()
      board.parseFenToBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
      const rookBoard = board.pieceBoardList.r
      const bKingBoard = board.pieceBoardList.k
      const wKingBoard = board.pieceBoardList.K

      assert.equal(SquareHelper.indicesFor(wKingBoard.bb)[0], 4)
    })
  })
})

describe('Engine', function () {
  describe('#make() and #unmake()', function () {
    it('should update the board for a quiet move', function () {
      const engine = new Engine('r1b1k2r/1Pp1bp2/3pq2p/1p2p1pP/4P1n1/2N2NP1/PPP1QP2/R1B1K2R w KQkq g6 0 13')
      const moves = engine.board.legalMoves()
      const originalPawnBb = engine.board.pieceBoardList.P.bb
      const originalBb = engine.board.bb
      const originalPosKey = engine.board.posKey

      engine.make(moves[35])
      assert.equal(engine.board.pieceBoardList.P.bb, 563499982005504n)
      assert.equal(engine.board.bb, 10751949189453067669n)
      assert.equal(engine.board.posKey, 1242188158515443456n)

      engine.unmake()
      assert.equal(engine.board.pieceBoardList.P.bb, originalPawnBb)
      assert.equal(engine.board.bb, originalBb)
      assert.equal(engine.board.posKey, originalPosKey)
    })

    it('should update the board for a capture move', function () {
      const engine = new Engine('r1b1k2r/1Pp1bp2/3pq2p/1p2p1pP/4P1n1/2N2NP1/PPP1QP2/R1B1K2R w KQkq g6 0 13')
      const moves = engine.board.legalMoves()
      const originalCapturedBb = engine.board.pieceBoardList.p.bb
      const originalQueenBb = engine.board.pieceBoardList.Q.bb
      const originalBb = engine.board.bb
      const originalPosKey = engine.board.posKey

      engine.make(moves[10])
      assert.equal(engine.board.pieceBoardList.p.bb, 10282976340344832n)
      assert.equal(engine.board.pieceBoardList.Q.bb, 8589934592n)
      assert.equal(engine.board.bb, 10751949189452933013n)
      assert.equal(engine.board.posKey, 1648593472771548825n)

      engine.unmake()
      assert.equal(engine.board.pieceBoardList.p.bb, originalCapturedBb)
      assert.equal(engine.board.pieceBoardList.Q.bb, originalQueenBb)
      assert.equal(engine.board.bb, originalBb)
      assert.equal(engine.board.posKey, originalPosKey)
    })

    it('should update the castle status for any king move', function () {
      const engine = new Engine('r1b1k2r/1Pp1bp2/3pq2p/1p2p1pP/4P1n1/2N2NP1/PPP1QP2/R1B1K2R w KQkq g6 0 13')
      const moves = engine.board.legalMoves()
      const originalKingBb = engine.board.pieceBoardList.K.bb
      const originalBb = engine.board.bb
      const originalPosKey = engine.board.posKey
      const originalCastleStatus = engine.board.castleStatus

      engine.make(moves[1])
      assert.equal(engine.board.pieceBoardList.K.bb, 32n)
      assert.equal(engine.board.bb, 10751949189452937125n)
      assert.equal(engine.board.posKey, 1377952623175419136n)
      assert.equal(engine.board.castleStatus, 9295429630892703744n)

      engine.unmake()
      assert.equal(engine.board.pieceBoardList.K.bb, originalKingBb)
      assert.equal(engine.board.bb, originalBb)
      assert.equal(engine.board.posKey, originalPosKey)
      assert.equal(engine.board.castleStatus, originalCastleStatus)
    })

    it('should update the castle status for any rook move', function () {
      const engine = new Engine('r1b1k2r/1Pp1bp2/3pq2p/1p2p1pP/4P1n1/2N2NP1/PPP1QP2/R1B1K2R w KQkq g6 0 13')
      const moves = engine.board.legalMoves()
      const originalRookBb = engine.board.pieceBoardList.R.bb
      const originalBb = engine.board.bb
      const originalPosKey = engine.board.posKey
      const originalCastleStatus = engine.board.castleStatus

      engine.make(moves[12])
      assert.equal(engine.board.pieceBoardList.R.bb, 33n)
      assert.equal(engine.board.bb, 10751949189452937013n)
      assert.equal(engine.board.posKey, 1518971743604585881n)
      assert.equal(engine.board.castleStatus, 9295429630892703745n)

      engine.unmake()
      assert.equal(engine.board.pieceBoardList.R.bb, originalRookBb)
      assert.equal(engine.board.bb, originalBb)
      assert.equal(engine.board.posKey, originalPosKey)
      assert.equal(engine.board.castleStatus, originalCastleStatus)
    })

    it('should update the castle status for any castle', function () {
      const engine = new Engine('r1b1k2r/1Pp1bp2/3pq2p/1p2p1pP/4P1n1/2N2NP1/PPP1QP2/R1B1K2R w KQkq g6 0 13')
      const moves = engine.board.legalMoves()
      const originalKingBb = engine.board.pieceBoardList.K.bb
      const originalRookBb = engine.board.pieceBoardList.R.bb
      const originalBb = engine.board.bb
      const originalPosKey = engine.board.posKey
      const originalCastleStatus = engine.board.castleStatus

      engine.make(moves[2])
      assert.equal(engine.board.pieceBoardList.K.bb, 64n)
      assert.equal(engine.board.pieceBoardList.R.bb, 33n)
      assert.equal(engine.board.bb, 10751949189452937061n)
      assert.equal(engine.board.posKey, 678716279420615168n)
      assert.equal(engine.board.castleStatus, 9295429630892703744n)

      engine.unmake()
      assert.equal(engine.board.pieceBoardList.K.bb, originalKingBb)
      assert.equal(engine.board.pieceBoardList.R.bb, originalRookBb)
      assert.equal(engine.board.bb, originalBb)
      assert.equal(engine.board.posKey, originalPosKey)
      assert.equal(engine.board.castleStatus, originalCastleStatus)
    })

    it('should update en passant', function () {
      const engine = new Engine('r1b1k2r/1Pp1bp2/3pq2p/1p2p1pP/4P1n1/2N2NP1/PPP1QP2/R1B1K2R w KQkq g6 0 13')
      const moves = engine.board.legalMoves()
      const originalWhitePawnBb = engine.board.pieceBoardList.P.bb
      const originalBlackPawnBb = engine.board.pieceBoardList.p.bb
      const originalBb = engine.board.bb
      const originalPosKey = engine.board.posKey

      engine.make(moves[37])
      assert.equal(engine.board.pieceBoardList.P.bb, 633318970238720n)
      assert.equal(engine.board.pieceBoardList.p.bb, 10282710052372480n)
      assert.equal(engine.board.bb, 10752018733563393941n)
      assert.equal(engine.board.posKey, 1772124636395260825n)

      engine.unmake()
      assert.equal(engine.board.pieceBoardList.P.bb, originalWhitePawnBb)
      assert.equal(engine.board.pieceBoardList.p.bb, originalBlackPawnBb)
      assert.equal(engine.board.bb, originalBb)
      assert.equal(engine.board.posKey, originalPosKey)
    })

    it('should update board when someone makes a move that creates en passant', function () {
      const engineWEpOpps = new Engine('rnbqkbnr/p1pppppp/8/1p2P3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2')
      const blackMoves = engineWEpOpps.board.legalMoves()
      const originalBlackPawnBb = engineWEpOpps.board.pieceBoardList.p.bb
      const originalWhitePawnBb = engineWEpOpps.board.pieceBoardList.P.bb
      const originalBb = engineWEpOpps.board.bb
      const originalPosKey = engineWEpOpps.board.posKey
      const originalEpSqIdx = engineWEpOpps.board.epSqIdx
      const originalEpSqBb = engineWEpOpps.board.epSqBb
      const originalEpCaptureBb = engineWEpOpps.board.epCaptureBb

      engineWEpOpps.make(blackMoves[14])
      assert.equal(engineWEpOpps.board.pieceBoardList.p.bb, 62206115881943040n)
      assert.equal(engineWEpOpps.board.pieceBoardList.P.bb, 68719537920n)
      assert.equal(engineWEpOpps.board.bb, 18436892664273104895n)
      assert.equal(engineWEpOpps.board.posKey, 780473338931344793n)
      assert.equal(engineWEpOpps.board.epSqIdx, 45)
      assert.equal(engineWEpOpps.board.epSqBb, 35184372088832n)
      assert.equal(engineWEpOpps.board.epCaptureBb, 137438953472n)

      engineWEpOpps.unmake()
      assert.equal(engineWEpOpps.board.pieceBoardList.p.bb, originalBlackPawnBb)
      assert.equal(engineWEpOpps.board.pieceBoardList.P.bb, originalWhitePawnBb)
      assert.equal(engineWEpOpps.board.bb, originalBb)
      assert.equal(engineWEpOpps.board.posKey, originalPosKey)
      assert.equal(engineWEpOpps.board.epSqIdx, originalEpSqIdx)
      assert.equal(engineWEpOpps.board.epSqBb, originalEpSqBb)
      assert.equal(engineWEpOpps.board.epCaptureBb, originalEpCaptureBb)

      engineWEpOpps.make(blackMoves[14])
      const whiteMoves = engineWEpOpps.board.legalMoves()
      engineWEpOpps.make(whiteMoves[29])
      assert.equal(engineWEpOpps.board.pieceBoardList.p.bb, 62205978442989568n)
      assert.equal(engineWEpOpps.board.pieceBoardList.P.bb, 35184372150016n)
      assert.equal(engineWEpOpps.board.bb, 18436927642486763519n)
      assert.equal(engineWEpOpps.board.posKey, 1392104474818006016n)
      assert.equal(engineWEpOpps.board.epSqIdx, originalEpSqIdx)
      assert.equal(engineWEpOpps.board.epSqBb, originalEpSqBb)
      assert.equal(engineWEpOpps.board.epCaptureBb, originalEpCaptureBb)

      engineWEpOpps.unmake()
      engineWEpOpps.unmake()
      assert.equal(engineWEpOpps.board.pieceBoardList.p.bb, originalBlackPawnBb)
      assert.equal(engineWEpOpps.board.pieceBoardList.P.bb, originalWhitePawnBb)
      assert.equal(engineWEpOpps.board.bb, originalBb)
      assert.equal(engineWEpOpps.board.posKey, originalPosKey)
      assert.equal(engineWEpOpps.board.epSqIdx, originalEpSqIdx)
      assert.equal(engineWEpOpps.board.epSqBb, originalEpSqBb)
      assert.equal(engineWEpOpps.board.epCaptureBb, originalEpCaptureBb)
    })

    it('should make and unmake promotions', function() {
      const engine = new Engine('r2qkb1r/pP1b1ppp/2n2n2/4p3/8/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 3 7')
      const moves = engine.board.legalMoves()
      const originalWhitePawnBb = engine.board.pieceBoardList.P.bb
      const originalWhiteQueenBb = engine.board.pieceBoardList.Q.bb
      const originalBb = engine.board.bb
      const originalPosKey = engine.board.posKey

      engine.make(moves[34])
      assert.equal(engine.board.pieceBoardList.P.bb, 61184n)
      assert.equal(engine.board.pieceBoardList.Q.bb, 144115188075855880n)
      assert.equal(engine.board.bb, 13540393405806604221n)
      assert.equal(engine.board.posKey, 803261496098777497n)

      engine.unmake()
      assert.equal(engine.board.pieceBoardList.P.bb, originalWhitePawnBb)
      assert.equal(engine.board.pieceBoardList.Q.bb, originalWhiteQueenBb)
      assert.equal(engine.board.bb, originalBb)
      assert.equal(engine.board.posKey, originalPosKey)
    })

    it('should test full move number', function() {
      const engine = new Engine('r2qkb1r/pP1b1ppp/2n2n2/4p3/8/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 3 7')
      const originalCount = engine.board.fullMoveNo
      engine.make(engine.board.legalMoves()[1])
      engine.make(engine.board.legalMoves()[1])
      assert.equal(engine.board.fullMoveNo, 8)

      engine.unmake()
      engine.unmake()
      assert.equal(engine.board.fullMoveNo, originalCount)
    })

    it('should test half-move clock', function() {
      const engine = new Engine('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
      engine.make(engine.board.legalMoves()[0])
      engine.unmake()
      assert.equal(engine.board.halfMoveClock, 0)
      engine.make(engine.board.legalMoves()[0])
      assert.equal(engine.board.halfMoveClock, 1)
      
      engine.make(engine.board.legalMoves()[4])
      engine.unmake()
      assert.equal(engine.board.halfMoveClock, 1)
      engine.make(engine.board.legalMoves()[4])
      assert.equal(engine.board.halfMoveClock, 0)
      
      engine.make(engine.board.legalMoves()[4])
      engine.unmake()
      assert.equal(engine.board.halfMoveClock, 0)
      engine.make(engine.board.legalMoves()[4])
      assert.equal(engine.board.halfMoveClock, 1)

      engine.make(engine.board.legalMoves()[7])
      engine.unmake()
      assert.equal(engine.board.halfMoveClock, 1)
      engine.make(engine.board.legalMoves()[7])
      assert.equal(engine.board.halfMoveClock, 0)

      engine.make(engine.board.legalMoves()[1])
      engine.unmake()
      assert.equal(engine.board.halfMoveClock, 0)
      engine.make(engine.board.legalMoves()[1])
      assert.equal(engine.board.halfMoveClock, 1)

      engine.make(engine.board.legalMoves()[10])
      engine.unmake()
      assert.equal(engine.board.halfMoveClock, 1)
      engine.make(engine.board.legalMoves()[10])
      assert.equal(engine.board.halfMoveClock, 0)
    })

    it('verify check evasions - capture checker', function() {
      const engine = new Engine('3K4/8/8/8/8/2b5/1N6/3k4 b - - 0 1')
      const originalMoves = engine.board.legalMoves()

      engine.make(originalMoves[1])
      engine.unmake()

      assert.equal(engine.board.legalMoves().length, originalMoves.length)
    })

    it('verify check evasions - block checker', function() {
      const engine = new Engine('3K4/8/8/3Q4/8/2b5/8/3k4 b - - 0 1')
      const originalMoves = engine.board.legalMoves()

      engine.make(originalMoves[1])
      engine.unmake()

      assert.equal(engine.board.legalMoves().length, originalMoves.length)
    })

    it('verify check evasions - king moves', function() {
      const engine = new Engine('4k3/6N1/5b2/4R3/8/8/8/4K3 b - - 0 1')
      const originalMoves = engine.board.legalMoves()

      engine.make(originalMoves[1])
      engine.unmake()

      assert.equal(engine.board.legalMoves().length, originalMoves.length)
    })

    it('verify check evasions - en passant check evasion', function() {
      const engine = new Engine('8/8/8/2k5/3Pp3/8/8/4K3 b - d3 0 1')
      const originalMoves = engine.board.legalMoves()

      engine.make(originalMoves[1])
      engine.unmake()

      assert.equal(engine.board.legalMoves().length, originalMoves.length)
    })

    it('verify check evasions - file pin', function() {
      const engine = new Engine('4k3/8/4r3/8/8/4Q3/8/2K5 b - - 0 1')
      const originalMoves = engine.board.legalMoves()

      engine.make(originalMoves[0])
      engine.unmake()

      assert.equal(engine.board.legalMoves().length, originalMoves.length)
    })

    it('verify check evasions - file pin pawn', function() {
      const engine = new Engine('4k3/4p3/3P4/8/4Q3/8/8/2K5 b - - 0 1')
      const originalMoves = engine.board.legalMoves()

      engine.make(originalMoves[0])
      engine.unmake()

      assert.equal(engine.board.legalMoves().length, originalMoves.length)
    })

    it('verify check evasions - rank pin', function() {
      const engine = new Engine('R2rk3/8/8/8/8/8/8/2K5 b - - 0 1')
      const originalMoves = engine.board.legalMoves()

      engine.make(originalMoves[0])
      engine.unmake()

      assert.equal(engine.board.legalMoves().length, originalMoves.length)
    })

    it('verify check evasions - rank pin pawn', function() {
      const engine = new Engine('8/1R2pk2/8/8/8/8/8/2K5 b - - 0 1')
      const originalMoves = engine.board.legalMoves()

      engine.make(originalMoves[0])
      engine.unmake()

      assert.equal(engine.board.legalMoves().length, originalMoves.length)
    })

    it('should show threefold repetition', function() {
      const engine = new Engine('1kr5/1b3R2/1B2p3/4Pn1p/R7/2P3p1/1KP4r/8 w - - 0 1')

      engine.make(engine.board.legalMoves()[35])
      engine.make(engine.board.legalMoves()[0])
      engine.make(engine.board.legalMoves()[32])
      engine.make(engine.board.legalMoves()[0])
      engine.make(engine.board.legalMoves()[35])
      engine.make(engine.board.legalMoves()[0])
      engine.make(engine.board.legalMoves()[32])
      engine.make(engine.board.legalMoves()[0])
      engine.make(engine.board.legalMoves()[35])
      engine.make(engine.board.legalMoves()[0])

      assert.equal(engine.board.isThreeFoldRepetition, true)
    })
  })
})

describe('Perft Tricky Positions', function () {
  it('kiwipete 1', function () {
    const engine = new Engine('r3k2r/p1ppqpb1/bn2pnp1/3PN2Q/1p2P3/2N4p/PPPBBPPP/R3K2R b KQkq - 1 1')

    assert.equal(engine.board.legalMoves().length, 43)
  })

  it('kiwipete 2', function () {
    const engine = new Engine('r3k2r/p1ppqpb1/bn2pnN1/3P4/1p2P3/2N2Q1p/PPPBBPPP/R3K2R b KQkq - 0 1')

    assert.equal(engine.board.legalMoves().length, 42)
  })

  it('kiwipete 3 - castling bug', function () {
    const engine = new Engine('r3k2r/p1ppqpb1/1n2pnp1/3PN3/1p2P3/2N2Q1p/PPPBbPPP/1R2K2R w Kkq - 0 2')

    assert.equal(engine.board.legalMoves().length, 40)
  })

  it('kiwipete 4 - unmake bug', function () {
    const engine = new Engine('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - ')

    const initialCastleStatus = engine.board.castleStatus
    engine.make(engine.board.legalMoves()[13])

    const firstCastleStatus = engine.board.castleStatus
    engine.make(engine.board.legalMoves()[0])

    const secondCastleStatus = engine.board.castleStatus
    engine.make(engine.board.legalMoves()[2])
    
    engine.unmake()
    assert.equal(engine.board.castleStatus, secondCastleStatus)
    
    engine.unmake()
    assert.equal(engine.board.castleStatus, firstCastleStatus)
    
    engine.unmake()
    assert.equal(engine.board.castleStatus, initialCastleStatus)
  })

  it('tc1 1 - pins', function () {
    const engine = new Engine('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - ')

    engine.make(engine.board.legalMoves()[11])
    assert.equal(engine.board.legalMoves().length, 16)
  })

  it('tc1 2 - pins', function () {
    const engine = new Engine('8/2p5/3p4/KP5r/1R2Pp1k/8/6P1/8 b - - 0 1')

    assert.equal(engine.board.legalMoves().length, 16)
  })

  it('tc1 3 - pins', function () {
    const engine = new Engine('8/2p5/3p4/1P5r/KR3p1k/8/4P1P1/8 b - - 1 1')

    assert.equal(engine.board.legalMoves().length, 15)
  })

  it('tc1 4 - pins w/ en passant', function () {
    const engine = new Engine('8/2p5/3p4/KPr5/R4p1k/8/4P1P1/8 w - - 2 2')

    assert.equal(engine.board.legalMoves().length, 14)
  })

  it('tc1 5 - pins w/ en passant', function () {
    const engine = new Engine('8/2p5/3p4/1P5r/KR3p1k/8/4P1P1/8 b - - 1 1')

    engine.make(engine.board.legalMoves()[13])

    assert.equal(engine.board.legalMoves().length, 16)
  })

  it('tc1 6 - make en passant ', function () {
    const engine = new Engine('8/2p5/3p4/1P5r/KR3p2/6k1/4P1P1/8 w - - 2 2')

    engine.make(engine.board.legalMoves()[11])

    assert.equal(engine.board.legalMoves().length, 23)
  })

  it('tc1 7 - doesnt see checker ray', function () {
    const engine = new Engine('8/2p5/3p4/KP5r/5R1k/8/4P1P1/8 b - - 0 1')

    assert.equal(engine.board.legalMoves().length, 2)
  })

  it('tc1 8 - pinned for no reason', function () {
    const engine = new Engine('8/2p5/3p4/1P4r1/KR3pPk/8/4P3/8 b - - 0 2')

    assert.equal(engine.board.legalMoves().length, 17)
  })

  it('tc1 9 - king should be in check after capture', function () {
    const engine = new Engine('8/2p5/3p4/KP5r/6R1/6k1/4P1P1/8 b - - 2 2')

    assert.equal(engine.board.legalMoves().length, 3)
  })

  it('tc2 1 - pin w/ en passant', function () {
    const engine = new Engine('r3k2r/Pppp1ppp/1b3nbN/nP6/BBPPP3/q4N2/Pp4PP/R2Q1RK1 b kq - 0 1')

    engine.make(engine.board.legalMoves()[38])

    assert.equal(engine.board.legalMoves().length, 39)
  })

  it('tc2 2 - double pin', function () {
    const engine = new Engine('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/P2P1RPP/q2Q2K1 w kq - 0 2')

    assert.equal(engine.board.legalMoves().length, 33)
  })

  it('tc2 3 - frozen h pawn', function () {
    const engine = new Engine('r3k2r/Pppp1ppp/1b3nbN/nP6/BBPNP3/6q1/Pp1P2PP/R2Q1RK1 w kq - 2 2')

    assert.equal(engine.board.legalMoves().length, 38)
  })

  it('tc3 1 - castles and pins', function () {
    const engine = new Engine('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8  ')

    assert.equal(engine.board.legalMoves().length, 44)
  })

  it('tc3 2 - castles and pins', function () {
    const engine = new Engine('rnbq1k1r/pp1Pbppp/2p4B/8/2B5/8/PPP1NnPP/RN1QK2R b KQ - 2 8')

    assert.equal(engine.board.legalMoves().length, 31)
  })

  it('tc3 3 - castles and pins', function () {
    const engine = new Engine('rnbq1k1r/pp1Pbppp/2pQ4/8/2B5/8/PPP1NnPP/RNB1K2R b KQ - 2 8')

    assert.equal(engine.board.legalMoves().length, 28)
  })

  it('tc3 4 - castles and pins', function () {
    const engine = new Engine('rnQq1k1r/pp2bppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R b KQ - 0 8')

    assert.equal(engine.board.legalMoves().length, 31)
  })

  it('tc3 5 - castles and pins', function () {
    const engine = new Engine('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQ1RK1 b - - 2 8')

    assert.equal(engine.board.legalMoves().length, 34)
  })

  it('tc3 6 - castles and pins', function () {
    const engine = new Engine('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQKR2 b Q - 2 8')

    assert.equal(engine.board.legalMoves().length, 34)
  })

  it('tc3 7 - check evasion bug', function () {
    const engine = new Engine('rnb2k1r/pp1Pbppp/2p5/q7/2B5/P7/1PP1NnPP/RNBQK2R w KQ - 1 9')

    engine.board.legalMoves()

    assert.equal(engine.board.legalMoves().length, 9)
  })

  it('tc3 8 - castle bug', function () {
    const engine = new Engine('rnbq1k1r/pp1Pbppp/2p5/8/2B5/P7/1PP1N1PP/RNBQK2n w Q - 0 9')

    assert.equal(engine.board.legalMoves().length, 40)
  })
})

