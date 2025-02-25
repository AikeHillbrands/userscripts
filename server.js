const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const chokidar = require('chokidar');

const app = express();
const PORT = 2999;

// Store connected clients
const clients = {};

// Serve static files from the dist directory with proper headers for Violentmonkey
app.use((req, res, next) => {
  if (req.path.endsWith('.user.js')) {
    // Set headers specifically for userscripts to help Violentmonkey track changes
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '-1');
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('ETag', Math.random().toString()); // Force new ETag on each request
  }
  next();
});

app.use(express.static(path.join(__dirname, 'dist')));

// Add CORS headers to allow userscript access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Route to serve the userscript
app.get('/', (req, res) => {
  const files = fs.readdirSync(path.join(__dirname, 'dist'))
    .filter(file => file.endsWith('.user.js'))
    .map(file => `<li><a href="${file}">${file}</a></li>`)
    .join('');
  
  res.send(`
    <html>
      <head>
        <title>UserScripts</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          ul { list-style-type: none; padding: 0; }
          li { margin: 10px 0; }
          a { color: #0066cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .status { padding: 10px; background-color: #f0f0f0; border-radius: 4px; margin-top: 20px; }
          .instructions { margin-top: 20px; background-color: #f9f9f9; padding: 15px; border-radius: 4px; }
          code { background-color: #eee; padding: 2px 4px; border-radius: 3px; }
        </style>
        <script>
          // Auto-refresh the page when files change
          const eventSource = new EventSource('/events');
          eventSource.onmessage = function(e) {
            if (e.data === 'rebuild-complete') {
              location.reload();
            }
          };
        </script>
      </head>
      <body>
        <h1>Available UserScripts</h1>
        <ul>${files}</ul>
        <div class="status">Server is watching for changes in the src directory.</div>
        
        <div class="instructions">
          <h2>How to use with Violentmonkey:</h2>
          <ol>
            <li>Click on a script link above to open it in Violentmonkey</li>
            <li>In the Violentmonkey installer, click "Track external edits" button</li>
            <li>Edit the TypeScript source files in the src directory</li>
            <li>The server will automatically rebuild and Violentmonkey will detect changes</li>
          </ol>
          <p>The server is configured to disable caching, which helps Violentmonkey detect changes immediately.</p>
        </div>
      </body>
    </html>
  `);
});

// Set up SSE for client notifications
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Max-Age', '1');
  
  // Store the response object to send events later
  const clientId = Date.now();
  clients[clientId] = res;
  
  req.on('close', () => {
    delete clients[clientId];
  });
});

// Function to send SSE to all clients
function sendToAllClients(data) {
  Object.values(clients).forEach(client => {
    client.write(`data: ${data}\n\n`);
  });
}

// Function to rebuild the project
function rebuildProject() {
  console.log('File change detected, rebuilding...');
  
  exec('pnpm build', (error, stdout, stderr) => {
    if (error) {
      console.error(`Build error: ${error}`);
      return;
    }
    
    console.log('Build completed successfully');
    console.log(stdout);
    
    // Notify clients that rebuild is complete
    sendToAllClients('rebuild-complete');
  });
}

// Set up file watcher
const watcher = chokidar.watch('src/**/*.ts', {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true
});

// Add event listeners
watcher
  .on('change', path => {
    console.log(`File ${path} has been changed`);
    rebuildProject();
  })
  .on('add', path => {
    console.log(`File ${path} has been added`);
    rebuildProject();
  });

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Access your userscripts at http://localhost:${PORT}`);
  console.log('Watching for file changes in src directory...');
  
  // Initial build
  rebuildProject();
}); 