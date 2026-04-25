const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const generateIcon = (size) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Purple background
  ctx.fillStyle = '#7c3aed';
  ctx.fillRect(0, 0, size, size);

  // Brain emoji centered
  ctx.font = `${size * 0.55}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🧠', size / 2, size / 2);

  const outPath = path.join(__dirname, '..', 'public', 'icons', `icon-${size}.png`);
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log(`Generated ${outPath}`);
};

generateIcon(192);
generateIcon(512);
