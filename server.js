const net = require('net');
const path = require('path');

const { PatternGenerator } = require('./pattern-generator');
const { processImages, readdir, writeFile } = require('./process-images');

const start = async () => {
  console.log('processing images');
  await processImages();
  console.log('images processed\n\rseeding markov chain');
  const generator = await PatternGenerator.from(
    path.resolve(__dirname, './examples/data/rgba.txt')
  );
  console.log('markov chain seeded');
  const server = net.createServer(function(socket) {
    socket.on('data', data => {
      const value = data.toString('utf8');
      const segments = value.split(':');
      const id = segments.shift();
      const payload = segments.pop();
      let resp;
      if (payload) {
        const next = generator.next(payload);
        resp = (next && next.key) || undefined;
      } else {
        resp = generator.random();
      }
      socket.write(`${id}:${resp}`);
    });
  });

  server.listen(1337, '127.0.0.1');
  console.log('socket created at port 1337');
};

start();
