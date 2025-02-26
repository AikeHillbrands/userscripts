// ==UserScript==
// @name        Structured Data
// @namespace   aike.dev
// @match       *://*/*
// @grant       none
// @version     1.0.1740557447352 // Use timestamp as version
// @author      AikeHillbrands
// @description 2/26/2025, 9:10:47 AM
// @downloadURL http://localhost:2999/structured-data.user.js
// @updateURL   http://localhost:2999/structured-data.user.js
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
    // Extract structured data from meta tags
    const structuredData = getStructuredDataFromMeta();
    if (Object.keys(structuredData).length > 0) {
        hydrationData['structuredData'] = structuredData;
    }
    return hydrationData;
}
/**
 * Extracts structured data from meta tags in the document
 * @returns Object containing structured data from meta tags
 */
function getStructuredDataFromMeta() {
    const result = {
        meta: {},
        jsonLd: [],
        openGraph: {},
        twitter: {},
        microdata: []
    };
    // Extract standard meta tags
    document.querySelectorAll('meta').forEach(meta => {
        const name = meta.getAttribute('name');
        const property = meta.getAttribute('property');
        const content = meta.getAttribute('content');
        if (name && content) {
            result.meta[name] = content;
        }
        else if (property && content) {
            // Handle OpenGraph and Twitter card meta tags
            if (property.startsWith('og:')) {
                result.openGraph[property.substring(3)] = content;
            }
            else if (property.startsWith('twitter:')) {
                result.twitter[property.substring(8)] = content;
            }
            else {
                result.meta[property] = content;
            }
        }
    });
    // Extract JSON-LD structured data
    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
        try {
            const data = JSON.parse(script.textContent || '{}');
            result.jsonLd.push(data);
        }
        catch (e) {
            console.error('Failed to parse JSON-LD data', e);
        }
    });
    // Extract microdata
    function extractMicrodata(element) {
        const result = {};
        const itemtype = element.getAttribute('itemtype');
        const itemprop = element.getAttribute('itemprop');
        if (itemtype) {
            result.type = itemtype;
        }
        if (itemprop) {
            result.property = itemprop;
            // Get the value based on element type
            if (element.tagName === 'META') {
                result.value = element.getAttribute('content');
            }
            else if (element.tagName === 'IMG') {
                result.value = element.getAttribute('src');
            }
            else if (element.tagName === 'A') {
                result.value = element.getAttribute('href');
            }
            else if (element.tagName === 'TIME') {
                result.value = element.getAttribute('datetime') || element.textContent;
            }
            else {
                result.value = element.textContent?.trim();
            }
        }
        // Process child elements with itemprop
        const children = [];
        element.querySelectorAll('[itemprop]').forEach(child => {
            // Only process direct children to avoid duplicates
            if (child.parentElement?.closest('[itemscope]') === element) {
                children.push(extractMicrodata(child));
            }
        });
        if (children.length > 0) {
            result.children = children;
        }
        return result;
    }
    document.querySelectorAll('[itemscope]').forEach(element => {
        // Only process top-level itemscope elements
        if (!element.parentElement?.closest('[itemscope]')) {
            result.microdata.push(extractMicrodata(element));
        }
    });
    // Clean up empty sections
    Object.keys(result).forEach(key => {
        if (Array.isArray(result[key]) && result[key].length === 0) {
            delete result[key];
        }
        else if (typeof result[key] === 'object' && Object.keys(result[key]).length === 0) {
            delete result[key];
        }
    });
    return result;
}
/**
 * Extracts all structured data from both hydration data and meta tags
 * This function combines data from various sources to provide a comprehensive view
 * of all structured data on the page
 * @returns Object containing all structured data found on the page
 */
