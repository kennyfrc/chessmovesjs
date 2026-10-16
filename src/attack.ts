import { BitHelper, BoardHelper } from './helpers.ts'
import { Mask } from './mask.ts'
import { ROOK_MAGICS, BISHOP_MAGICS } from './magic.ts'

/**
 * RayCompass
 *
 * noWe         nort         noEa
 *         +7    +8    +9
 *             \  |  /
 * west    -1 <-  0 -> +1    east
 *             /  |  \
 *         -9    -8    -7
 * soWe         sout         soEa
 *
 * Steps below are [rank, file] pairs on that compass.
 **/
type Step = readonly [number, number]

const ROOK_STEPS: readonly Step[] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const BISHOP_STEPS: readonly Step[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
const QUEEN_STEPS = ROOK_STEPS.concat(BISHOP_STEPS)
const KNIGHT_STEPS: readonly Step[] = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]]

const TABLE_SCRATCH = new BigUint64Array(2)
const TABLE_SCRATCH32 = new Int32Array(TABLE_SCRATCH.buffer)
const MAGIC_SCRATCH = new BigUint64Array(1)
const MAGIC_SCRATCH32 = new Int32Array(MAGIC_SCRATCH.buffer)

// builds the lookup tables once, when this module loads
class AttackTables {
  static isOnBoard (rank: number, file: number): boolean {
    return rank >= 0 && rank < 8 && file >= 0 && file < 8
  }

  static squares (): BigUint64Array {
    const table = new BigUint64Array(64)
    for (let sq = 0; sq < 64; sq++) {
      table[sq] = 1n << BigInt(sq)
    }
    return table
  }

  static leaper (steps: readonly Step[]): BigUint64Array {
    const table = new BigUint64Array(64)
    for (let sq = 0; sq < 64; sq++) {
      for (const [dRank, dFile] of steps) {
        const rank = (sq >> 3) + dRank
        const file = (sq & 7) + dFile
        if (AttackTables.isOnBoard(rank, file)) {
          table[sq]! |= SQUARE_BB[rank * 8 + file]!
        }
      }
    }
    return table
  }

  // white pawn attacks for squares 0-63, black for 64-127
  static pawns (): BigUint64Array {
    const table = new BigUint64Array(128)
    table.set(AttackTables.leaper([[1, 1], [1, -1]]), 0)
    table.set(AttackTables.leaper([[-1, 1], [-1, -1]]), 64)
    return table
  }

  /**
   * Squares a slider sees from sq. Stops at the first square whose bit
   * is set in occupied[occIdx]. With skipEdges, the last square of each
   * ray is left out, which gives the relevant occupancy mask.
   */
  static slide (out: BigUint64Array, outIdx: number, sq: number, steps: readonly Step[],
    occupied: BigUint64Array | null, occIdx: number, skipEdges: boolean): void {
    out[outIdx] = 0n
    for (const [dRank, dFile] of steps) {
      let rank = (sq >> 3) + dRank
      let file = (sq & 7) + dFile
      while (AttackTables.isOnBoard(rank, file)) {
        if (skipEdges && !AttackTables.isOnBoard(rank + dRank, file + dFile)) { break }
        const to = rank * 8 + file
        out[outIdx] = out[outIdx] | SQUARE_BB[to]!
        if (occupied !== null && AttackTables.isSet(occupied, occIdx, to)) { break }
        rank += dRank
        file += dFile
      }
    }
  }

  static isSet (bbs: BigUint64Array, idx: number, sq: number): boolean {
    TABLE_SCRATCH[0] = bbs[idx]! & SQUARE_BB[sq]!
    return (TABLE_SCRATCH32[0]! | TABLE_SCRATCH32[1]!) !== 0
  }

  static emptyBoardRays (steps: readonly Step[]): BigUint64Array {
    const table = new BigUint64Array(64)
    for (let sq = 0; sq < 64; sq++) {
      AttackTables.slide(table, sq, sq, steps, null, 0, false)
    }
    return table
  }

  static masks (steps: readonly Step[]): BigUint64Array {
    const table = new BigUint64Array(64)
    for (let sq = 0; sq < 64; sq++) {
      AttackTables.slide(table, sq, sq, steps, null, 0, true)
    }
    return table
  }

  // the magic index keeps the top bits of the product; the shift is for its high word
  static shifts (masks: BigUint64Array): Int32Array {
    const shifts = new Int32Array(64)
    for (let sq = 0; sq < 64; sq++) {
      shifts[sq] = 32 - BitHelper.popCount(masks[sq]!)
    }
    return shifts
  }

  static offsets (shifts: Int32Array): Int32Array {
    const offsets = new Int32Array(65)
    for (let sq = 0; sq < 64; sq++) {
      offsets[sq + 1] = offsets[sq]! + (1 << (32 - shifts[sq]!))
    }
    return offsets
  }

