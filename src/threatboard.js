const Pieces = require('./pieces.js').Pieces
const BitHelper = require('./helpers.js').BitHelper
const SquareHelper = require('./helpers.js').SquareHelper
const Direction = require('./attack.js').Direction
const ViewHelper = require('./helpers.js').ViewHelper
// const PieceStatus = require('./pieces.js').PieceStatus
// const BoardProxy = require('./boardproxy.js').BoardProxy
const Mask = require('./mask.js').Mask
const Ray = require('./attack.js').Ray

class ThreatBoard {
  static for (byPieceOrSide = 'all', board) {
    return this.threats(byPieceOrSide, board)
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
            const kingSourceSq = BitHelper.bitScanFwd(ourKingBb)
            const theirPinnersAttacks = ((attacks & ourKingBb) !== 0n) ? attacks : 0n            
            const pinnerDirectionFromKing = Mask.mooreNeighborhood(ourKingBb) & theirPinnersAttacks
            const sqThatPointsToPinner = BitHelper.bitScanRev(pinnerDirectionFromKing)
            const pinnerRay = Ray.for(kingSourceSq, sqThatPointsToPinner, theyOccupied)
            board.theirKingPinnerBb |= ((attacks & ourKingBb) !== 0n) ? pieceBb : 0n
            board.theirPinnersRay |= pinnerRay
          } else {
            const theirKingBb = board.whiteToMove ? board.blackKingBb : board.whiteKingBb
            const weOccupied = board.whiteToMove ? board.whiteBb : board.blackBb
            const kingSourceSq = BitHelper.bitScanFwd(theirKingBb)       
            const ourPinnersAttacks = ((attacks & theirKingBb) !== 0n) ? attacks : 0n            
            const pinnerDirectionFromKing = Mask.mooreNeighborhood(ourKingBb) & ourPinnersAttacks
            const sqThatPointsToPinner = BitHelper.bitScanRev(pinnerDirectionFromKing)
            const pinnerRay = Ray.for(kingSourceSq, sqThatPointsToPinner, ourOccupied)
            board.ourKingPinnerBb |= ((attacks & theirKingBb) !== 0n) ? pieceBb : 0n
            board.ourPinnersRay |= pinnerRay
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
