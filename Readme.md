# AI Agent with Adaptive Memory

An intelligent document processing agent that learns from human feedback. This project implements a **Memory Layer** on top of invoice extraction to fix recurring errors, normalize data, and reduce manual review time.

## Key Features

* **Adaptive Learning:** Automatically learns vendor-specific patterns (e.g., "Supplier GmbH always misses the Service Date") from human corrections.
* **Confidence-Based Logic:** Only applies learned corrections when confidence is high (>70%), preventing "bad habits" from forming.
* **Audit Trail:** detailed logging of every recall, application, and learning event for explainability.
* **No-Training Approach:** Uses heuristic memory and direct feedback loops instead of black-box model retraining.

## Setup & Usage

### Prerequisites
* Node.js (v18 or higher)
* npm

### Installation
1.  Clone the repository.
2.  Install dependencies:
```bash
    npm install
```

### Running the Demo
This project includes a fully automated simulation (`src/index.ts`) that demonstrates the agent learning over time.

To run the demo:
```bash
npx tsx src/index.ts
```

### What to Expect in the Demo Output
1. Invoice #1 (The "Teacher"): The agent processes a new invoice. It finds no relevant memory, so it flags an error (missing Service Date). A "Human" applies a fix.
2. Learning Step: The agent analyzes the human's fix and creates a new memory pattern.
3. Invoice #2 (The "Student"): A similar invoice arrives. The agent Recalls the memory, Applies the fix automatically, and approves the invoice without human intervention.

## Architecture & Design Logic
The system follows a strict 4-step cognitive loop for every invoice:

### 1. Recall (Context Retrieval)
Before processing, the agent queries its local database (`db.json`) for memories associated with the specific Vendor.
* Why? This limits the search space and prevents cross-vendor contamination (e.g., applying a rule for "Amazon" to "Google").

### 2. Apply (Heuristic Application)
The agent iterates through recalled memories.
* Confidence Check: A memory is only applied if its `confidence` score exceeds `0.7`.
* Non-Destructive: The agent creates a "Normalized" version of the invoice data, leaving the raw extraction untouched for auditing.

### 3. Decide (Review Thresholds)
* Auto-Approve: If all fields are valid and high-confidence memories were applied successfully.
* Flag for Review: If the agent proposes corrections but has low confidence, or if critical fields are still missing.

### 4. Learn (Reinforcement Loop)
When a human submits a correction (`HumanCorrection` object):
* New Pattern: If the specific correction hasn't been seen before, a new memory is created with an initial confidence (e.g., 0.6).
* Reinforcement: If the pattern already exists, its confidence score is boosted (e.g., +0.1), making it more likely to be auto-applied next time.

## Project Structure
* `src/index.ts` - Main entry point and demo runner.
* `src/memory.ts` - Logic for recalling and applying patterns.
* `src/learning.ts` - Logic for analyzing corrections and updating the DB.
* `src/db.ts` - Persistence layer (LowDB / JSON).
* `src/types.ts` - TypeScript interfaces for Invoices, Memories, and Logs.
* `src/data.ts` - Sample data scenarios for the simulation.

## Future Improvements
* Regex Pattern Storage: Currently, memories store static values. Future versions will store Regex patterns to handle dynamic dates or flexible formats.
* Vector Database: Switch from JSON/LowDB to a vector store for semantic search (finding "similar" vendors, not just exact matches).
* Decay Function: Implement memory decay where unused memories slowly lose confidence over time.