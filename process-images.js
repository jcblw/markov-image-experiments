// automate image fetch
const fs = require('fs');
const path = require('path');
const util = require('util');
const gp = require('get-pixels');

const getPixels = util.promisify(gp);
const readdir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);
const stat = util.promisify(fs.stat);

const dataDir = path.resolve(__dirname, './examples/data');

const start = async dir => {
  const imageDir = path.resolve(__dirname, `./examples/${dir}`);
  const files = await readdir(imageDir);
  const images = [];
  for (let i = 0; i < files.length; i++) {
    images.push(await getPixels(path.resolve(imageDir, files[i])));
  }

  const imagesPixels = images.map(image => {
    const [x, y] = image.shape;
    const pixels = [];
    for (let ix = 0; ix < x; ix++) {
      for (let iy = 0; iy < x; iy++) {
        pixels.push(
          [
            image.get(ix, iy, 0),
            image.get(ix, iy, 1),
            image.get(ix, iy, 2),
            image.get(ix, iy, 3),
          ].join('_')
        );
      }
    }
    return pixels.join(' ');
  });

  // TODO: right now this is super slow, only pick first for now
  return writeFile(path.resolve(dataDir, './rgba.txt'), imagesPixels.join(' '));
};

module.exports.processImages = start;
module.exports.readdir = readdir;
module.exports.writeFile = writeFile;
module.exports.mkdir = mkdir;
module.exports.stat = stat;
