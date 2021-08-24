const Pieces = require('./pieces.js').Pieces
const BitHelper = require('./helpers.js').BitHelper
const SquareHelper = require('./helpers.js').SquareHelper
const Direction = require('./attack.js').Direction
const ViewHelper = require('./helpers.js').ViewHelper
// const PieceStatus = require('./pieces.js').PieceStatus
// const BoardProxy = require('./boardproxy.js').BoardProxy
const Mask = require('./mask.js').Mask
const Ray = require('./attack.js').Ray

class Pin {
  constructor(pieceBb, pinnerRay, blockerCount, kingPinnerBb) {
    this.pieceBb = pieceBb
    this.pinnerRay = pinnerRay
    this.blockerCount = blockerCount
    this.kingPinnerBb = kingPinnerBb
  }
}

class ThreatBoard {
  static for (byPieceOrSide = 'all', board, xRaysToUs) {
    return this.threats(byPieceOrSide, board, xRaysToUs)
  }

  static threats (byPieceOrSide, board, xRaysToUs=true) {
    return Pieces.for(byPieceOrSide)
      .map((fenPiece) => board.pieceBoardList[fenPiece])
      .map((pieceBoard) => SquareHelper.indicesFor(pieceBoard.bb)
        .map((sq) => BitHelper.setBit(0n, sq))
        .map((pieceBb) => { 
          // looks messy - saves pins & returns attacks
          // should there be some sort of 'attack setter function?' but we are in it..
          const attacks = pieceBoard.attacks(pieceBb, board)
          if (xRaysToUs) {
            const ourKingBb = board.whiteToMove ? board.whiteKingBb : board.blackKingBb
            const theyOccupied = board.whiteToMove ? board.blackBb : board.whiteBb
            const weOccupied = board.whiteToMove ? board.whiteBb : board.blackBb
            const kingSourceSq = BitHelper.bitScanFwd(ourKingBb)
            const kingPinnerBb = ((attacks & ourKingBb) !== 0n) ? pieceBb : 0n
            const pinnerRay = Ray.seek(kingSourceSq, kingPinnerBb, theyOccupied)
            if (pinnerRay !== 0n) {
              const blockersFromOurKing = BitHelper.popCount((pinnerRay ^ kingPinnerBb) & weOccupied)
              board.ourPinList.push(new Pin(pieceBb, pinnerRay, blockersFromOurKing,kingPinnerBb)) 
            }
          } else {
            const theirKingBb = board.whiteToMove ? board.blackKingBb : board.whiteKingBb
            const theyOccupied = board.whiteToMove ? board.blackBb : board.whiteBb
            const weOccupied = board.whiteToMove ? board.whiteBb : board.blackBb
            const kingSourceSq = BitHelper.bitScanFwd(theirKingBb)
            const kingPinnerBb = ((attacks & theirKingBb) !== 0n) ? pieceBb : 0n
            const pinnerRay = Ray.seek(kingSourceSq, kingPinnerBb, weOccupied)
            if (pinnerRay !== 0n) {
              const blockersFromTheirKing = BitHelper.popCount((pinnerRay ^ kingPinnerBb) & theyOccupied)
              board.theirPinList.push(new Pin(pieceBb, pinnerRay, blockersFromTheirKing, kingPinnerBb)) 
            }
          }
          return attacks
        })
        .reduce((accThreats, currThreats) => accThreats | currThreats, 0n))
      .reduce((accThreats, currThreats) => accThreats | currThreats, 0n)
  }
}

module.exports = {
  ThreatBoard: ThreatBoard
}
