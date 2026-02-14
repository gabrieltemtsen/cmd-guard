const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const input = path.resolve(__dirname, '..', 'public', 'cmd-guard-demo.mov');
const output = path.resolve(__dirname, '..', 'public', 'cmd-guard-demo.mp4');

if (!fs.existsSync(input)) {
  console.error('Input file not found:', input);
  process.exit(1);
}

console.log('Converting to MP4:', input, '->', output);

ffmpeg(input)
  .outputOptions([
    '-movflags +faststart',
    '-c:v libx264',
    '-preset veryfast',
    '-crf 28',
    '-vf scale=w=1280:h=720:force_original_aspect_ratio=decrease',
    '-r 24',
    '-c:a aac',
    '-b:a 128k',
  ])
  .on('start', (cmd) => console.log('ffmpeg:', cmd))
  .on('progress', (p) => {
    if (p.percent) process.stdout.write(`\rProgress: ${p.percent.toFixed(1)}%   `);
  })
  .on('end', () => {
    console.log('\nDone.');
    try {
      const s = fs.statSync(output);
      console.log('Output size:', (s.size / (1024 * 1024)).toFixed(1), 'MB');
    } catch {}
  })
  .on('error', (err) => {
    console.error('Conversion failed:', err.message);
    process.exit(1);
  })
  .save(output);

