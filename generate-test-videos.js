const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

const outputDir = path.join(__dirname, 'test-videos');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const generateTestVideo = (name, duration, color, resolution = '640x480') => {
  const outputPath = path.join(outputDir, `${name}.mp4`);
  
  return new Promise((resolve, reject) => {
    console.log(`Generating ${name}.mp4 (${duration}s, ${color}, ${resolution})...`);
    
    ffmpeg()
      .input(`color=${color}:s=${resolution}:d=${duration}`)
      .inputFormat('lavfi')
      .input('sine=frequency=1000:duration=' + duration)
      .inputFormat('lavfi')
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-pix_fmt yuv420p',
        '-r 30'
      ])
      .on('end', () => {
        const stats = fs.statSync(outputPath);
        console.log(`✓ Created ${name}.mp4 (${(stats.size / 1024).toFixed(2)} KB)`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`✗ Failed to create ${name}.mp4:`, err.message);
        reject(err);
      })
      .run();
  });
};

const generateTestVideoWithText = (name, duration, color, text) => {
  const outputPath = path.join(outputDir, `${name}.mp4`);
  
  return new Promise((resolve, reject) => {
    console.log(`Generating ${name}.mp4 (${duration}s, ${color}, with text: "${text}")...`);
    
    ffmpeg()
      .input(`color=${color}:s=640x480:d=${duration}`)
      .inputFormat('lavfi')
      .input('sine=frequency=1000:duration=' + duration)
      .inputFormat('lavfi')
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .videoFilters(`drawtext=text='${text}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2:fontfile=C\\\\:/Windows/Fonts/arial.ttf`)
      .outputOptions([
        '-pix_fmt yuv420p',
        '-r 30'
      ])
      .on('end', () => {
        const stats = fs.statSync(outputPath);
        console.log(`✓ Created ${name}.mp4 (${(stats.size / 1024).toFixed(2)} KB)`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`✗ Failed to create ${name}.mp4:`, err.message);
        reject(err);
      })
      .run();
  });
};

async function generateAllTestVideos() {
  console.log('Generating test videos in:', outputDir);
  console.log('');
  
  try {
    await generateTestVideo('test-short-5s', 5, 'blue', '640x480');
    await generateTestVideo('test-medium-10s', 10, 'green', '640x480');
    await generateTestVideo('test-long-30s', 30, 'red', '640x480');
    
    await generateTestVideoWithText('test-clip-a', 5, 'purple', 'Clip A');
    await generateTestVideoWithText('test-clip-b', 5, 'orange', 'Clip B');
    await generateTestVideoWithText('test-clip-c', 5, 'cyan', 'Clip C');
    
    await generateTestVideo('test-hd', 3, 'yellow', '1280x720');
    await generateTestVideo('test-vertical', 3, 'pink', '480x640');
    
    console.log('');
    console.log('✓ All test videos generated successfully!');
    console.log(`  Location: ${outputDir}`);
    console.log('');
    console.log('Test videos created:');
    console.log('  - test-short-5s.mp4 (5s, blue)');
    console.log('  - test-medium-10s.mp4 (10s, green)');
    console.log('  - test-long-30s.mp4 (30s, red)');
    console.log('  - test-clip-a.mp4 (5s, purple, labeled "Clip A")');
    console.log('  - test-clip-b.mp4 (5s, orange, labeled "Clip B")');
    console.log('  - test-clip-c.mp4 (5s, cyan, labeled "Clip C")');
    console.log('  - test-hd.mp4 (3s, yellow, 1280x720)');
    console.log('  - test-vertical.mp4 (3s, pink, 480x640)');
    console.log('');
    console.log('Usage:');
    console.log('  1. Import these videos into LazyVid for testing');
    console.log('  2. Test timeline with multiple clips (A, B, C)');
    console.log('  3. Test trim operations on short/medium/long clips');
    console.log('  4. Test different resolutions (HD, vertical)');
    
  } catch (error) {
    console.error('Failed to generate test videos:', error);
    process.exit(1);
  }
}

generateAllTestVideos();
