const fs = require('fs-extra');
const path = require('path');

// Function to add userscript header to compiled JS files
function addUserScriptHeader() {
  const distDir = path.join(__dirname, '..', 'dist');
  const files = fs.readdirSync(distDir);
  
  files.forEach(file => {
    if (file.endsWith('.js')) {
      const filePath = path.join(distDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Skip if already has userscript header
      if (content.includes('// ==UserScript==')) {
        return;
      }
      
      // Get name from filename (remove extension and convert to title case)
      const baseName = path.basename(file, '.js');
      const scriptName = baseName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Create userscript header with @downloadURL and @updateURL for Violentmonkey tracking
      const header = `// ==UserScript==
// @name        ${scriptName}
// @namespace   aike.dev
// @match       *://*/*
// @grant       none
// @version     1.0.${Date.now()} // Use timestamp as version
// @author      AikeHillbrands
// @description ${new Date().toLocaleDateString()}, ${new Date().toLocaleTimeString()}
// @downloadURL http://localhost:2999/${file.replace('.js', '.user.js')}
// @updateURL   http://localhost:2999/${file.replace('.js', '.user.js')}
// @run-at      document-end
// ==/UserScript==

`;
      
      // Rename file to include .user.js extension
      const newFileName = file.replace('.js', '.user.js');
      const newFilePath = path.join(distDir, newFileName);
      
      // Write the file with header
      fs.writeFileSync(newFilePath, header + content);
      
      // Remove the original file
      if (newFileName !== file) {
        fs.removeSync(filePath);
      }
      
      console.log(`Added userscript header to ${newFileName} with name "${scriptName}"`);
    }
  });
}

// Run the function
addUserScriptHeader(); 