function getAllStructuredData() {
    const result = {
        meta: getStructuredDataFromMeta(),
        hydration: {}
    };
    // Get hydration data
    const hydrationData = getHydration();
    // Look for common structured data patterns in hydration data
    const structuredDataPatterns = [
        { key: 'schema', pattern: /schema|jsonld|structureddata/i },
        { key: 'product', pattern: /product|item|offering/i },
        { key: 'page', pattern: /page|content|article/i },
        { key: 'user', pattern: /user|profile|account/i },
        { key: 'seo', pattern: /seo|meta/i },
        { key: 'config', pattern: /config|settings/i },
        { key: 'graph', pattern: /graph|knowledge/i },
        { key: 'entity', pattern: /entity|thing/i },
        { key: 'breadcrumb', pattern: /breadcrumb|navigation/i },
        { key: 'review', pattern: /review|rating/i },
        { key: 'event', pattern: /event|calendar/i },
        { key: 'location', pattern: /location|place|address/i }
    ];
    // Helper function to check if an object might be structured data
    function isLikelyStructuredData(obj, key) {
        if (!obj || typeof obj !== 'object')
            return false;
        // Check if the key matches any of our patterns
        for (const { pattern } of structuredDataPatterns) {
            if (pattern.test(key))
                return true;
        }
        // Check for common structured data properties
        const commonProps = ['@type', '@context', 'type', 'id', 'name', 'url', 'description', 'image', 'offers', 'author', 'publisher'];
        const objKeys = Object.keys(obj);
        // If it has some of these common properties, it might be structured data
        return commonProps.some(prop => objKeys.includes(prop));
    }
    // Extract potential structured data from hydration data
    for (const [key, value] of Object.entries(hydrationData)) {
        if (key === 'structuredData')
            continue; // Skip the meta data we already have
        if (isLikelyStructuredData(value, key)) {
            result.hydration[key] = value;
        }
        else if (typeof value === 'object' && value !== null) {
            // Check for nested structured data
            const nestedData = {};
            for (const [nestedKey, nestedValue] of Object.entries(value)) {
                if (isLikelyStructuredData(nestedValue, nestedKey)) {
                    nestedData[nestedKey] = nestedValue;
                }
            }
            if (Object.keys(nestedData).length > 0) {
                result.hydration[key] = nestedData;
            }
        }
    }
    // Look for data attributes in the DOM that might contain structured data
    const dataAttributeData = {};
    // We need to scan all elements since we can't use a wildcard selector for data attributes
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
        // Get all data attributes
        const dataAttributes = Array.from(element.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => ({ name: attr.name.substring(5), value: attr.value }));
        if (dataAttributes.length === 0)
            return; // Skip elements with no data attributes
        dataAttributes.forEach(({ name, value }) => {
            // Try to parse JSON from data attributes
            if (value && (value.startsWith('{') || value.startsWith('['))) {
                try {
                    const parsedValue = JSON.parse(value);
                    if (isLikelyStructuredData(parsedValue, name)) {
                        dataAttributeData[name] = parsedValue;
                    }
                }
                catch (e) {
                    // Not valid JSON, ignore
                }
            }
        });
    });
    if (Object.keys(dataAttributeData).length > 0) {
        result.dataAttributes = dataAttributeData;
    }
    // Extract data from script tags with specific types or IDs
    const scriptData = {};
    // Look for non-JSON-LD script tags that might contain data
    document.querySelectorAll('script:not([type="application/ld+json"])').forEach(script => {
        // Skip scripts with src attribute (external scripts)
        if (script.hasAttribute('src'))
            return;
        // Check for scripts with specific IDs or types that often contain data
        const id = script.getAttribute('id') || '';
        const type = script.getAttribute('type') || '';
        if (id.match(/data|config|settings|state|props|initial/i) ||
            type.match(/json|application\/json|text\/plain/i)) {
            try {
                // Try to extract JSON from the script content
                const content = script.textContent || '';
                const jsonMatch = content.match(/\{.*\}|\[.*\]/s);
                if (jsonMatch) {
                    const parsedData = JSON.parse(jsonMatch[0]);
                    const scriptKey = id || `script_${Object.keys(scriptData).length}`;
                    scriptData[scriptKey] = parsedData;
                }
            }
            catch (e) {
                // Not valid JSON, ignore
            }
        }
    });
    if (Object.keys(scriptData).length > 0) {
        result.scriptData = scriptData;
    }
    // Extract data from HTML comments that might contain JSON
    const commentData = [];
    const nodeIterator = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_COMMENT);
    let commentNode;
    while (commentNode = nodeIterator.nextNode()) {
        const commentText = commentNode.nodeValue || '';
        if (commentText.includes('{') && commentText.includes('}')) {
            try {
                // Try to extract JSON from the comment
                const jsonMatch = commentText.match(/\{.*\}|\[.*\]/s);
                if (jsonMatch) {
                    const parsedData = JSON.parse(jsonMatch[0]);
                    commentData.push(parsedData);
                }
            }
            catch (e) {
                // Not valid JSON, ignore
            }
        }
    }
    if (commentData.length > 0) {
        result.commentData = commentData;
    }
    // Extract data from window.__NEXT_DATA__ (Next.js)
    if (typeof window.__NEXT_DATA__ === 'object') {
        result.nextData = window.__NEXT_DATA__;
    }
    // Extract data from window.__NUXT__ (Nuxt.js)
    if (typeof window.__NUXT__ === 'object') {
        result.nuxtData = window.__NUXT__;
    }
    // Extract data from window.__INITIAL_STATE__ (common in Redux apps)
    if (typeof window.__INITIAL_STATE__ === 'object') {
        result.initialState = window.__INITIAL_STATE__;
    }
    // Extract data from window.__PRELOADED_STATE__ (common in Redux apps)
    if (typeof window.__PRELOADED_STATE__ === 'object') {
        result.preloadedState = window.__PRELOADED_STATE__;
    }
    // Extract data from window.__APOLLO_STATE__ (Apollo GraphQL)
    if (typeof window.__APOLLO_STATE__ === 'object') {
        result.apolloState = window.__APOLLO_STATE__;
    }
    // Extract data from window.REDUX_STATE (another Redux pattern)
    if (typeof window.REDUX_STATE === 'object') {
        result.reduxState = window.REDUX_STATE;
    }
    // Extract data from window.APP_INITIAL_STATE (common pattern)
    if (typeof window.APP_INITIAL_STATE === 'object') {
        result.appInitialState = window.APP_INITIAL_STATE;
    }
    // Extract RDFa data
    const rdfaData = [];
    document.querySelectorAll('[typeof], [property]').forEach(element => {
        const rdfaItem = {};
        const typeOf = element.getAttribute('typeof');
        if (typeOf) {
            rdfaItem.type = typeOf;
        }
        const property = element.getAttribute('property');
        if (property) {
            rdfaItem.property = property;
            rdfaItem.content = element.getAttribute('content') || element.textContent?.trim();
        }
        const resource = element.getAttribute('resource');
        if (resource) {
            rdfaItem.resource = resource;
        }
        if (Object.keys(rdfaItem).length > 0) {
            rdfaData.push(rdfaItem);
        }
    });
    if (rdfaData.length > 0) {
        result.rdfaData = rdfaData;
    }
    return result;
}
/**
 * Searches through all available data for a specific string and returns objects containing that string.
 * @param searchString The string to search for
 * @param data Optional data to search through. If not provided, will call getAllStructuredData()
 * @param printReport Whether to print a formatted report to the console (default: true)
 * @returns An object with root objects and a map of paths to the actual values found
 */
