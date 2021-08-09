/*
  This wraps Makoto Matsumoto and Takuji Nishimura's code for the 64-bit
  version of the Mersenne Twister pseudorandom number generator.

  This can be a substitute for Math.random(), by using the random() method
  in this way:
  var m = new MersenneTwister();
  var randomNumber = m.random();

  To use a seed:
  var m = new MersenneTwister(123);

  To intiialize using an array:
  var m = new MersenneTwister()
  let init = new BigUint64Array(4);
  init[0] = U64('0x12345');
  init[1] = U64('0x23456');
  init[2] = U64('0x34567');
  init[3] = U64('0x45678');
  m.init_by_array(init);

  Both of the above will produce the same random sequence.

  Credits:
  Takuji Nishimura and Makoto Matsumoto
  Sean McCullough for the 32-bit version

  Ported By:
  Kenn Costales (kfrcostales@gmail.com)
*/

/* 
   A C-program for MT19937-64 (2004/9/29 version).
   Coded by Takuji Nishimura and Makoto Matsumoto.

   This is a 64-bit version of Mersenne Twister pseudorandom number
   generator.

   Before using, initialize the state by using init_seed(seed)  
   or init_by_array(init_key, key_length).

   Copyright (C) 2004, Makoto Matsumoto and Takuji Nishimura,
   All rights reserved.                          

   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions
   are met:

     1. Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.

     2. Redistributions in binary form must reproduce the above copyright
        notice, this list of conditions and the following disclaimer in the
        documentation and/or other materials provided with the distribution.

     3. The names of its contributors may not be used to endorse or promote 
        products derived from this software without specific prior written 
        permission.

   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
   "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
   LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
   A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
   CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
   EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
   PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
   PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
   LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
   NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
   SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

   References:
   T. Nishimura, ``Tables of 64-bit Mersenne Twisters''
     ACM Transactions on Modeling and 
     Computer Simulation 10. (2000) 348--357.
   M. Matsumoto and T. Nishimura,
     ``Mersenne Twister: a 623-dimensionally equidistributed
       uniform pseudorandom number generator''
     ACM Transactions on Modeling and 
     Computer Simulation 8. (Jan. 1998) 3--30.

   Any feedback is very welcome.
   http://www.math.hiroshima-u.ac.jp/~m-mat/MT/emt.html
   email: m-mat @ math.sci.hiroshima-u.ac.jp (remove spaces)
*/

const U64 = function(int) {
  return BigInt.asUintN(64, BigInt(int));
}

class MersenneTwister {
  constructor(seed) {
    this.seed = seed || U64(new Date().getTime());

    this.N = 312;
    this.M = 156;
    this.MATRIX_A = U64('0xB5026F5AA96619E9');   /* constant vector a */
    this.UPPER_MASK = U64('0xFFFFFFFF80000000'); /* Most significant 33 bits */
    this.LOWER_MASK = U64('0x7FFFFFFF'); /* Least significant 31 bits */

    this.mt = new BigUint64Array(this.N); /* the array for the state vector */
    this.mti=this.N+1; /* mti==N+1 means mt[N] is not initialized */

    this.#seedIsBigUint64Array() ? this.init_by_array(this.seed) :
      this.init_seed(this.seed);
  }

  /* initialize by an array with array-length */
  /* init_key is the array for initializing keys */
  init_by_array(init_key) {
    if (init_key.constructor !== BigUint64Array) {
      throw new Error('You must use BigUint64Array for your input array');
    }
    this.init_seed(U64(19650218));
    var i, j, k;
    const key_length = init_key.length;
    i=1; j=0;
    k = (this.N>key_length ? this.N : key_length);
    for (; k; k--) {
      this.mt[i] = (this.mt[i] ^ ((this.mt[i-1] ^ (this.mt[i-1] >> U64(62))) * U64(3935559000370003845)))
        + init_key[j] + U64(j);  /* non linear */
      i++; j++;
      if (i>=this.N) {this.mt[0] = this.mt[this.N-1]; i=1;}
      if (j>=key_length) j=0;
    }
    for (k=this.N-1; k; k--) {
      this.mt[i] = (this.mt[i] ^ ((this.mt[i-1] ^ (this.mt[i-1] >> U64(62))) * U64(2862933555777941757)))
        - U64(i); /* non linear */
      i++;
      if (i>=this.N) {this.mt[0] = this.mt[this.N-1]; i=1;}
    }
    this.mt[0] = U64(1) << U64(63); /* MSB is 1; assuring non-zero initial array */
  }

