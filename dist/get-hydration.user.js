// ==UserScript==
// @name        Get Hydration
// @namespace   aike.dev
// @match       *://*/*
// @grant       none
// @version     1.0.1740513196268 // Use timestamp as version
// @author      AikeHillbrands
// @description 2/25/2025, 8:53:16 PM
// @downloadURL http://localhost:2999/get-hydration.user.js
// @updateURL   http://localhost:2999/get-hydration.user.js
// @run-at      document-end
// ==/UserScript==

"use strict";
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
function getHydration() {
    const seen = new Set();
    function isHydration(obj) {
        // Check if it's null or not an object
        if (obj === null || typeof obj !== 'object')
            return false;
        // Check if it's a plain object (created by {} or new Object())
        const proto = Object.getPrototypeOf(obj);
        return proto === Object.prototype || proto === null;
    }
    function containsFunction(obj) {
        if (typeof obj === 'function')
            return true;
        if (obj === null || obj === undefined)
            return false;
        if (typeof obj !== 'object')
            return false;
        if (seen.has(obj))
            return false;
        seen.add(obj);
        for (const key in obj) {
            if (containsFunction(obj[key]))
                return true;
        }
        return false;
    }
    const hydrationData = {};
    // Start traversal from window object
    for (const [key, value] of Object.entries(window)) {
        // Skip functions
        if (typeof value === 'function')
            continue;
        // Skip if not a plain object that could be hydration data
        if (!value || typeof value !== 'object' || !isHydration(value))
            continue;
        // Skip if it contains functions
        if (!containsFunction(value)) {
            // If the object doesn't contain functions and isn't empty, it might be hydration data
            if (Object.keys(value).length > 0) {
                hydrationData[key] = value;
            }
        }
    }
    return hydrationData;
}
/**
 * Searches through hydration data for a specific string and returns objects containing that string.
 * @param searchString The string to search for
 * @param hydrationData Optional hydration data to search through. If not provided, will call getHydration()
 * @param printReport Whether to print a formatted report to the console (default: true)
 * @returns An object with root objects and a map of paths to the actual values found
 */
function searchHydration(searchString, hydrationData, printReport = true) {
    const data = hydrationData || getHydration();
    const results = {};
    const seen = new Set();
    function searchInObject(obj, path, rootKey, rootObj) {
        // Avoid circular references
        if (obj === null || obj === undefined || seen.has(obj))
            return;
        seen.add(obj);
        // For objects, search in all properties
        if (typeof obj === 'object') {
            for (const key in obj) {
                const value = obj[key];
                const newPath = path ? `${path}.${key}` : key;
                // Check if the current property is a string and contains the search string
                if (typeof value === 'string' && value.includes(searchString)) {
                    // Initialize the result entry if it doesn't exist
                    if (!results[rootKey]) {
                        results[rootKey] = { root: rootObj, matches: {} };
                    }
                    // Store the actual value at this path
                    results[rootKey].matches[newPath] = value;
                }
                else if (Array.isArray(value)) {
                    // For arrays, check each element
                    value.forEach((item, index) => {
                        if (typeof item === 'string' && item.includes(searchString)) {
                            if (!results[rootKey]) {
                                results[rootKey] = { root: rootObj, matches: {} };
                            }
                            const arrayPath = `${newPath}[${index}]`;
                            results[rootKey].matches[arrayPath] = item;
                        }
                        else if (typeof item === 'object' && item !== null) {
                            searchInObject(item, `${newPath}[${index}]`, rootKey, rootObj);
                        }
                    });
                }
                else if (typeof value === 'object' && value !== null) {
                    // Recursively search in nested objects
                    searchInObject(value, newPath, rootKey, rootObj);
                }
            }
        }
    }
    // Start the search from each top-level object in hydration data
    for (const key in data) {
        seen.clear(); // Reset seen set for each root object
        searchInObject(data[key], key, key, data[key]);
    }
    // Print a formatted report if requested
    if (printReport && Object.keys(results).length > 0) {
        console.group(`Search results for "${searchString}":`);
        let matchCount = 0;
        for (const rootKey in results) {
            const { matches, root } = results[rootKey];
            console.group(`Root object: ${rootKey}`);
            for (const path in matches) {
                matchCount++;
                const value = matches[path];
                const displayValue = typeof value === 'string'
                    ? `"${value.length > 100 ? value.substring(0, 100) + '...' : value}"`
                    : JSON.stringify(value).substring(0, 100) + (JSON.stringify(value).length > 100 ? '...' : '');
                console.log(`Match at:\n\t${path}\n\t${displayValue}`);
            }
            console.log('Root object: ', root);
            console.groupEnd();
        }
        console.log(`Total matches found: ${matchCount}`);
        console.groupEnd();
    }
    else if (printReport) {
        console.log(`No matches found for "${searchString}"`);
    }
    return results;
}
// Make the functions available globally
window.getHydration = getHydration;
window.searchHydration = searchHydration;
console.log('Use getHydration() to get the hydration data.');
console.log('Use searchHydration("your search string") to find objects containing that string.');