function searchAllData(searchString, data, printReport = true) {
    searchString = searchString.toLowerCase();
    const allData = data || getAllStructuredData();
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
                if (typeof value === 'string' && value.toLowerCase().includes(searchString)) {
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
                        if (typeof item === 'string' && item.toLowerCase().includes(searchString)) {
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
    // Start the search from each top-level object in all data
    for (const key in allData) {
        seen.clear(); // Reset seen set for each root object
        searchInObject(allData[key], key, key, allData[key]);
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
// Add a small button to copy structured data
function addCopyButton() {
    // Create button element
    const button = document.createElement('button');
    button.textContent = '{}';
    button.title = 'Copy all structured data';
    // Style the button
    button.style.position = 'fixed';
    button.style.bottom = '10px';
    button.style.right = '10px';
    button.style.zIndex = '9999';
    button.style.fontSize = '16px';
    button.style.padding = '5px 8px';
    button.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.opacity = '0.5';
    button.style.transition = 'opacity 0.3s';
    // Add hover effect
    button.addEventListener('mouseover', () => {
        button.style.opacity = '1';
    });
    button.addEventListener('mouseout', () => {
        button.style.opacity = '0.5';
    });
    // Add click handler to copy data
    button.addEventListener('click', async () => {
        try {
            // Get all structured data
            const allData = getAllStructuredData();
            // Convert to JSON string with pretty formatting
            const jsonString = JSON.stringify(allData, null, 2);
            // Copy to clipboard
            await navigator.clipboard.writeText(jsonString);
            // Show success message
            const originalText = button.textContent;
            button.textContent = '✓';
            button.style.backgroundColor = 'rgba(0, 128, 0, 0.7)';
            // Reset button after 2 seconds
            setTimeout(() => {
                button.textContent = originalText;
                button.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            }, 2000);
            console.log('Structured data copied to clipboard');
        }
        catch (error) {
            // Show error message
            button.textContent = '✗';
            button.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
            // Reset button after 2 seconds
            setTimeout(() => {
                button.textContent = '{}';
                button.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            }, 2000);
            console.error('Failed to copy structured data:', error);
        }
    });
    // Add button to the page
    document.body.appendChild(button);
}
// Call the function to add the button
setTimeout(addCopyButton, 1000); // Delay to ensure the page is loaded
// Make the functions available globally
window.getHydration = getHydration;
window.searchHydration = searchAllData;
window.searchAllData = searchAllData;
window.getStructuredDataFromMeta = getStructuredDataFromMeta;
window.getAllStructuredData = getAllStructuredData;
console.log(`Available functions:
- getHydration(): Get the hydration data and structured data from meta tags.
- searchHydration("your search string"): Find objects containing that string in hydration data.
- searchAllData("your search string"): Find objects containing that string in ALL structured data.
- getStructuredDataFromMeta(): Only get structured data from meta tags.
- getAllStructuredData(): Get all structured data from both hydration and meta tags.`);
