#!/usr/bin/env node

/**
 * Setup script to create .env file with OpenAI API key
 * Run with: node setup-env.js
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const examplePath = path.join(__dirname, 'env.example');

const envContent = `# OpenAI API Configuration
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Development Configuration
NODE_ENV=development
`;

try {
  if (fs.existsSync(envPath)) {
    console.log('✅ .env file already exists');
    console.log('📝 Current content:');
    console.log(fs.readFileSync(envPath, 'utf8'));
  } else {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file successfully!');
    console.log('📝 Content:');
    console.log(envContent);
  }

  console.log('\n🔧 To use a different API key:');
  console.log('1. Edit the .env file');
  console.log('2. Replace OPENAI_API_KEY with your key');
  console.log('3. Run npm run build');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
  process.exit(1);
}
