#!/usr/bin/env node

const { exec } = require('child_process');
const readline = require('readline');

const me = process.pid;
const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const verbose = args.includes('--verbose');
const filter = args.find(arg => arg.startsWith('--filter='))?.split('=')[1] || 'server.js';

function getProcessList(callback) {
  exec('ps -ef', (err, stdout) => {
    if (err) {
      console.error('Error listing processes:', err);
      process.exit(1);
    }
    callback(stdout);
  });
}

function confirm(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer));
    });
  });
}

function killMatchingProcesses(stdout) {
  const lines = stdout.split('\n');
  const victims = [];

  lines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    const pid = parseInt(parts[1], 10);
    const cmd = parts.slice(7).join(' ');

    if (
      pid !== me &&
      /node|nodemon/.test(cmd) &&
      new RegExp(filter).test(cmd)
    ) {
      victims.push({ pid, cmd });
    }
  });

  if (victims.length === 0) {
    console.log('✓ No matching processes found.');
    return;
  }

  console.log(`Found ${victims.length} matching process(es):`);
  victims.forEach(({ pid, cmd }) => {
    console.log(` - PID ${pid}: ${cmd}`);
  });

  if (dryRun) {
    console.log('\nDry run enabled. No processes were killed.');
    return;
  }

  confirm('\nProceed with killing these processes? (y/n): ').then(yes => {
    if (!yes) {
      console.log('✗ Aborted. No processes were killed.');
      return;
    }

    victims.forEach(({ pid, cmd }) => {
      try {
        process.kill(pid, 'SIGKILL');
        console.log(`✓ Killed PID ${pid}: ${cmd}`);
      } catch (e) {
        console.error(`✗ Failed to kill PID ${pid}: ${e.message}`);
      }
    });
  });
}

getProcessList(killMatchingProcesses);
