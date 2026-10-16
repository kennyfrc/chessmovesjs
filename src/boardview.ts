import { Board } from './board.ts'
import { BitHelper, SquareHelper } from './helpers.ts'
import type { PieceBoardList } from './pieceboard.ts'

class BoardView extends Board {
  userView: bigint[]

  constructor (pieceBoardList: PieceBoardList) {
    super()
    this.pieceBoardList = pieceBoardList
    this.bb = this.parsePlToBb(pieceBoardList, this.bb)
    this.userView = this.parseToUserView()
  }

  parsePlToBb (pieceBoardList: PieceBoardList, bb: bigint): bigint {
    if (pieceBoardList) {
      (Object.keys(pieceBoardList) as Array<keyof PieceBoardList>).forEach((piece) => {
        bb |= pieceBoardList[piece].bb
      })
    }
    return bb
  }

  parseToUserView (bb?: bigint): bigint[] {
    const bbToView = bb || this.bb
    const userView: bigint[] = []
    for (let i = 0; i < 64; i++) {
      userView[i] = BitHelper.getBit(bbToView, i)
    }
    return userView
  }

  display (): string {
    return '' +
      this.userView[SquareHelper.for('a8')] + this.userView[SquareHelper.for('b8')] +
      this.userView[SquareHelper.for('c8')] + this.userView[SquareHelper.for('d8')] +
      this.userView[SquareHelper.for('e8')] + this.userView[SquareHelper.for('f8')] +
      this.userView[SquareHelper.for('g8')] + this.userView[SquareHelper.for('h8')] + '\n' +
      this.userView[SquareHelper.for('a7')] + this.userView[SquareHelper.for('b7')] +
      this.userView[SquareHelper.for('c7')] + this.userView[SquareHelper.for('d7')] +
      this.userView[SquareHelper.for('e7')] + this.userView[SquareHelper.for('f7')] +
      this.userView[SquareHelper.for('g7')] + this.userView[SquareHelper.for('h7')] + '\n' +
      this.userView[SquareHelper.for('a6')] + this.userView[SquareHelper.for('b6')] +
      this.userView[SquareHelper.for('c6')] + this.userView[SquareHelper.for('d6')] +
      this.userView[SquareHelper.for('e6')] + this.userView[SquareHelper.for('f6')] +
      this.userView[SquareHelper.for('g6')] + this.userView[SquareHelper.for('h6')] + '\n' +
      this.userView[SquareHelper.for('a5')] + this.userView[SquareHelper.for('b5')] +
      this.userView[SquareHelper.for('c5')] + this.userView[SquareHelper.for('d5')] +
      this.userView[SquareHelper.for('e5')] + this.userView[SquareHelper.for('f5')] +
      this.userView[SquareHelper.for('g5')] + this.userView[SquareHelper.for('h5')] + '\n' +
      this.userView[SquareHelper.for('a4')] + this.userView[SquareHelper.for('b4')] +
      this.userView[SquareHelper.for('c4')] + this.userView[SquareHelper.for('d4')] +
      this.userView[SquareHelper.for('e4')] + this.userView[SquareHelper.for('f4')] +
      this.userView[SquareHelper.for('g4')] + this.userView[SquareHelper.for('h4')] + '\n' +
      this.userView[SquareHelper.for('a3')] + this.userView[SquareHelper.for('b3')] +
      this.userView[SquareHelper.for('c3')] + this.userView[SquareHelper.for('d3')] +
      this.userView[SquareHelper.for('e3')] + this.userView[SquareHelper.for('f3')] +
      this.userView[SquareHelper.for('g3')] + this.userView[SquareHelper.for('h3')] + '\n' +
      this.userView[SquareHelper.for('a2')] + this.userView[SquareHelper.for('b2')] +
      this.userView[SquareHelper.for('c2')] + this.userView[SquareHelper.for('d2')] +
      this.userView[SquareHelper.for('e2')] + this.userView[SquareHelper.for('f2')] +
      this.userView[SquareHelper.for('g2')] + this.userView[SquareHelper.for('h2')] + '\n' +
      this.userView[SquareHelper.for('a1')] + this.userView[SquareHelper.for('b1')] +
      this.userView[SquareHelper.for('c1')] + this.userView[SquareHelper.for('d1')] +
      this.userView[SquareHelper.for('e1')] + this.userView[SquareHelper.for('f1')] +
      this.userView[SquareHelper.for('g1')] + this.userView[SquareHelper.for('h1')]
  }
}

export {
  BoardView
}
