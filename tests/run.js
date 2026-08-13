'use strict';

// Run both suites in one process. This keeps the test command compatible with
// Node.js 20+ and with restricted environments that disallow child processes.
require('./core.test.js');
require('./server.test.js');
