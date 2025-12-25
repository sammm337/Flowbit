# AI Agent with Adaptive Memory

An intelligent document processing agent that learns from human feedback. This project implements a Memory Layer on top of invoice extraction to fix recurring errors, normalize data, detect duplicates, and reduce manual review time.

## Key Features

* **Adaptive Learning:** Automatically learns vendor-specific patterns (e.g., "Supplier GmbH always calls Service Date 'Leistungsdatum'") from human corrections.
* **Duplicate Detection:** Checks historical invoice data to flag potential duplicates (same vendor, same ID, close date) before processing.
* **Confidence-Based Logic:** Only applies learned corrections when confidence is high (>70%), preventing "bad habits" from forming.
* **Structured Output:** Generates a comprehensive output.json file containing the processing results, reasoning, and audit trails for all invoices.
* **Audit Trail:** Detailed logging of every "Recall", "Apply", "Decide", and "Learn" step for full explainability.
* **No-Training Approach:** Uses heuristic memory and direct feedback loops instead of black-box model retraining.

## Tech Stack

* **Language:** TypeScript (Node.js)
* **Persistence:** LowDB (JSON file-based database)
* **Utilities:** Lodash

## Setup & Usage

### Prerequisites

* Node.js (v18 or higher)
* npm

### Installation

1. Clone the repository.
2. Install dependencies:
```bash
npm install
```

### Running the Demo

This project includes a fully automated simulation (src/index.ts) that processes a sequence of invoices to demonstrate the learning capabilities. To run the demo:
```bash
npx tsx src/index.ts
```

### Checking the Output

Upon completion, the script will generate a file named output.json in the root directory.

This JSON file contains the detailed processing results for every invoice in the simulation, including:

* **normalizedInvoice:** The final data after memory application.
* **proposedCorrections:** List of changes applied by the agent.
* **reasoning:** Why the agent made those decisions.
* **auditTrail:** A step-by-step log of the agent's internal process.

## Architecture & Design Logic

The system follows a strict 4-step cognitive loop for every invoice:

### 1. Recall (Context Retrieval)

The agent queries its local database (db.json) for memories associated with the specific Vendor. This limits the search space and prevents cross-vendor contamination.

### 2. Apply (Heuristic Application)

The agent iterates through recalled memories:

* **Pattern Matching:** Uses Regex patterns (e.g., for Date/Currency) or static rules (e.g., for SKU mapping).
* **Confidence Check:** Memories are only applied if their confidence score exceeds the threshold (0.7).

### 3. Detect (Duplicate Check)

The agent checks the invoice history to ensure this specific invoice hasn't been processed recently.

* **Logic:** Matches Invoice ID + Vendor + Date (within a 7-day window).
* **Action:** If a duplicate is found, the confidence is dropped to 0.0 and it is flagged for review.

### 4. Decide (Review Thresholds)

* **Auto-Approve:** If all fields are valid, high-confidence memories were applied, and no duplicates were found.
* **Flag for Review:** If critical fields are missing, duplicates are suspected, or confidence is low.

### 5. Learn (Reinforcement Loop)

When a human submits a correction (HumanCorrection):

* **New Pattern:** If the correction is new, a new memory is created.
* **Reinforcement:** If the pattern already exists, its confidence score is boosted (e.g., +0.1).

## Project Structure

* **src/index.ts:** Main entry point and demo runner. Handles the simulation flow and file output.
* **src/memory.ts:** Core logic for recalling and applying memory patterns.
* **src/learning.ts:** Logic for analyzing human corrections to create or reinforce memories.
* **src/db.ts:** Persistence layer for Memories and Invoice History.
* **src/types.ts:** TypeScript interfaces for the data models.
* **src/data.ts:** Sample data scenarios (Invoices and Corrections) used in the demo.
* **src/utils.ts:** Helper functions for Regex extraction and duplicate checking.
* **output.json:** Generated report of the agent's performance.
* **db.json:** Local database storage.

## Future Improvements

* **Vector Database:** Switch from JSON/LowDB to a vector store for semantic search (finding "similar" vendors, not just exact matches).
* **Confidence Decay:** Implement a decay function where unused memories slowly lose confidence over time to ensure relevance.