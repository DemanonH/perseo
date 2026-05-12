'use strict';
if (process.env.APP_TYPE !== 'frontend') process.exit(0);

const { execSync } = require('child_process');
const path = require('path');

const frontendDir = path.resolve(__dirname, '../../frontend');
const backendDir  = path.resolve(__dirname, '..');

console.log('[build-if-frontend] Building Next.js frontend...');
execSync('npm install --include=dev && npm run build', {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: true,
});

console.log('[build-if-frontend] Copying standalone to backend/.next/...');
execSync('mkdir -p .next && cp -r ../frontend/.next/standalone .next/ && cp -r ../frontend/.next/static .next/standalone/.next/', {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true,
});

console.log('[build-if-frontend] Done.');
