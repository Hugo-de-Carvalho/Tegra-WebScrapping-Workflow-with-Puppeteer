# 🤖 AI-Powered Web Scraper & Knowledge Base Builder

An automated **n8n workflow** that scrapes dynamic websites, handles anti-bot protections (CAPTCHA/Cloudflare), processes content using **Google Gemini AI**, and builds a structured knowledge base in **Supabase**.

![n8n](https://img.shields.io/badge/n8n-Workflow-orange?style=flat-square&logo=n8n)
![Puppeteer](https://img.shields.io/badge/Puppeteer-Scraping-green?style=flat-square&logo=puppeteer)
![Gemini](https://img.shields.io/badge/Gemini-AI-blue?style=flat-square&logo=google-gemini)
![Supabase](https://img.shields.io/badge/Supabase-Vector%20DB-emerald?style=flat-square&logo=supabase)

## 📋 Project Overview

This tool allows users to input a list of URLs and specific extraction instructions via a **Google Sheet**. The system autonomously:

1.  **Navigates** to the target URLs using a headless browser (Puppeteer).
2.  **Overcomes** obstacles like CAPTCHAs or blocking using a smart fallback system (Diamond Logic).
3.  **Crawls** internal links (subpages) to gather comprehensive context.
4.  **Processes** the raw text with LLMs (**Gemini 2.0 Flash**) to intelligently chunk and structure data based on user instructions.
5.  **Stores** the results in a Vector Database (**Supabase**) for future RAG (Retrieval-Augmented Generation) applications.

---

## ✨ Key Features

### 🛡️ Robust Error Handling & "Diamond Logic"
The workflow implements a sophisticated decision tree for scraping:
* **Primary Path:** Tries to scrape using Puppeteer with a 10s timeout.
* **CAPTCHA Detection:** If a CAPTCHA is detected, it routes the request to the **2Captcha API** for resolution.
* **Fallback Mechanism:** If Puppeteer fails (timeout/blocking) and it's not a CAPTCHA, it automatically switches to a **CloudScraper** service (simulated via HTTP Request) to retrieve the HTML.

### 🧠 Intelligent AI Processing
* **Dynamic Instructions:** The AI adapts its extraction logic based on the `instructions` column in the spreadsheet (e.g., "Extract prices", "Summarize biography", "List technical specs").
* **Smart Chunking:** Splits content into logical blocks (~800-1000 tokens) with context overlap, preserving paragraph boundaries.

### ⚡ Performance & Integrity
* **Duplicate Detection (Bonus):** Before processing, the system checks Supabase to see if the URL already exists. If found, it skips processing to save resources and API costs.
* **Status Tracking:** Real-time updates in Google Sheets (`processing`, `completed`, `failed`) with detailed error notes in case of failure.

---

## 🛠️ Tech Stack

* **Orchestration:** n8n (Self-hosted / Cloud)
* **Scraping:** n8n Puppeteer Node + HTTP Request (Fallback)
* **AI/LLM:** Google Gemini 2.0 Flash
* **Database:** Supabase (PostgreSQL + pgvector extension)
* **Frontend/Input:** Google Sheets
* **CAPTCHA Solver:** 2Captcha API

---

## ⚙️ Setup & Installation

### 1. Database Setup (Supabase)
Run the following SQL query in your Supabase **SQL Editor** to create the required table and enable vector support:

```sql
-- Enable the vector extension
create extension if not exists vector;

-- Create the main table for storing scraped chunks
create table scraped_content (
  id bigint primary key generated always as identity,
  source_url text,
  chunk_text text,
  chunk_index integer,
  total_chunks integer,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
````

### 2\. Google Sheet Structure

Create a new Google Sheet with the following headers in **Row 1**:

| Column | Description | Example |
| :--- | :--- | :--- |
| `url` | The target website to scrape | `https://quotes.toscrape.com` |
| `instructions` | Specific goals for the AI | `Extract all quotes about life` |
| `status` | Current state (leave 'pending') | `pending` |
| `last_updated` | Timestamp of last action | *(Leave empty)* |
| `error_notes` | Logs for debugging | *(Leave empty)* |

### 3\. Import Workflow to n8n

1.  Open your n8n dashboard.
2.  Click the menu (top right) `...` \> **Import from File**.
3.  Select the provided `workflow.json` file.

### 4\. Configure Credentials

You need to set up the following credentials in n8n:

  * **Google Sheets:** Service Account or OAuth2.
  * **Google Gemini:** Your PaLM/Gemini API Key.
  * **Supabase:** Your Project URL and Service Role Key.
  * **2Captcha (Optional):** Add your API Key in the query parameters of the 2Captcha node.



### 5. Challenge: What was the most difficult part and how did you solve it?
**The Challenge:** Orchestrating the "Diamond Logic" for error handling and data normalization.
Specifically, creating a seamless fallback system where the workflow splits into different paths (Puppeteer vs. CloudScraper vs. 2Captcha) but merges back into a single extraction logic. A major issue was ensuring that different nodes, which output data in different structures (e.g., `json.body` vs. `json.page_text` vs. `json.content`), could be processed by the same downstream nodes without errors.

**The Solution:**
* **Architectural:** I implemented a robust branching logic using `If` nodes to classify errors (CAPTCHA vs. Timeouts) and route them to the specific solver.
* **Data Normalization:** I wrote a flexible JavaScript adapter in the "Retrieve and Consolidate" node. Instead of relying on a single hardcoded property, the code dynamically checks multiple potential keys (`subpage_text || page_text || body`) to ensure that regardless of which path the data came from (Success or Fallback), the final output is always consistent for the AI processing step.

### 6. Scaling: If we needed to process 500 URLs daily, what would you change?
Processing 500 URLs strictly sequentially (as currently implemented) would be inefficient and risky for IP bans. To scale, I would implement:

1.  **Parallel Processing (Batching):** Instead of a simple "Loop Over Items", I would use n8n's **Split In Batches** node combined with parallel execution configuration to process 5 to 10 URLs concurrently, significantly reducing total runtime.
2.  **Rotating Proxies:** To avoid rate limiting or IP bans from target sites like Cloudflare, I would integrate a proxy rotation service (like BrightData or Smartproxy) into the Puppeteer and HTTP Request nodes.
3.  **Queue System:** For higher reliability, I would decouple the "Fetcher" from the "Processor". The scraper would push raw HTML to a queue (e.g., Redis or RabbitMQ), and a separate worker workflow would pull, process with AI, and save to Supabase. This prevents a single browser crash from stopping the entire batch.

### 7. Improvement: Name one feature you'd add given more time
**Automated Visual Debugging & Monitoring.**
Currently, if a scrape fails, we get a text error in Google Sheets. Given more time, I would implement:
* **Screenshot Uploads:** Configure Puppeteer to take a screenshot upon failure and upload it to an S3 bucket or Supabase Storage, linking the image URL to the "Error Notes" in the spreadsheet. This would allow for instant visual diagnosis of why a page failed (e.g., a changed layout, a specific popup, or a new type of CAPTCHA).

-----

## 🚀 Usage Guide

1.  Add URLs to your Google Sheet and set `status` to **pending**.
2.  (Optional) Add specific `instructions` for each URL.
3.  Run the workflow manually (click **Execute Workflow**) or activate the Schedule Trigger.
4.  Watch the `status` column in Google Sheets update to **completed**.
5.  Check your Supabase table to see the structured, chunked data ready for RAG.

-----

## 📝 Bonus Implementation Details

**Duplicate Detection Logic:**
To ensure data consistency and avoid redundancy, a check was implemented at the end of the pipeline.

1.  **Query:** `GET` request to Supabase filtering by `source_url`.
2.  **Logic:**
      * If **Found**: The workflow updates the sheet to `completed` immediately (skipping the Insert step).
      * If **Not Found**: The workflow proceeds to insert the new chunks and embeddings.

-----

**Author:** Hugo Lopes
**Project:** Tegra - WebScrapping Workflow with Puppeteer
