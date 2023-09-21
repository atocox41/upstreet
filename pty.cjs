const pty = require('node-pty');

if (require.main === module) {
  const cols = parseInt(process.argv[2], 10);
  const rows = parseInt(process.argv[3], 10);
  const bin = process.argv[4];
  const args = process.argv.slice(5);
  const cp = pty.spawn(bin, args, {
    name: 'xterm-color',
    cols,
    rows,
    cwd: process.env.HOME,
    env: process.env,
  });
  cp.on('data', data => {
    // console.log('got data', data);
    process.stdout.write(data);
  });
  process.stdin.on('data', data => {
    cp.write(data);
  });
  // set raw mode
  // process.stdin.setRawMode(true);

  process.on('exit', () => {
    cp.kill('SIGTERM');
  });
}