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

const executablePath = path.join(__dirname, 'dist', 'win-unpacked', 'ClipForge.exe');

console.log('Validating ClipForge build...\n');

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
  console.log(`✓ ClipForge.exe (${sizeMB} MB)`);
} else {
  console.log('✗ ClipForge.exe - NOT BUILT');
  errors++;
}

console.log(`\n${errors === 0 ? '✓ All validations passed' : `✗ ${errors} validation(s) failed`}`);
process.exit(errors);