  static sliderTable (steps: readonly Step[], masks: BigUint64Array, magics: BigUint64Array,
    shifts: Int32Array, offsets: Int32Array): BigUint64Array {
    const table = new BigUint64Array(offsets[64])
    const subsets = new BigUint64Array(1 << 12)
    for (let sq = 0; sq < 64; sq++) {
      const size = 1 << (32 - shifts[sq]!)
      // carry-rippler: walk every subset of the mask
      for (let i = 1; i < size; i++) {
        subsets[i] = (subsets[i - 1]! - masks[sq]!) & masks[sq]!
      }
      for (let i = 0; i < size; i++) {
        MAGIC_SCRATCH[0] = subsets[i]! * magics[sq]!
        AttackTables.slide(table, offsets[sq]! + (MAGIC_SCRATCH32[1]! >>> shifts[sq]!), sq, steps, subsets, i, false)
      }
    }
    return table
  }

  /**
   * between[a * 64 + b]: squares strictly between two aligned squares
   * line[a * 64 + b]: the whole rank, file or diagonal through both
   * Both are empty when a and b are not aligned.
   */
  static lines (between: BigUint64Array, line: BigUint64Array): void {
    for (let from = 0; from < 64; from++) {
      for (const [dRank, dFile] of QUEEN_STEPS) {
        AttackTables.slide(TABLE_SCRATCH, 1, from, [[dRank, dFile], [-dRank, -dFile]], null, 0, false)
        TABLE_SCRATCH[1] = TABLE_SCRATCH[1]! | SQUARE_BB[from]!
        let path = 0n
        let rank = (from >> 3) + dRank
        let file = (from & 7) + dFile
        while (AttackTables.isOnBoard(rank, file)) {
          const to = rank * 8 + file
          between[from * 64 + to] = path
          line[from * 64 + to] = TABLE_SCRATCH[1]
          path |= SQUARE_BB[to]!
          rank += dRank
          file += dFile
        }
      }
    }
  }
}

const SQUARE_BB = AttackTables.squares()
const KNIGHT_ATTACKS = AttackTables.leaper(KNIGHT_STEPS)
const KING_ATTACKS = AttackTables.leaper(QUEEN_STEPS)
const PAWN_ATTACKS = AttackTables.pawns()
const ROOK_RAYS = AttackTables.emptyBoardRays(ROOK_STEPS)
const BISHOP_RAYS = AttackTables.emptyBoardRays(BISHOP_STEPS)

const ROOK_MASKS = AttackTables.masks(ROOK_STEPS)
const ROOK_MAGIC_BBS = new BigUint64Array(ROOK_MAGICS)
const ROOK_SHIFTS = AttackTables.shifts(ROOK_MASKS)
const ROOK_OFFSETS = AttackTables.offsets(ROOK_SHIFTS)
const ROOK_TABLE = AttackTables.sliderTable(ROOK_STEPS, ROOK_MASKS, ROOK_MAGIC_BBS, ROOK_SHIFTS, ROOK_OFFSETS)

const BISHOP_MASKS = AttackTables.masks(BISHOP_STEPS)
const BISHOP_MAGIC_BBS = new BigUint64Array(BISHOP_MAGICS)
const BISHOP_SHIFTS = AttackTables.shifts(BISHOP_MASKS)
const BISHOP_OFFSETS = AttackTables.offsets(BISHOP_SHIFTS)
const BISHOP_TABLE = AttackTables.sliderTable(BISHOP_STEPS, BISHOP_MASKS, BISHOP_MAGIC_BBS, BISHOP_SHIFTS, BISHOP_OFFSETS)

const BETWEEN = new BigUint64Array(64 * 64)
const LINE = new BigUint64Array(64 * 64)
AttackTables.lines(BETWEEN, LINE)

class Ray {
  // magic bitboards: (occupied & mask) * magic, then the top bits index the table
  static rookAttacks (sq: number, occupied: bigint): bigint {
    MAGIC_SCRATCH[0] = (occupied & ROOK_MASKS[sq]!) * ROOK_MAGIC_BBS[sq]!
    return ROOK_TABLE[ROOK_OFFSETS[sq]! + (MAGIC_SCRATCH32[1]! >>> ROOK_SHIFTS[sq]!)]!
  }

  static bishopAttacks (sq: number, occupied: bigint): bigint {
    MAGIC_SCRATCH[0] = (occupied & BISHOP_MASKS[sq]!) * BISHOP_MAGIC_BBS[sq]!
    return BISHOP_TABLE[BISHOP_OFFSETS[sq]! + (MAGIC_SCRATCH32[1]! >>> BISHOP_SHIFTS[sq]!)]!
  }

