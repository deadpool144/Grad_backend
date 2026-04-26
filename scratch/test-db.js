import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.MONGO_URL;

console.log('Attempting to connect to MongoDB...');
console.log('URI:', mongoUri?.replace(/\/\/.*@/, '//****:****@')); // Hide credentials

try {
  await mongoose.connect(mongoUri);
  console.log('✅ Connection successful!');
  process.exit(0);
} catch (err) {
  console.error('❌ Connection failed:');
  console.error(err.message);
  
  if (err.message.includes('ECONNREFUSED') || err.message.includes('MongooseServerSelectionError')) {
    console.log('\n💡 POSSIBLE SOLUTIONS:');
    console.log('1. WHITELIST YOUR IP: Go to MongoDB Atlas -> Network Access -> Add Current IP Address.');
    console.log('2. CHECK DNS: Your network might block SRV records. Try adding "8.8.8.8" to your computer\'s DNS settings.');
    console.log('3. URI FORMAT: Ensure your password in .env is correct and doesn\'t contain unescaped special characters.');
  }
  
  process.exit(1);
}
