import { convertSeleniumToVirtuoso } from './index.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Selenium test file
const seleniumTestPath = '/Users/marklovelady/Documents/GitHub/my-assets/_sample_tests/Test_Rocketshop.py';

// Log the start of the test
console.log('Starting conversion test...');
console.log(`Selenium test file: ${seleniumTestPath}`);

// Run the conversion
convertSeleniumToVirtuoso(seleniumTestPath)
  .then(result => {
    if (result) {
      console.log('Test completed successfully!');
    } else {
      console.log('Test completed with errors.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });