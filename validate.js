const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'main.js',
  'preload.js',
  'renderer.js',
  'index.html',
  'styles.css',
  'package.json'
];

// Detect platform and set appropriate executable path
const platform = process.platform;
let executablePath;
let executableName;

if (platform === 'darwin') {
  // Try architecture-specific paths first
  const macArm64Path = path.join(__dirname, 'dist', 'mac-arm64', 'LazyVid.app');
  const macPath = path.join(__dirname, 'dist', 'mac', 'LazyVid.app');

  if (fs.existsSync(macArm64Path)) {
    executablePath = macArm64Path;
  } else {
    executablePath = macPath;
  }
  executableName = 'LazyVid.app';
} else if (platform === 'win32') {
  executablePath = path.join(__dirname, 'dist', 'win-unpacked', 'LazyVid.exe');
  executableName = 'LazyVid.exe';
} else {
  executablePath = path.join(__dirname, 'dist', 'linux-unpacked', 'LazyVid');
  executableName = 'LazyVid';
}

console.log(`Validating LazyVid build for ${platform}...\n`);

let errors = 0;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✓ ${file}`);
  } else {
    console.log(`✗ ${file} - MISSING`);
    errors++;
  }
});

if (fs.existsSync(executablePath)) {
  const stats = fs.statSync(executablePath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`✓ ${executableName} (${sizeMB} MB)`);
} else {
  console.log(`✗ ${executableName} - NOT BUILT`);
  console.log(`   Expected at: ${executablePath}`);
  errors++;
}

console.log(`\n${errors === 0 ? '✓ All validations passed' : `✗ ${errors} validation(s) failed`}`);
process.exit(errors);
