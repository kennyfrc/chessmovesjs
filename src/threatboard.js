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
    let count = 0
    return Pieces.for(byPieceOrSide)
      .map((fenPiece) => board.pieceBoardList[fenPiece])
      .map((pieceBoard) => SquareHelper.indicesFor(pieceBoard.bb)
        .map((sq) => BitHelper.setBit(0n, sq))
        .map((pieceBb) => { 
          // looks messy - saves pins & returns attacks
          // should there be some sort of 'attack setter function?' but we are in it..
          let attacks = pieceBoard.attacks(pieceBb, board)
          let rayBehindKing = 0n
          if (xRaysToUs) {
            const ourKingBb = board.whiteToMove ? board.whiteKingBb : board.blackKingBb
            const theyOccupied = board.whiteToMove ? board.blackBb : board.whiteBb
            const weOccupied = board.whiteToMove ? board.whiteBb : board.blackBb
            const kingSourceSq = BitHelper.bitScanFwd(ourKingBb)
            const kingPinnerBb = ((attacks & ourKingBb) !== 0n) ? pieceBb : 0n
            if (kingPinnerBb !== 0n) {
              const pinnerRay = Ray.seek(kingSourceSq, kingPinnerBb, theyOccupied)
              rayBehindKing = Ray.seek(kingSourceSq, kingPinnerBb, board.bb, true)
              const blockersFromOurKing = BitHelper.popCount((pinnerRay ^ kingPinnerBb) & weOccupied)
              const blockersBehindOurKing = BitHelper.popCount(rayBehindKing & theyOccupied)
              if (blockersFromOurKing === 1 && (pinnerRay !== 0n)) {
                board.ourPinList.push(new Pin(pieceBb, pinnerRay, blockersFromOurKing, kingPinnerBb))
              }
              if (blockersBehindOurKing === 1) {
                if (board.whiteToMove) {
                  board.rayBehindWhiteKing |= rayBehindKing
                } else {
                  board.rayBehindBlackKing |= rayBehindKing
                }
              }
              if (blockersFromOurKing === 0 && (pinnerRay !== 0n)) {
                board.theirCheckerRay |= pinnerRay
              }
            }
          } else {
            const theirKingBb = board.whiteToMove ? board.blackKingBb : board.whiteKingBb
            const theyOccupied = board.whiteToMove ? board.blackBb : board.whiteBb
            const weOccupied = board.whiteToMove ? board.whiteBb : board.blackBb
            const kingSourceSq = BitHelper.bitScanFwd(theirKingBb)
            const kingPinnerBb = ((attacks & theirKingBb) !== 0n) ? pieceBb : 0n
            if (kingPinnerBb !== 0n) {
              const pinnerRay = Ray.seek(kingSourceSq, kingPinnerBb, weOccupied)
              rayBehindKing = Ray.seek(kingSourceSq, kingPinnerBb, board.bb, true)
              const blockersFromTheirKing = BitHelper.popCount((pinnerRay ^ kingPinnerBb) & theyOccupied)
              const blockersBehindTheirKing = BitHelper.popCount(rayBehindKing & weOccupied)
              if (blockersFromTheirKing === 1 && (pinnerRay !== 0n)) {
                board.theirPinList.push(new Pin(pieceBb, pinnerRay, blockersFromTheirKing, kingPinnerBb))   
              }
              if (blockersBehindTheirKing === 1) {
                if (board.whiteToMove) {
                  board.rayBehindBlackKing |= rayBehindKing
                } else {
                  board.rayBehindWhiteKing |= rayBehindKing
                }
              }
              if (blockersFromTheirKing === 0 && (pinnerRay !== 0n)) {
                board.ourCheckerRay |= pinnerRay
              }
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
