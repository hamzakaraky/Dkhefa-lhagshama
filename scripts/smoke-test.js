#!/usr/bin/env node
/*
 Simple smoke test script for local verification.

 Usage: node scripts/smoke-test.js [branch]
 - If a branch name is provided, the script will attempt to checkout that branch.
 - It will build backend and frontend, start them, probe a couple of endpoints,
   then shut the servers down and exit with code 0 on success.

 Important: This script spawns the real servers and kills them afterwards.
 Run it from the repo root on a Unix-like system.
*/
import { spawn } from 'child_process';
import { promisify } from 'util';
import { setTimeout as wait } from 'timers/promises';
import { exec as _exec } from 'child_process';
import process from 'process';

const exec = promisify(_exec);

async function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: false, ...opts });
    p.on('error', reject);
    p.on('exit', (code, sig) => {
      if (code === 0) resolve(); else reject(new Error(`${cmd} ${args.join(' ')} exited ${code || sig}`));
    });
  });
}

async function build(dir) {
  console.log(`Building ${dir}...`);
  await run('npm', ['--prefix', dir, 'run', 'build']);
}

function startProcess(cmd, args, opts = {}) {
  const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false, ...opts });
  p.stdout?.on('data', (d) => process.stdout.write(`[${cmd}] ${d}`));
  p.stderr?.on('data', (d) => process.stderr.write(`[${cmd}] ${d}`));
  return p;
}

async function waitForUrl(url, timeout = 20000, interval = 500) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return true;
    } catch (e) {
      // ignore
    }
    await wait(interval);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function main() {
  const branch = process.argv[2];
  try {
    if (branch) {
      console.log(`Checking out branch ${branch}...`);
      await exec(`git fetch --all --prune`);
      await exec(`git checkout ${branch}`);
      await exec(`git pull --ff-only`);
    }

    await build('backend');
    await build('frontend');

    console.log('Starting backend (port 3001)...');
    const backend = startProcess(process.execPath, ['dist/index.js'], { cwd: 'backend' });

    console.log('Starting frontend (port 3000)...');
    const frontend = startProcess('npm', ['--prefix', 'frontend', 'run', 'start']);

    try {
      await waitForUrl('http://localhost:3001/health', 20000);
      console.log('Backend /health OK');
    } catch (e) {
      throw new Error('Backend did not respond: ' + e.message);
    }

    try {
      await waitForUrl('http://localhost:3000/', 20000);
      console.log('Frontend root OK');
    } catch (e) {
      throw new Error('Frontend did not respond: ' + e.message);
    }

    console.log('Smoke test passed. Shutting down servers.');
    backend.kill();
    frontend.kill();
    process.exit(0);
  } catch (err) {
    console.error('Smoke test failed:', err);
    process.exit(2);
  }
}

main();
