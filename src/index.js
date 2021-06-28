import { Chess } from "chess.js"
import { INPUT_EVENT_TYPE, COLOR, Chessboard, MARKER_TYPE } from "cm-chessboard"

// INPUT_EVENT_TYPE covers moveStart (user started move input), moveEnd (ended move input), and moveCanceled (user canceled by clicking outside of the board)
// COLOR is just 'w' and 'b'
// MARKER_TYPE covers frame, square, dot, and circle

const CHESS = new Chess()
const BOARD = new Chessboard(document.getElementById("board"), {
    position: "start"
})
const USER_COLOR = COLOR.white
var NODES = 0
// calculates a random move
function randomMove() {
    let new_game_moves = CHESS.moves({ verbose: true })
	let game_move = new_game_moves[Math.floor(Math.random() * new_game_moves.length)]

	return game_move
}

function getBestMove() {
	let depth = 2
	let start_time = new Date().getTime()
	let best_move = alphaBetaRoot(depth, true)
	let end_time = new Date().getTime()
	let move_time = end_time - start_time
	let nps = (NODES * 1000) / move_time

	console.log(NODES)
	console.log(nps)

	return best_move
}

function userMove(event) {
	return { from: event.squareFrom, to: event.squareTo, promotion: 'q' }
}

function makeMove(event, player) {
	let move

	if (player.cpu) {
		move = getBestMove()
	} else {
		move = userMove(event) 
	}

	if (move) {
		return CHESS.move(move)
	}
}

function alphaBetaRoot(depth, isMaximizingPlayer) {
	let new_moves = CHESS.moves()
	let best_move = -Infinity
	let best_move_found

	for (let i = 0; i < new_moves.length; i++) {
		let new_move = new_moves[i]
		CHESS.move(new_move)
		let value = alphaBeta(depth - 1, -Infinity, Infinity, !isMaximizingPlayer)
		CHESS.undo()
		if (value >= best_move) {
			best_move = value
			best_move_found = new_move
		}
	}

	return best_move_found
}

function alphaBeta(depth, alpha, beta, isMaximizingPlayer) {
	NODES += 1

	if (depth === 0) {
		return -quiescence(alpha, beta)
	}

	let game_moves = CHESS.moves()

	if (isMaximizingPlayer) {
		let best_move = -Infinity

		for (let i = 0; i < game_moves.length; i++) {
			let move = game_moves[i]
			CHESS.move(move)
			
			best_move = Math.max(best_move, alphaBeta(depth - 1, alpha, beta, !isMaximizingPlayer))

			CHESS.undo()

			alpha = Math.max(alpha, best_move)

			if (beta <= alpha) {
				return best_move
			}
		}

		return best_move
	} else {
		let best_move = Infinity
		
		for (let i = 0; i < game_moves.length; i++) {
			let move = game_moves[i]
			CHESS.move(move)

			best_move = Math.min(best_move, alphaBeta(depth - 1, alpha, beta, !isMaximizingPlayer))

			CHESS.undo(move)

			if (beta <= alpha) {
				return best_move
			}
		}
		return best_move
	}
}


function generateCaptures() {
	let moves = CHESS.moves({ verbose: true })
	// no en passant captures
	let captures = moves.filter(move => { return (move.flags === 'c') })
	let good_captures = captures.filter(capture => { return favorableCapture(capture) })

	return good_captures
}

function favorableCapture(capture) {
	let taker = capture.piece
	let squareTo = capture.to
	let taken = CHESS.get(squareTo).type
	let favorable_capture = false

	if (taker === 'p' && 'nbrqk'.includes(taken) ||
		taker === 'n' && 'brqk'.includes(taken) ||
		taker === 'b' && 'rqk'.includes(taken) ||
		taker === 'r' && 'qk'.includes(taken) ||
		taker === 'q' && 'k'.includes(taken)) {

		favorable_capture = true
	}

	return favorable_capture
}


function quiescence(alpha, beta) {
	NODES += 1

	let value = evaluate(CHESS.board())

	if (value >= beta) {
		return beta
	}

	if (value > alpha) {
		alpha = value
	}

	let good_captures = generateCaptures()

	for (let i = 0; i < good_captures.length; i++) {
		let capture = good_captures[i]

		CHESS.move(capture)
		
		value = -quiescence(-beta, -alpha)

		CHESS.undo()

		if (value >= beta) {
			return beta
		}

		if (value > alpha) {
			alpha = value
		}
	}

	return alpha
}

function evaluate(board) {
    let total_evaluation = 0; for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            total_evaluation = total_evaluation + getPieceValue(board[i][j], i ,j);
        }
    }
    return total_evaluation;
}

function getPieceValue(piece, file, rank) {
	if (piece === null) {
        return 0;
    }

	function getAbsValue(piece) {
	    if (piece.type === 'p') {
            return 100
        } else if (piece.type === 'r') {
            return 500
        } else if (piece.type === 'n') {
            return 300
        } else if (piece.type === 'b') {
            return 325
        } else if (piece.type === 'q') {
            return 1000
        } else if (piece.type === 'k') {
            return 32000
        }
        throw "Unknown piece type: " + piece.type
	}

	let absValue = getAbsValue(piece)

	if (piece.color === 'w') {
		return absValue
	} else {
		return -absValue
	}
}

function inputHandler(event) {
    console.log("event", event)

	// this just clears out any remaining markers from the board
	event.chessboard.removeMarkers(undefined, MARKER_TYPE.dot)

	// if the user picks up a piece, then show the moves
	if (event.type === INPUT_EVENT_TYPE.moveStart) {
		const moves = CHESS.moves({ square: event.square, verbose: true })
		for (const move of moves) {
			event.chessboard.addMarker(move.to, MARKER_TYPE.dot)
		}
		return moves.length > 0
	// once the user drops the piece, then record the move then 
	// the cpu calculates the next move 
	} else if (event.type === INPUT_EVENT_TYPE.moveDone) {
		let result = makeMove(event, { cpu: false } )
		if (result && !CHESS.game_over()) {
			event.chessboard.disableMoveInput()
			event.chessboard.setPosition(CHESS.fen())

			setTimeout(() => {
				makeMove(event, { cpu: true })
				renderHistory(CHESS.history())

				event.chessboard.enableMoveInput(inputHandler, USER_COLOR)
				event.chessboard.setPosition(CHESS.fen()) 
			}, 500)
		} else if (result && CHESS.game_over()) {
			event.chessboard.disableMoveInput()
			event.chessboard.setPosition(CHESS.fen())
			renderHistory(CHESS.history())

			if (CHESS.in_checkmate()) {
				alert('Checkmate!')
			} else if (CHESS.in_draw() || CHESS.in_stalemate() || CHESS.in_threefold_repetition() ) {
				alert('Draw!')
			}
		} 
	}

}

function renderHistory(moves) {
    let historyElement = document.getElementById('pgn')
	historyElement.innerHTML = ""

    for (let i = 0; i < moves.length; i = i + 2) {
        historyElement.append(' ' + moves[i] + ' ' + ( moves[i + 1] ? moves[i + 1] : ' '))
    }
}

BOARD.enableMoveInput(inputHandler, USER_COLOR)

