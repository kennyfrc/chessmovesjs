import {Chess} from 'chess.js';
import {INPUT_EVENT_TYPE, COLOR, Chessboard, MARKER_TYPE} from 'cm-chessboard';
import {assert} from 'chai';

/*  INPUT_EVENT_TYPE covers moveStart (user started move input),
    moveEnd (ended move input), and moveCanceled
    (user canceled by clicking outside of the board)
    COLOR is just 'w' and 'b' MARKER_TYPE covers frame, square, dot, and circle
*/
const CHESS = new Chess();
const BOARD = new Chessboard(document.getElementById('board'), {
  position: 'start',
});
const USER_COLOR = COLOR.white;
let NODES = 0;

function getBestMove() {
  const depth = 3;
  const startTime = new Date().getTime();
  const bestMove = negaMaxRoot(depth);
  const endTime = new Date().getTime();
  const moveTime = endTime - startTime;
  const nps = (NODES * 1000) / moveTime;

  console.log(NODES);
  console.log(nps);

  return bestMove;
}

function userMove(event) {
  return {from: event.squareFrom, to: event.squareTo, promotion: 'q'};
}

function makeMove(event, player) {
  let move = null;

  if (player.cpu) {
    move = getBestMove();
  } else {
    move = userMove(event);
  }

  assert(move != null);

  return CHESS.move(move);
}

function negaMaxRoot(depth) {
  const newMoves = CHESS.moves();
  let bestMove = -Infinity;
  let bestMoveFound = null;

  for (let i = 0; i < newMoves.length; i++) {
    const newMove = newMoves[i];
    CHESS.move(newMove);
    const value = negaMax(depth - 1, -Infinity, Infinity);
    CHESS.undo();
    if (value >= bestMove) {
      bestMove = value;
      bestMoveFound = newMove;
    }
  }

  assert(bestMoveFound != null);

  return bestMoveFound;
}

function negaMax(depth, alpha, beta) {
  NODES += 1;

  let foundPv = false;

  if (depth === 0) {
    return -evaluate(CHESS.board());
  }

  const gameMoves = CHESS.moves();

  for (let i = 0; i < gameMoves.length; i++) {
    const move = gameMoves[i];
    let value = null;

    CHESS.move(move);
    // if PV found, then it's assumed that you won't find a better one
    // this relies on good move ordering
    if (foundPv) {
      value = -negaMax(depth -1, -alpha - 1, -alpha);

      if ((value > alpha) && (value < beta)) {
        value = -negaMax(depth - 1, -beta, -alpha);
      }
    } else {
      value = -negaMax(depth - 1, -beta, -alpha);
    }

    assert(value != null);
    CHESS.undo();

    if (value >= beta) {
      return beta;
    }

    if (value > alpha) {
      alpha = value;
      foundPv = true;
    }
  }
  return alpha;
};

// function generateCaptures() {
//   const moves = CHESS.moves({verbose: true});
//   const captures = moves.filter((move) => {
//     return (move.flags === 'c');
//   });
//   const goodCaptures = captures.filter((capture) => {
//     return favorableCapture(capture);
//   });

//   return goodCaptures;
// }

// function favorableCapture(capture) {
//   const taker = capture.piece;
//   const squareTo = capture.to;
//   const taken = CHESS.get(squareTo).type;
//   let favorableCapture = false;

//   if (taker === 'p' && 'nbrqk'.includes(taken) ||
//     taker === 'n' && 'brqk'.includes(taken) ||
//     taker === 'b' && 'rqk'.includes(taken) ||
//     taker === 'r' && 'qk'.includes(taken) ||
//     taker === 'q' && 'k'.includes(taken)) {
//     favorableCapture = true;
//   }

//   return favorableCapture;
// }

// function quiescence(alpha, beta) {
//   NODES += 1;

//   let value = evaluate(CHESS.board());

//   if (value >= beta) {
//     return beta;
//   }

//   if (value > alpha) {
//     alpha = value;
//   }

//   const goodCaptures = generateCaptures();

//   for (let i = 0; i < goodCaptures.length; i++) {
//     const capture = goodCaptures[i];

//     CHESS.move(capture);
//     value = -quiescence(-beta, -alpha);

//     CHESS.undo();

//     if (value >= beta) {
//       return beta;
//     }

//     if (value > alpha) {
//       alpha = value;
//     }
//   }

//   return alpha;
// }

function evaluate(board) {
  let totalEval = 0;

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      totalEval = totalEval + getPieceValue(board[i][j], i, j);
    }
  }

  return totalEval;
}

function getPieceValue(piece, file, rank) {
  if (piece === null) {
    return 0;
  }

  function getAbsValue(piece) {
    if (piece.type === 'p') {
      return 100;
    } else if (piece.type === 'r') {
      return 500;
    } else if (piece.type === 'n') {
      return 300;
    } else if (piece.type === 'b') {
      return 325;
    } else if (piece.type === 'q') {
      return 1000;
    } else if (piece.type === 'k') {
      return 32000;
    } else {
      assert('prnbqk'.includes(piece.type));
    }
  }

  const absValue = getAbsValue(piece);

  if (piece.color === 'w') {
    return absValue;
  } else {
    return -absValue;
  }
}

function inputHandler(event) {
  console.log('event', event);

  // this just clears out any remaining markers from the board
  event.chessboard.removeMarkers(undefined, MARKER_TYPE.dot);

  // if the user picks up a piece, then show the moves
  if (event.type === INPUT_EVENT_TYPE.moveStart) {
    const moves = CHESS.moves({square: event.square, verbose: true});
    for (const move of moves) {
      event.chessboard.addMarker(move.to, MARKER_TYPE.dot);
    }
    return moves.length > 0;
  // once the user drops the piece, then record the move then
  // the cpu calculates the next move
  } else if (event.type === INPUT_EVENT_TYPE.moveDone) {
    const result = makeMove(event, {cpu: false});
    if (result && !CHESS.game_over()) {
      event.chessboard.disableMoveInput();
      event.chessboard.setPosition(CHESS.fen());

      setTimeout(() => {
        makeMove(event, {cpu: true});
        renderHistory(CHESS.history());

        event.chessboard.enableMoveInput(inputHandler, USER_COLOR);
        event.chessboard.setPosition(CHESS.fen());
      }, 500);
    } else if (result && CHESS.game_over()) {
      event.chessboard.disableMoveInput();
      event.chessboard.setPosition(CHESS.fen());
      renderHistory(CHESS.history());

      if (CHESS.in_checkmate()) {
        alert('Checkmate!');
      } else if (CHESS.in_draw() || CHESS.in_stalemate() ||
        CHESS.in_threefold_repetition() ) {
        alert('Draw!');
      }
    }
  }
}

function renderHistory(moves) {
  const historyElement = document.getElementById('pgn');
  historyElement.innerHTML = '';

  for (let i = 0; i < moves.length; i = i + 2) {
    historyElement.append(' ' + moves[i] + ' ' + ( moves[i + 1] ?
      moves[i + 1] : ' '));
  }
}

BOARD.enableMoveInput(inputHandler, USER_COLOR);
