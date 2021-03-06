const assert = require('assert')
const Engine = require('../src/engine.js').Engine

Error.stackTraceLimit = 10

describe('perft', function () {
  it('startpos', function () {
    const engine = new Engine('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')

    assert.equal(engine.perft(1), 20)
    assert.equal(engine.perft(2), 400)
    assert.equal(engine.perft(3), 8902)
    // assert.equal(engine.perft(4), 197281)
    // assert.equal(engine.perft(5), 4865609)
  }).timeout(30000000)

  it('kiwipete', function () {
    const engine = new Engine('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - ')

    assert.equal(engine.perft(1), 48)
    assert.equal(engine.perft(2), 2039)
    assert.equal(engine.perft(3), 97862)
    // assert.equal(engine.perft(4), 4085603)
    // assert.equal(engine.perft(5), 193690690)
  }).timeout(30000000)

  it('edwards', function () {
    const engine = new Engine('r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10 ')

    assert.equal(engine.perft(1), 46)
    assert.equal(engine.perft(2), 2079)
    assert.equal(engine.perft(3), 89890)
    // assert.equal(engine.perft(4), 3894594)
    // assert.equal(engine.perft(5), 89941194)
  }).timeout(30000000)

  it('maughan 1', function () {
    const engine = new Engine('8/3k4/8/4b3/1p1p1p2/8/1PPRP2K/8 w - -')

    assert.equal(engine.perft(1), 12)
    assert.equal(engine.perft(2), 197)
    assert.equal(engine.perft(3), 2696)
    // assert.equal(engine.perft(4), 41622)
    // assert.equal(engine.perft(5), 626367)
  }).timeout(30000000)

  it('maughan 2', function () {
    const engine = new Engine('8/4rP2/8/8/4pk2/8/3P2PP/4K2R w K -')

    assert.equal(engine.perft(1), 17)
    assert.equal(engine.perft(2), 182)
    assert.equal(engine.perft(3), 3232)
    // assert.equal(engine.perft(4), 42552)
    // assert.equal(engine.perft(5), 802123)
  }).timeout(30000000)

  it('ibid 1', function () {
    const engine = new Engine('rnb1kbnr/pp1ppppp/8/8/q1p4K/5P2/PPPPP1PP/RNBQ1BNR w kq - 2 5')

    assert.equal(engine.perft(1), 21)
    assert.equal(engine.perft(2), 607)
    assert.equal(engine.perft(3), 12644)
    // assert.equal(engine.perft(4), 386433)
    // assert.equal(engine.perft(5), 8502334)
  }).timeout(30000000)

  it('ibid 2', function () {
    const engine = new Engine('rnbq1bnr/pppp1ppp/3kp3/3P4/1B6/8/PPP1PPPP/RN1QKBNR b KQ - 2 4')

    assert.equal(engine.perft(1), 2)
    assert.equal(engine.perft(2), 63)
    assert.equal(engine.perft(3), 1721)
    // assert.equal(engine.perft(4), 54440)
    // assert.equal(engine.perft(5), 1477963)
  }).timeout(30000000)

  it('marcelk', function () {
    const engine = new Engine('rnb1kb1r/1p1p1ppp/p1p2n2/4p3/P5P1/1qB1P3/2PPNP1P/RN1QKB1R b KQkq -')

    assert.equal(engine.perft(1), 38)
    assert.equal(engine.perft(2), 1008)
    assert.equal(engine.perft(3), 38047)
    assert.equal(engine.perft(4), 1102194)
    // assert.equal(engine.perft(5), 1477963)
  }).timeout(30000000)

  it('talkchess 1', function () {
    const engine = new Engine('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - ')

    assert.equal(engine.perft(1), 14)
    assert.equal(engine.perft(2), 191)
    assert.equal(engine.perft(3), 2812)
    // assert.equal(engine.perft(4), 43238)
    // assert.equal(engine.perft(5), 674624)
  }).timeout(30000000)
  
  it('talkchess 2', function () {
    const engine = new Engine('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1')

    assert.equal(engine.perft(1), 6)
    assert.equal(engine.perft(2), 264)
    assert.equal(engine.perft(3), 9467)
    // assert.equal(engine.perft(4), 422333)
    // assert.equal(engine.perft(5), 15833292)
  }).timeout(30000000)

  it('talkchess 3', function () {
    const engine = new Engine('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8  ')

    assert.equal(engine.perft(1), 44)
    assert.equal(engine.perft(2), 1486)
    assert.equal(engine.perft(3), 62379)
    // assert.equal(engine.perft(4), 2103487)
    // assert.equal(engine.perft(5), 89941194)
  }).timeout(30000000)
})