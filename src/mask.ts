import { U64 } from './helpers.ts'

// left shifts are truncated so bitboards never grow past 64 bits
class Mask {
  // basic Mask
  static northOne (bb: bigint): bigint {
    return U64(bb << 8n)
  }

  static northEastOne (bb: bigint): bigint {
    return U64(bb << 9n)
  }

  static eastOne (bb: bigint): bigint {
    return U64(bb << 1n)
  }

  static southEastOne (bb: bigint): bigint {
    return bb >> 7n
  }

  static southOne (bb: bigint): bigint {
    return bb >> 8n
  }

  static southWestOne (bb: bigint): bigint {
    return bb >> 9n
  }

  static westOne (bb: bigint): bigint {
    return bb >> 1n
  }

  static northWestOne (bb: bigint): bigint {
    return U64(bb << 7n)
  }

  // king moves
  static mooreNeighborhood (bb: bigint): bigint {
    return Mask.northOne(bb) | Mask.northEastOne(bb) |
      Mask.eastOne(bb) | Mask.southEastOne(bb) | Mask.southOne(bb) |
      Mask.southWestOne(bb) | Mask.westOne(bb) | Mask.northWestOne(bb)
  }

  // knight moves
  static noNoEast (bb: bigint): bigint {
    return U64(bb << 17n)
  }

  static noEaEast (bb: bigint): bigint {
    return U64(bb << 10n)
  }

  static soEaEast (bb: bigint): bigint {
    return bb >> 6n
  }

  static soSoEast (bb: bigint): bigint {
    return bb >> 15n
  }

  static noNoWest (bb: bigint): bigint {
    return U64(bb << 15n)
  }

  static noWeWest (bb: bigint): bigint {
    return U64(bb << 6n)
  }

  static soWeWest (bb: bigint): bigint {
    return bb >> 10n
  }

  static soSoWest (bb: bigint): bigint {
    return bb >> 17n
  }
}

export {
  Mask
}
