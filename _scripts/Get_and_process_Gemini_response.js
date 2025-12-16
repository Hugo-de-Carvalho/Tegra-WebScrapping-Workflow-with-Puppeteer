// 1. GET GEMINI RESPONSE (NATIVE NODE)
// Access the text from the specific structure of the n8n Gemini node
// Structure: content -> parts[0] -> text
const part = $input.first().json.content.parts[0];
const aiText = part ? part.text : "[]";

// 2. CLEAN MARKDOWN FORMATTING
// Gemini often wraps the JSON in ```json ... ``` blocks. We must remove them.
const cleanJson = aiText.replace(/```json/g, "").replace(/```/g, "").trim();

// 3. PARSE JSON
let chunks = [];
try {
    chunks = JSON.parse(cleanJson);
} catch (e) {
    // Fallback: If parsing fails, treat the whole response as one chunk
    chunks = [cleanJson];
}

// 4. RETRIEVE SOURCE URL (DYNAMIC)
// Fetch the URL directly from the Loop node (the source of truth for the flow)
let sourceUrl = "";
try {
    // Get the URL currently being processed by the loop
    sourceUrl = $('Loop Over Items').first().json.url;

    // Clean the trailing slash (/) if present to ensure it matches the Spreadsheet exactly
    if (sourceUrl) {
        sourceUrl = sourceUrl.replace(/\/$/, "");
    }
} catch(e) {
    // Fallback: If the loop node is not found, return a default error string
    sourceUrl = "URL_NOT_FOUND";
}

// 5. GENERATE MOCK EMBEDDINGS (REQUIRED FOR SUPABASE)
// Create a fake 1536-dimension vector (standard size) to satisfy the table schema
const mockEmbedding = Array(1536).fill(0.0123);

// 6. RETURN FORMATTED DATA
return chunks.map((chunkText, index) => ({
    json: {
        source_url: sourceUrl,
        chunk_text: chunkText,
        chunk_index: index,
        total_chunks: chunks.length,
        embedding: mockEmbedding,
        metadata: {
            processed_by: "Gemini 2.0 Flash",
            timestamp: new Date().toISOString()
        }
    }

}));
