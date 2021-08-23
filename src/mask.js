const ViewHelper = require('./helpers.js').ViewHelper

class Mask {
  // basic Mask
  static northOne (bb) {
    return bb << 8n
  }

  static northEastOne (bb) {
    return bb << 9n
  }

  static eastOne (bb) {
    return bb << 1n
  }

  static southEastOne (bb) {
    return bb >> 7n
  }

  static southOne (bb) {
    return bb >> 8n
  }

  static southWestOne (bb) {
    return bb >> 9n
  }

  static westOne (bb) {
    return bb >> 1n
  }

  static northWestOne (bb) {
    return bb << 7n
  }

  // king moves
  static mooreNeighborhood (bb) {
    return Mask.northOne(bb) | Mask.northEastOne(bb) |
      Mask.eastOne(bb) | Mask.southEastOne(bb) | Mask.southOne(bb) |
      Mask.southWestOne(bb) | Mask.westOne(bb) | Mask.northWestOne(bb)
  }

  // knight moves
  static noNoEast (bb) {
    return bb << 17n
  }

  static noEaEast (bb) {
    return bb << 10n
  }

  static soEaEast (bb) {
    return bb >> 6n
  }

  static soSoEast (bb) {
    return bb >> 15n
  }

  static noNoWest (bb) {
    return bb << 15n
  }

  static noWeWest (bb) {
    return bb << 6n
  }

  static soWeWest (bb) {
    return bb >> 10n
  }

  static soSoWest (bb) {
    return bb >> 17n
  }
}

module.exports = {
  Mask: Mask
}
