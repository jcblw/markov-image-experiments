const markov = require('markov');
const fs = require('fs');
const path = require('path');
const util = require('util');

const { random } = require('./utils');

class PatternGenerator {
  constructor({ num = 1, amount = 7 }) {
    this.markov = markov(num);
    this._seed = util.promisify(this.markov.seed);
    this.patterns = [];
    this._amount = amount;
  }
  async seed(path) {
    const readStream = fs.createReadStream(path);
    return this._seed(readStream);
  }
  async generate() {
    return this._generatePatterns();
  }
  next(...args) {
    return this.markov.next(...args);
  }
  prev(...args) {
    return this.markov.prev(...args);
  }
  random(...args) {
    return this.markov.pick(...args);
  }
  async _next(base) {
    let chain = base || random(7);
    const segments = chain.split(' ');
    const baseArr = [...segments];
    const last = baseArr.pop();
    const step = await this._ensureUniqueKey(last, segments);
    chain += ` ${step.key}`;
    const currentChain = chain.split(' ');
    if (chain.split(' ').length !== 7) {
      return await this._next(chain);
    }
    return chain;
  }
  async _ensureUniqueKey(str, arr) {
    const next =
      this.markov.next(str) ||
      this.markov.prev(str) ||
      (await this._ensureUniqueKey(str, arr));
    if (arr.includes(next.key)) {
      return new Promise(resolve => {
        // trampoline to avoid max callstack error
        setTimeout(() => {
          resolve(this._ensureUniqueKey(str, arr));
        }, 0);
      });
    }
    return next;
  }
  async _generatePatterns() {
    const { patterns, _amount } = this;
    const pattern = await this._next();
    if (!patterns.includes(pattern)) {
      patterns.push(pattern);
    }
    const nextCurrent = patterns.length;
    if (nextCurrent === _amount) {
      return patterns;
    }
    return await this._generatePatterns(nextCurrent);
  }
}

PatternGenerator.from = async (path, params = {}) => {
  const gen = new PatternGenerator(params);
  await gen.seed(path);
  return gen;
};

module.exports.PatternGenerator = PatternGenerator;

// USAGE:
// const path = require('path');
//
// const { PatternGenerator } = require('./pattern-generator');
//
// const start = async () => {
//   const generator = await PatternGenerator.from(
//     path.resolve(__dirname, './examples/samples.txt'),
//     { amount: 500 }
//   );
//   const patterns = await generator.generate();
//   const
//   console.log(patterns);
// };
//
// start();
