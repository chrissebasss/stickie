const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  const electronPath = require('electron');
  if (fs.existsSync(electronPath)) {
    console.log('✓ Electron binary verified at:', electronPath);
    process.exit(0);
  }
} catch {
  // Binary not yet installed or extracted
}

try {
  const cacheDir = path.join(process.env.HOME || '', '.cache/electron');
  if (fs.existsSync(cacheDir)) {
    const found = execSync(`find "${cacheDir}" -name "electron-v*-linux-*.zip"`).toString().trim().split('\n');
    const zipPath = found[found.length - 1];
    if (zipPath && fs.existsSync(zipPath)) {
      const electronPkg = require.resolve('electron/package.json');
      const electronDir = path.dirname(electronPkg);
      const distDir = path.join(electronDir, 'dist');
      fs.mkdirSync(distDir, { recursive: true });
      execSync(`unzip -q -o "${zipPath}" -d "${distDir}"`);
      fs.writeFileSync(path.join(electronDir, 'path.txt'), process.platform === 'win32' ? 'electron.exe' : 'electron');
      console.log('✓ Successfully extracted Electron binary to:', distDir);
    }
  }
} catch (err) {
  console.warn('Notice: Could not automatically extract cached Electron:', err.message);
}