  /**
   * The same lookups, reading the occupancy from occ[occIdx] and writing
   * the attacks to out[outIdx]. A BigInt passed to or returned from a call
   * that V8 does not inline gets boxed on the heap; typed array slots never do.
   */
  static setRookAttacks (out: BigUint64Array, outIdx: number, sq: number, occ: BigUint64Array, occIdx: number): void {
    MAGIC_SCRATCH[0] = (occ[occIdx]! & ROOK_MASKS[sq]!) * ROOK_MAGIC_BBS[sq]!
    out[outIdx] = ROOK_TABLE[ROOK_OFFSETS[sq]! + (MAGIC_SCRATCH32[1]! >>> ROOK_SHIFTS[sq]!)]!
  }

  static setBishopAttacks (out: BigUint64Array, outIdx: number, sq: number, occ: BigUint64Array, occIdx: number): void {
    MAGIC_SCRATCH[0] = (occ[occIdx]! & BISHOP_MASKS[sq]!) * BISHOP_MAGIC_BBS[sq]!
    out[outIdx] = BISHOP_TABLE[BISHOP_OFFSETS[sq]! + (MAGIC_SCRATCH32[1]! >>> BISHOP_SHIFTS[sq]!)]!
  }

  static queenAttacks (sq: number, occupied: bigint): bigint {
    return BigInt.asUintN(64, Ray.rookAttacks(sq, occupied) | Ray.bishopAttacks(sq, occupied))
  }

  static between (from: number, to: number): bigint {
    return BETWEEN[from * 64 + to]!
  }

  static line (from: number, to: number): bigint {
    return LINE[from * 64 + to]!
  }
}

// bitboard-in, bitboard-out helpers, used to describe moves (checks, threats)
class Direction {
  static wSinglePush (bb: bigint, emptySq: bigint): bigint {
    return Mask.northOne(bb) & emptySq
  }

  static wDoublePush (bb: bigint, emptySq: bigint): bigint {
    const singlePushBb = this.wSinglePush(bb, emptySq)
    return Mask.northOne(singlePushBb) & emptySq & BoardHelper.fourthRank()
  }

  static bSinglePush (bb: bigint, emptySq: bigint): bigint {
    return Mask.southOne(bb) & emptySq
  }

  static bDoublePush (bb: bigint, emptySq: bigint): bigint {
    const singlePushBb = this.bSinglePush(bb, emptySq)
    return Mask.southOne(singlePushBb) & emptySq & BoardHelper.fifthRank()
  }

  static wPawnAttacks (bb: bigint): bigint {
    return (Mask.northWestOne(bb & ~(BoardHelper.aFile())) |
     Mask.northEastOne(bb & ~(BoardHelper.hFile())))
  }

  static bPawnAttacks (bb: bigint): bigint {
    return (Mask.southWestOne(bb & ~(BoardHelper.aFile())) |
     Mask.southEastOne(bb & ~(BoardHelper.hFile())))
  }

  static knightAttacks (bb: bigint): bigint {
    return Mask.noNoEast(bb & ~((BoardHelper.hFile()) | BoardHelper.seventhRank() | BoardHelper.eighthRank())) |
      Mask.noEaEast(bb & ~((BoardHelper.gFile()) | BoardHelper.hFile() | BoardHelper.eighthRank())) |
      Mask.soEaEast(bb & ~((BoardHelper.gFile()) | BoardHelper.hFile() | BoardHelper.firstRank())) |
      Mask.soSoEast(bb & ~((BoardHelper.hFile()) | BoardHelper.firstRank() | BoardHelper.secondRank())) |
      Mask.noNoWest(bb & ~((BoardHelper.aFile()) | BoardHelper.seventhRank() | BoardHelper.eighthRank())) |
      Mask.noWeWest(bb & ~((BoardHelper.aFile()) | BoardHelper.bFile() | BoardHelper.eighthRank())) |
      Mask.soWeWest(bb & ~((BoardHelper.aFile()) | BoardHelper.bFile() | BoardHelper.firstRank())) |
      Mask.soSoWest(bb & ~((BoardHelper.aFile()) | BoardHelper.firstRank() | BoardHelper.secondRank()))
  }

  static bishopRays (bb: bigint, occupied: bigint, occupiable: bigint): bigint {
    return Ray.bishopAttacks(BitHelper.bitScanFwd(bb), occupied) & occupiable
  }

  static rookRays (bb: bigint, occupied: bigint, occupiable: bigint): bigint {
    return Ray.rookAttacks(BitHelper.bitScanFwd(bb), occupied) & occupiable
  }

  static queenRays (bb: bigint, occupied: bigint, occupiable: bigint): bigint {
    return this.rookRays(bb, occupied, occupiable) | this.bishopRays(bb, occupied, occupiable)
  }
}

export {
  Ray,
  Direction,
  SQUARE_BB,
  KNIGHT_ATTACKS,
  KING_ATTACKS,
  PAWN_ATTACKS,
  ROOK_RAYS,
  BISHOP_RAYS,
  BETWEEN,
  LINE
}
