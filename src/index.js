import { Chess } from "chess.js"
import { INPUT_EVENT_TYPE, COLOR, Chessboard, MARKER_TYPE } from "cm-chessboard"

// INPUT_EVENT_TYPE covers moveStart (user started move input), moveEnd (ended move input), and moveCanceled (user canceled by clicking outside of the board)
// COLOR is just 'w' and 'b'
// MARKER_TYPE covers frame, square, dot, and circle

const chess = new Chess()

const board = new Chessboard(document.getElementById("board"), {
    position: "start"
})

// calculates a random move
function randomMove(game) {
    let new_game_moves = game.moves({ verbose: true });
	let game_move = new_game_moves[Math.floor(Math.random() * new_game_moves.length)]
   	
	game_move.promotion = 'q'

	return game_move
}

function inputHandler(event) {
    console.log("event", event)

	// this just clears out any remaining markers from the board
	event.chessboard.removeMarkers(undefined, MARKER_TYPE.dot)

	// if the user picks up a piece, then show the moves
	if (event.type === INPUT_EVENT_TYPE.moveStart) {
		const moves = chess.moves({ square: event.square, verbose: true })
		for (const move of moves) {
			event.chessboard.addMarker(move.to, MARKER_TYPE.dot)
		}
		return moves.length > 0
	// once the user drops the piece, then record the move then 
	// the cpu calculates the next move 
	} else if (event.type === INPUT_EVENT_TYPE.moveDone) {
		const move = { from: event.squareFrom, to: event.squareTo, promotion: 'q' }
		const result = chess.move(move)
		if (result && !chess.game_over()) {
			event.chessboard.disableMoveInput()
			event.chessboard.setPosition(chess.fen())
			const random_move = randomMove(chess)
			setTimeout(() => {
				chess.move({from: random_move.from, to: random_move.to})
				event.chessboard.enableMoveInput(inputHandler, player)
				event.chessboard.setPosition(chess.fen())
			}, 500)
		} else if (chess.game_over()) {
			event.chessboard.disableMoveInput()
			event.chessboard.setPosition(chess.fen())
			
			if (chess.in_checkmate()) {
				alert('Checkmate!')
			} else if (chess.in_draw() || chess.in_stalemate() || chess.in_threefold_repetition() ) {
				alert('Draw!')
			}
		}
	}

}

const player = COLOR.white

board.enableMoveInput(inputHandler, player)

