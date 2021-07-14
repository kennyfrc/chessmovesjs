const Board = require('./board.js').Board
const BitHelper = require('./helpers.js').BitHelper
const Square = require('../src/square.js').Square

class BoardView extends Board {
    constructor(pieceBoards) {
        super()
        this.userView = []
        this.pieceBoards = pieceBoards

        Object.keys(pieceBoards).forEach(piece => {
            this.bb |=  pieceBoards[piece]
        })

        for (let i = 0; i < 64; i++) {
            this.userView[i] = BitHelper.getBit(this.bb, i)
        }
    }

    display() {
        return `${this.userView[Square.for('A8')]}${this.userView[Square.for('B8')]}${this.userView[Square.for('C8')]}${this.userView[Square.for('D8')]}${this.userView[Square.for('E8')]}${this.userView[Square.for('F8')]}${this.userView[Square.for('G8')]}${this.userView[Square.for('H8')]}\n${this.userView[Square.for('A7')]}${this.userView[Square.for('B7')]}${this.userView[Square.for('C7')]}${this.userView[Square.for('D7')]}${this.userView[Square.for('E7')]}${this.userView[Square.for('F7')]}${this.userView[Square.for('G7')]}${this.userView[Square.for('H7')]}\n${this.userView[Square.for('A6')]}${this.userView[Square.for('B6')]}${this.userView[Square.for('C6')]}${this.userView[Square.for('D6')]}${this.userView[Square.for('E6')]}${this.userView[Square.for('F6')]}${this.userView[Square.for('G6')]}${this.userView[Square.for('H6')]}\n${this.userView[Square.for('A5')]}${this.userView[Square.for('B5')]}${this.userView[Square.for('C5')]}${this.userView[Square.for('D5')]}${this.userView[Square.for('E5')]}${this.userView[Square.for('F5')]}${this.userView[Square.for('G5')]}${this.userView[Square.for('H5')]}\n${this.userView[Square.for('A4')]}${this.userView[Square.for('B4')]}${this.userView[Square.for('C4')]}${this.userView[Square.for('D4')]}${this.userView[Square.for('E4')]}${this.userView[Square.for('F4')]}${this.userView[Square.for('G4')]}${this.userView[Square.for('H4')]}\n${this.userView[Square.for('A3')]}${this.userView[Square.for('B3')]}${this.userView[Square.for('C3')]}${this.userView[Square.for('D3')]}${this.userView[Square.for('E3')]}${this.userView[Square.for('F3')]}${this.userView[Square.for('G3')]}${this.userView[Square.for('H3')]}\n${this.userView[Square.for('A2')]}${this.userView[Square.for('B2')]}${this.userView[Square.for('C2')]}${this.userView[Square.for('D2')]}${this.userView[Square.for('E2')]}${this.userView[Square.for('F2')]}${this.userView[Square.for('G2')]}${this.userView[Square.for('H2')]}\n${this.userView[Square.for('A1')]}${this.userView[Square.for('B1')]}${this.userView[Square.for('C1')]}${this.userView[Square.for('D1')]}${this.userView[Square.for('E1')]}${this.userView[Square.for('F1')]}${this.userView[Square.for('G1')]}${this.userView[Square.for('H1')]}`
    }

    displayPiece(fen_char) {
        let filtered_pieceBoards = this.#filter(fen_char)

        return new BoardView(filtered_pieceBoards).display()
    }

    #filter(fen_char) {
        let filteredPieceboard = {}
        Object.entries(this.pieceBoards).forEach(pieceBoard => {
            if (pieceBoard[0] == fen_char) {
                filteredPieceboard[pieceBoard[0]] = pieceBoard[1]
            }
        })
        return filteredPieceboard
    }
}

module.exports = {
    BoardView: BoardView,
}