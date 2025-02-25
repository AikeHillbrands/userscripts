/**
 * Injected into the browser and runs over the entire `window` object.
 *
 * Checks every property if its a function. If it is, skip it. If not,
 * recursively checks every property of the object if its a function.
 *
 * We only want to find the hyration data which will never be a function or
 * include any function.
 *
 * We track in a set which objects we looked at so we don't go into an infinite
 * loop.
 */
function getHydration(): Record<string, any> {
  const seen = new Set();

  function containsFunction(obj: any): boolean {
    if (typeof obj === 'function') return true;

    if (obj === null || obj === undefined) return false;

    if (typeof obj !== 'object') return false;

    if (seen.has(obj)) return false;
    seen.add(obj);

    for (const key in obj) {
      if (containsFunction(obj[key])) return true;
    }

    return false;
  }

  const hydrationData: Record<string, any> = {};

  // Start traversal from window object
  for (const [key, value] of Object.entries(window)) {
    if (typeof value === 'function') continue;
    if (value && typeof value === 'object' && !containsFunction(value)) {
      // If the object doesn't contain functions and isn't empty, it might be hydration data
      if (Object.keys(value).length > 0) {
        hydrationData[key] = value;
      }
    }
  }

  return hydrationData;
}

// Make the function available globally
(window as any).getHydration = getHydration;

console.log('Use getHydration() to get the hydration data.'); 