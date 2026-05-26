# Visa Settlement VSS-110 Data Extractor

A production-ready Python web application that parses Visa settlement text report files (.txt), extracts independent **VSS-110** records using regex, previews the extracted data in an interactive dashboard, and exports the parsed rows into a beautifully formatted Excel (.xlsx) file using `pandas` and `openpyxl`.

This repository is dual-purposed:
1. **Interactive Demo App**: Contains a functional live proof-of-concept configured in React + TypeScript + Vite, running automatically in this workspace preview.
2. **Production-Ready Python Server**: Includes the complete, modular Python codebase (`app.py`, `utils/parser.py`, `utils/excel_export.py`) ready for local execution or container deployment using standard tools.

---

## 📂 Project Structure

```text
├── app.py                     # Main Flask web app entrypoint and API routers
├── requirements.txt           # Python application dependencies list
├── utils/
│   ├── __init__.py            # Module initializer
│   ├── parser.py              # Regex matching engine for independent VSS-110 reports
│   └── excel_export.py        # pandas + openpyxl spreadsheet styling pipeline
├── templates/
│   └── index.html             # Dashboard UI template utilizing Tailwind responsive CSS
├── static/
│   └── style.css              # Custom layout style rules
├── README.md                  # Comprehensive run instructions and documentation
```

---

## ⚙️ How the Parsing Logic Works

The extractor parses raw settlement documents using highly specific **regular expressions** designed to match Visa financial reports while discarding neighboring tables or other report block identifiers (like VSS-120 or VSS-130).

### 1. Section Isolator Pattern
Isolates only text boundaries starting with the `VSS-110` header and ending with the corresponding footer.
```regex
r'REPORT ID:\s+VSS-110.*?\*\*\*\s+END OF VSS-110 REPORT\s+\*\*\*'
```
*Compiled with multi-line flags to handle independent sections with multiple occurrences.*

### 2. Header Fields Patterns
Extracted from inside each isolated section:
- **REPORTING FOR**: Matches `REPORTING FOR:\s*([^\n\r]+)`
- **REPORT DATE**: Matches `REPORT DATE:\s*([^\s\n\r]+)`
- **SETTLEMENT CURRENCY**: Matches `SETTLEMENT CURRENCY:\s*([A-Za-z0-9]+)`

### 3. Financial Rows Patterns
Extracts the raw Credit, Debit, and Total amounts specifically from `TOTAL ISSUER` rows while strictly ignoring adjacent rows under headers like `TOTAL OTHER`.

- **Reimbursement Fees row target**:
  ```regex
  r'REIMBURSEMENT FEES.*?TOTAL ISSUER\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+(?:CR|DB)?)'
  ```
- **Visa Charges row target**:
  ```regex
  r'VISA CHARGES.*?TOTAL ISSUER\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+(?:CR|DB)?)'
  ```

---

## 🚀 Execution & Running Instructions

Follow these steps to run the **Python Flask Web Application** locally on your computer.

### Prerequisites
Make sure you have **Python 3.10** or higher installed on your system.

### 1. Set Up Virtual Environment (Recommended)
Navigate to the project root directory in your terminal and create a isolated environment:
```bash
# Create virtual environment
python -m venv venv

# Activate on Windows:
venv\Scripts\activate

# Activate on macOS/Linux:
source venv/bin/activate
```

### 2. Install Required Dependencies
Install the required packages declared in `requirements.txt`:
```bash
pip install -r requirements.txt
```

### 3. Run the Development Server
Launch the Flask server:
```bash
python app.py
```
By default, the server spins up on **`http://localhost:3000`** (or uses your environment's allocated `PORT`). 

Open your browser to [http://localhost:3000](http://localhost:3000) to upload, parse, and export settlement files!

---

## 🐳 Docker Deployment Support

This app can easily be containerized with Docker to run uniformly in any cloud environment (Cloud Run, AWS ECS, GCP, Azure, etc.).

### 1. Create a `Dockerfile`
Create a file named `Dockerfile` in the root folder with this content:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system utilities if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3000

ENV PORT=3000
ENV FLASK_ENV=production

CMD ["gunicorn", "--bind", "0.0.0.0:3000", "app:app"]
```

### 2. Build & Run the Container
```bash
# Build the Docker image
docker build -t visa-extractor-vss110 .

# Run the container mapping host port 3000 to container port 3000
docker run -d -p 3000:3000 visa-extractor-vss110
```

---

## 📊 Excel Output Quality Settings
The exported `.xlsx` file includes standard enterprise polish adjustments implemented inside our spreadsheet engine:
- **Auto-Width columns**: Columns automatically stretch based on the longest cell value to prevent scientific formats or `###` display truncation.
- **Bold Dark Navy headers**: Solid professional dark navy theme header block (`#1F4E79`) using clean Segoe UI typography.
- **Numeric alignment**: Numbers and amounts are automatically aligned to the **right**, and standard codes are centered.
- **Timestamped download naming**: Saved under standard format: `VSS110_Output_<YYYYMMDD_HHMMSS>.xlsx`.
