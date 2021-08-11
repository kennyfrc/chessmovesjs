const U64 = require('./helpers.js').U64;


/**
 * We're using a Linear Congruential Generator
 * where m is Mersenne Prime 2**61-1,
 * where a is a primitive root of m,
 * and where c = 0.
 * https://en.wikipedia.org/wiki/Linear_congruential_generator#m_prime,_c_=_0
 */
class LCG {
  constructor(seed) {
    this.seed = U64(seed || new Date().getTime());
  }

  random_bigint() {
    this.seed = (U64(257) * this.seed) % U64(2**61-1);
    return this.seed;
  }
}

module.exports = {
  LCG: LCG,
};