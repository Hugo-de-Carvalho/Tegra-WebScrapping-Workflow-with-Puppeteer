// 1. Retrieve All Scraped Items
// We access all items returned by the previous node (the subpages data).
// Using $input.all() ensures we get the full list of processed subpages.
const items = $input.all();
let combinedText = "";

// 2. Extract Main Page Content (Optional)
// If the workflow passed a "parent_text" property from the main page, we add it first.
if (items.length > 0 && items[0].json.parent_text) {
  combinedText += "=== MAIN PAGE CONTENT ===\n";
  combinedText += items[0].json.parent_text + "\n\n";
}

// 3. Extract Subpages Content (ROBUST METHOD)
// We loop through every visited subpage and append its text.
for (const item of items) {
  // CRITICAL FIX: We try to find the content in multiple possible property names.
  // Puppeteer often outputs to 'body', while other nodes might use 'page_text' or 'text'.
  const pageContent = item.json.subpage_text || item.json.page_text || item.json.body || item.json.text || "";

  // Only append if we actually found substantial text (more than 10 chars)
  if (pageContent && pageContent.length > 10) { 
    // Use the specific URL as a header, or a generic label if missing
    const urlHeader = item.json.url ? item.json.url : "Generic Subpage";
    
    combinedText += `=== SUBPAGE: ${urlHeader} ===\n`;
    combinedText += pageContent + "\n\n";
  }
}

// 4. Retrieve Original Source URL (Safety Check)
// We attempt to preserve the original URL for database consistency.
let originalUrl = $input.first().json.url; // Default fallback
try {
    if (items.length > 0 && items[0].json.url) {
         originalUrl = items[0].json.url;
    }
} catch(e) {
    // If URL retrieval fails, we keep the default to prevent workflow crash
}

// 5. Return Consolidated Data
// We ALWAYS return an item, even if text is empty, to prevent "No output data returned" errors.
return [{
  json: {
    source_url: originalUrl,
    full_content: combinedText || "WARNING: No text found. Please check variable names in the Input panel."
  }
}];