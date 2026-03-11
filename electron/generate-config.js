const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = {
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
};

fs.writeFileSync(
  path.join(__dirname, 'runtime-config.js'),
  `module.exports = ${JSON.stringify(config, null, 2)};\n`
);

console.log('runtime-config.js generated');