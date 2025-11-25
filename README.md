# Rhombus AI - Intelligent Data Cleaning Assistant

A full-stack web application that leverages Large Language Models (LLMs) to allow users to clean, filter, and transform spreadsheet data (CSV/Excel) using natural language commands. https://rhombus-phi.vercel.app/

## Features

### 1. Smart Pattern Replace (Regex)
Describe what you want to find and replace in plain English. The AI generates the complex Regex pattern and the replacement value automatically.

* **Example:** "Redact all email addresses."
* **Example:** "Replace dates in the format YYYY-MM-DD with DD/MM/YYYY."
* **Tech:** Uses GPT-4 to generate Python Regex and Pandas to apply it efficiently.

### 2. Natural Language Row Filtering
Filter your dataset without writing complex queries.

* **Example:** "Remove rows where 'Units Sold' is less than 5000."
* **Example:** "Keep only rows where 'Status' is 'Pending'."
* **Tech:** Converts prompts into Pandas `.query()` strings, handling column names with spaces automatically.

### 3. AI Math Columns (Data Enrichment)
Create new calculated columns based on existing data.

* **Example:** "Create a 'Total Profit' column by multiplying 'Unit Price' by 'Units Sold' and subtracting 'Unit Cost'."
* **Tech:** Generates safe Pandas `.eval()` expressions using the Python engine for robust parsing.

### 4. Robust File Handling
* **Formats:** Supports CSV and Excel (`.xlsx`) files.
* **Large File Support:** Optimized preview system reads only the first 200 rows for the UI to prevent browser crashes, while processing the full dataset on the backend.
* **Undo/Redo:** Full history stack allows users to step back through their changes.

## Tech Stack

### Backend
* **Django & Django REST Framework:** API architecture.
* **Pandas & NumPy:** High-performance data manipulation.
* **OpenAI API:** Intelligence layer for Regex/Query generation.
* **Gunicorn:** WSGI HTTP Server for deployment.

### Frontend
* **React (TypeScript):** Component-based UI.
* **Tailwind CSS:** Responsive styling.
* **Axios:** API communication.

---

## Installation & Setup

### Prerequisites
* Python 3.12+
* Node.js & npm
* OpenAI API Key

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up Environment Variables
# Create a .env file in /backend and add:
export OPENAI_API_KEY="sk-your-api-key-here"

# Run Migrations & Start Server
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start React Dev Server
npm start
```
The application should now be running at http://localhost:3000.
