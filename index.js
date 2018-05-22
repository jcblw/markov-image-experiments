const path = require('path');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const GIFEncoder = require('gifencoder');

const { PatternGenerator } = require('./pattern-generator');
const { createNArray } = require('./utils');
const { createSpiral } = require('./spiral-matrix');
const {
  processImages,
  readdir,
  writeFile,
  stat,
  mkdir,
} = require('./process-images');

const THRESHOLD = 5;
const SIZE = 100;
const PASSES = 30;
const IMAGE_DIR = 'test-images';

const matchAllPixel = (gen, ...all) => {
  const counts = {};
  const pixels = all
    .filter(x => x)
    .map((value, i) => {
      const next = gen.next(value);
      return next && next.key;
    })
    .filter(x => x)
    .map(key => {
      if (counts[key]) {
        counts[key] += 1;
      } else {
        counts[key] = 1;
      }
      return key;
    })
    .sort((a, b) => {
      return counts[a] - counts[b];
    });
  const pixel = pixels.pop();
  return pixel || gen.random();
};

const start = async () => {
  console.log('processing images');
  await processImages(IMAGE_DIR);
  console.log('seeding images');
  const generator = await PatternGenerator.from(
    path.resolve(__dirname, './examples/data/rgba.txt')
  );
  const encoder = new GIFEncoder(SIZE, SIZE);
  // stream the results as they are available into myanimated.gif

  console.log('generating image');
  const folder = `${IMAGE_DIR}-${THRESHOLD}-${PASSES}-${SIZE}`;
  const dir = path.resolve(__dirname, `./examples/${folder}`);

  try {
    await stat(dir);
  } catch (e) {
    await mkdir(dir);
  }
  const canvas = createCanvas(SIZE, SIZE);
  const context = canvas.getContext('2d');
  const pattern = createSpiral(SIZE);
  // setup gif
  encoder
    .createReadStream()
    .pipe(fs.createWriteStream(path.resolve(dir, './animated.gif')));
  encoder.start();
  encoder.setRepeat(0); // 0 for repeat, -1 for no-repeat
  encoder.setDelay(100); // frame delay in ms
  encoder.setQuality(10); // image quality. 10 is default.

  // keyed by x:y
  const pixels = {};

  const pixelSet = (offset, x, y) => {
    return [
      pixels[`${x - offset}:${y - offset}`],
      pixels[`${x - offset}:${y}`],
      pixels[`${x}:${y - offset}`],
    ];
  };

  const pass = num => {
    const isEven = num % 2;
    pattern.forEach(([x, y]) => {
      const pixel = matchAllPixel(
        generator,
        ...createNArray(THRESHOLD)
          .map(n => pixelSet(-n, x, y))
          .reduce((accum, set) => {
            return [...accum, ...set];
          }, []),
        ...createNArray(THRESHOLD)
          .map(n => pixelSet(n, x, y))
          .reduce((accum, set) => {
            return [...accum, ...set];
          }, [])
      );
      pixels[`${x}:${y}`] = pixel;
      const [r, g, b, a] = pixel.split('_');
      context.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
      context.fillRect(x, y, 1, 1);
    });
  };

  const writeCanvas = async step => {
    const buffer = canvas.toBuffer();
    encoder.addFrame(context);
    await writeFile(path.resolve(dir, `./${step}.png`), buffer);
  };

  console.log('starting initial pass');
  // initial pass
  for (let x = 0; x < SIZE; x++) {
    for (let y = 0; y < SIZE; y++) {
      const pixel = generator.random();
      pixels[`${x}:${y}`] = pixel;
      const [r, g, b, a] = pixel.split('_');
      context.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
      context.fillRect(x, y, 1, 1);
    }
  }
  // wait for initial pass to write
  // await writeCanvas(0);

  createNArray(PASSES).forEach(num => {
    console.log(`starting ${num} pass`);
    pass(SIZE, num);
    const buffer = canvas.toBuffer();
    writeCanvas(num);
  });

  console.log(`writing pixels to canvas`);
  for (let x = 0; x < SIZE; x++) {
    for (let y = 0; y < SIZE; y++) {
      const pixel = pixels[`${x}:${y}`];
      const [r, g, b, a] = pixel.split('_');
      context.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
      context.fillRect(x, y, 1, 1);
    }
  }
  await writeCanvas('final');
  encoder.finish();
};

start();
