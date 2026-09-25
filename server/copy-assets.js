const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'src/monitor/monitor.dashboard.html');
const destDir = path.join(__dirname, 'dist/monitor');
const dest = path.join(destDir, 'monitor.dashboard.html');

if (fs.existsSync(src)) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log('[Build] Successfully copied monitor.dashboard.html to dist/monitor/');
}
