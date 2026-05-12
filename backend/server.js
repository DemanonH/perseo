'use strict';
const path = require('path');

if (process.env.APP_TYPE === 'frontend') {
  const standaloneDir = path.join(__dirname, '.next/standalone');
  process.chdir(standaloneDir);
  require(path.join(standaloneDir, 'server.js'));
} else {
  require('./src/index.js');
}
