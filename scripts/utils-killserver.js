#!/usr/bin/env node

const { exec } = require('child_process');

const me = process.pid;

exec('ps -ef', (err, stdout) => {
  if (err) {
    console.error('Error listing processes:', err);
    process.exit(1);
  }

  const lines = stdout.split('\n');

  lines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    const pid = parseInt(parts[1], 10);
    const cmd = parts.slice(7).join(' ');

    if (
      pid !== me &&
      /node|nodemon/.test(cmd) &&
      /server\.js/.test(cmd)
    ) {
      try {
        console.log(`-> Killing PID ${pid}: ${cmd}`);
        process.kill(pid, 'SIGKILL');
      } catch (e) {
        console.error(`   ✕ Failed to kill PID ${pid}: ${e.message}`);
      }
    }
  });
});
