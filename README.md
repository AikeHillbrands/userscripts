# Get Hydration UserScript

A userscript that helps you extract hydration data from modern web applications by finding objects in the window scope that don't contain functions.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Then:

1. Open `http://localhost:2999` in your browser
2. Click the userscript link to install in Violentmonkey
3. Click "Track external edits" in the Violentmonkey installer
4. Edit files in `src/` and changes will auto-update

## Usage

Once installed, open your browser's developer console on any page and run:

```javascript
const data = getHydration();
console.log(data);
```

This will show you all objects found in the window scope that:

- Don't contain any functions
- Aren't empty
- Aren't circular references

These are likely to be hydration data used by frameworks like React.

## Development

This project uses:

- TypeScript for type safety
- Auto-rebuilding development server
- Violentmonkey integration for live reloading

### Project Structure

```plain
├── src/                  # TypeScript source
│   └── <your code>
├── dist/                 # Compiled output
├── scripts/              # Build scripts
├── server.js            # Dev server
└── package.json
```

### Available Commands

- `pnpm dev` - Start development server with auto-rebuild

### How It Works

Before you get started: go into the temper monkey settings and check the **Check for script updates every ...** setting.
Set it to `0,00001` to make tamper monkey refresh approximately every 1 seconds. This is helpful to have always
the newest version available.

The development server:

1. Watches for changes in `src/`
2. Compiles TypeScript to JavaScript
3. Adds userscript headers
4. Serves the files with proper caching headers for Violentmonkey
5. Auto-reloads when changes are detected

## License

MIT
