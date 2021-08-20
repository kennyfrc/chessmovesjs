const U64 = require('./helpers.js').U64
// const U64Comp = require('./helpers.js').U64Comp
// const U64Neg = require('./helpers.js').U64Neg
const ViewHelper = require('./helpers.js').ViewHelper

class Mask {
  // basic Mask
  static northOne (bb) {
    return bb << U64(8)
  }

  static northEastOne (bb) {
    return bb << U64(9)
  }

  static eastOne (bb) {
    return bb << U64(1)
  }

  static southEastOne (bb) {
    return bb >> U64(7)
  }

  static southOne (bb) {
    return bb >> U64(8)
  }

  static southWestOne (bb) {
    return bb >> U64(9)
  }

  static westOne (bb) {
    return bb >> U64(1)
  }

  static northWestOne (bb) {
    return bb << U64(7)
  }

  // king moves
  static mooreNeighborhood (bb) {
    return Mask.northOne(bb) | Mask.northEastOne(bb) |
      Mask.eastOne(bb) | Mask.southEastOne(bb) | Mask.southOne(bb) |
      Mask.southWestOne(bb) | Mask.westOne(bb) | Mask.northWestOne(bb)
  }

  // knight moves
  static noNoEast (bb) {
    return bb << U64(17)
  }

  static noEaEast (bb) {
    return bb << U64(10)
  }

  static soEaEast (bb) {
    return bb >> U64(6)
  }

  static soSoEast (bb) {
    return bb >> U64(15)
  }

  static noNoWest (bb) {
    return bb << U64(15)
  }

  static noWeWest (bb) {
    return bb << U64(6)
  }

  static soWeWest (bb) {
    return bb >> U64(10)
  }

  static soSoWest (bb) {
    return bb >> U64(17)
  }
}

module.exports = {
  Mask: Mask
}
