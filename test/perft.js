const assert = require('assert')
const Engine = require('../src/engine.js').Engine

Error.stackTraceLimit = 10

describe('perft', function () {
  it('should show perft results', function () {
    const engine = new Engine('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')

    assert.equal(engine.perft(1), 20)
    assert.equal(engine.perft(2), 400)
    assert.equal(engine.perft(3), 8902)
    assert.equal(engine.perft(4), 197281)
    assert.equal(engine.perft(5), 4865609)
  }).timeout(60000)
})