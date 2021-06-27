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

// calculates a random move
function randomMove() {
    let new_game_moves = CHESS.moves({ verbose: true })
	let game_move = new_game_moves[Math.floor(Math.random() * new_game_moves.length)]

	return game_move
}

function getBestMove() {
	let move = randomMove()
	return move
}

function userMove(event) {
	return { from: event.squareFrom, to: event.squareTo, promotion: 'q' }
}

function makeMove(event, player={ cpu: false }) {
	let move

	if (player.cpu) {
		move = getBestMove()
	} else {
		move = userMove(event) 
	}
	
	if (move) {
		CHESS.move(move)
		return move
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
		let result = makeMove(event)
		if (result && !CHESS.game_over()) {
			event.chessboard.disableMoveInput()
			event.chessboard.setPosition(CHESS.fen())
			makeMove(event, { cpu: true })
			renderHistory(CHESS.history())

			setTimeout(() => {
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

