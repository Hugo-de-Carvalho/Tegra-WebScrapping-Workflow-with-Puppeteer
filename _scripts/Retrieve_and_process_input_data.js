// 1. Retrieve Input Data
const inputData = $input.first().json;
const foundLinks = inputData.links || [];

// 2. Define Base URL
// Get the current URL from the Loop node to ensure relative links work correctly
const baseurl = $('Loop Over Items').first().json.url;

// 3. Process Links
// We limit the output to 10 links and ensure correct URL formatting
const finalLinks = foundLinks.slice(0, 10).map(link => {
    try {
        // Try to use the native URL constructor (the best practice)
        return new URL(link, baseurl).href;
    } catch (e) {
        // MANUAL FALLBACK (Plan B if the URL constructor fails)
        // Logic: Checks if the slash is missing between the domain and the page.
        let safeBase = baseurl;
        let safeLink = link;
        
        // Ensure the base URL ends with a slash
        if (!safeBase.endsWith("/")) safeBase += "/";
        
        // Ensure the link DOES NOT start with a slash (to avoid double slashes like //)
        if (safeLink.startsWith("/")) safeLink = safeLink.substring(1);
        
        return safeBase + safeLink;
    }
});

// 4. Return Output

return finalLinks.map(url => ({ json: { url } }));