  /* initializes mt[NN] with a seed */
  init_seed(seed) {
    this.seed = U64(seed);
    this.mt[0] = this.seed;
    for (this.mti=1; this.mti<this.N; this.mti++) {
      this.mt[this.mti] = (U64(6364136223846793005) *
          (this.mt[this.mti-1] ^ (this.mt[this.mti-1] >> U64(62))) + U64(this.mti));
    }
  }

  /* generates a random number on [0, 2^64-1]-interval */
  /* origin name genrand64_int64 */
  random_bigint(seed) {
    var i;
    var x = U64(0);
    var mag01 = new BigUint64Array(2)
    mag01[0] = (U64(0));
    mag01[1] = this.MATRIX_A;


    if (this.mti>=this.N) { /* generate N words at one time */
      /* if init_seed() has not been called, */
      /* a default initial seed is used     */
      if (this.mti === this.N+1) {
        this.init_seed(U64(5489));
      }

      for (i=0;i<this.N-this.M;i++) {
        x = (this.mt[i] & this.UPPER_MASK) | (this.mt[i+1] & this.LOWER_MASK);
        this.mt[i] = this.mt[i+this.M] ^ (x>>U64(1))^mag01[Number(x&U64(1))];
      }

      for (;i<this.N-1;i++) {
        x = (this.mt[i] & this.UPPER_MASK) | (this.mt[i+1] & this.LOWER_MASK);
        this.mt[i] = this.mt[i+(this.M-this.N)] ^ (x>>U64(1))^mag01[Number(x&U64(1))];
      }

      x = (this.mt[this.N-1]&this.UPPER_MASK) | (this.mt[0]&this.LOWER_MASK);
      this.mt[this.N-1] = this.mt[this.M-1] ^ (x>>U64(1)^mag01[Number(x&U64(1))]);

      this.mti = 0;
    }

    x = this.mt[this.mti++];

    x ^= (x >> U64(29) & U64('0x5555555555555555'));
    x ^= (x << U64(17) & U64('0x71D67FFFEDA60000'));
    x ^= (x << U64(37) & U64('0xFFF7EEE000000000'));
    x ^= (x >> U64(43));

    return x;
  }

  random_int() {
    return Number(this.random_bigint() >> U64(11));
  }

  /* generates a random number on [0, 2^63-1]-interval */
  /* origin name genrand64_int63 */
  random_int63() {
    return this.random_bigint() >> U64(1);
  }

  /* generates a random number on [0,1]-real-interval */
  /* origin name genrand64_real1 */
  random_incl() {
    return Number(this.random_bigint() >> U64(11)) * (1.0/9007199254740991.0);
  }

  /* generates a random number on [0,1]-real-interval */
  /* origin name genrand64_real2 */
  random() {
    return Number(this.random_bigint() >> U64(11)) * (1.0/9007199254740992.0);
  }

  /* generates a random number on (0,1)-real-interval */
  /* origin name genrand64_real3 */
  random_excl() {
    return (Number(this.random_bigint() >> U64(12)) + 0.5) * (1.0/4503599627370496.0);
  }

  #seedIsBigUint64Array() {
    return this.seed.constructor === BigUint64Array;
  }
}

module.exports = {
  U64: U64,
  MersenneTwister: MersenneTwister,
};