module.exports.createNArray = n =>
  new Array(n)
    .join('.')
    .split('.')
    .map((_, i) => i + 1);
module.exports.random = n => (Math.floor(Math.random() * n) + 1).toString();
