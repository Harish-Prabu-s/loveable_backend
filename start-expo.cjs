const { spawn } = require('child_process');
const path = require('path');

const env = {
  ...process.env,
  USERPROFILE: path.join(__dirname, '.user-profile'),
  HOME: path.join(__dirname, '.user-profile'),
  EXPO_CACHE_DIR: path.join(__dirname, '.expo-cache'),
  EXPO_HOME: path.join(__dirname, '.expo'),
  EXPO_PACKAGER_CACHE_DIR: path.join(__dirname, '.expo-packager-cache'),
  REACT_NATIVE_PACKAGER_HOSTNAME: '192.168.1.4',
};

console.log('Starting Expo with local cache directories...');
console.log('EXPO_CACHE_DIR:', env.EXPO_CACHE_DIR);
console.log('EXPO_HOME:', env.EXPO_HOME);

const expo = spawn('npx', ['expo', 'start', '--clear', '--port', '8083', '--offline'], {
  env,
  stdio: 'inherit',
  shell: true,
});

expo.on('error', (err) => {
  console.error('Failed to start Expo:', err);
});

expo.on('close', (code) => {
  console.log(`Expo process exited with code ${code}`);
  process.exit(code);
});
