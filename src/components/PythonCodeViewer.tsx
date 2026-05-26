import { useState } from 'react';
import { Copy, Check, FileCode, Code, Server, FileText, Download } from 'lucide-react';

interface CodeFile {
  name: string;
  path: string;
  icon: any;
  language: string;
  code: string;
}

export default function PythonCodeViewer() {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);

  const pythonFiles: CodeFile[] = [
    {
      name: "app.py",
      path: "/app.py",
      icon: Server,
      language: "python",
      code: `import os
import io
import logging
from flask import Flask, request, jsonify, render_template, send_file, make_response
from utils.parser import parse_vss110_text
from utils.excel_export import generate_excel_bytes

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(name)s: %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 # Max 16MB file

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/process', methods=['POST'])
def process_file():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file portion uploaded"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "error": "No file selected"}), 400
    if not file.filename.lower().endswith('.txt'):
        return jsonify({"success": False, "error": "Invalid format - only .txt supported"}), 400

    try:
        file_content = file.read().decode('utf-8', errors='replace')
        records = parse_vss110_text(file_content)
        logger.info(f"Successfully processed {file.filename}. Found {len(records)} entries.")
        return jsonify({"success": True, "filename": file.filename, "count": len(records), "data": records})
    except Exception as e:
        logger.exception("Unexpected error during file processing")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/download', methods=['POST'])
def download_excel():
    try:
        content = request.get_json()
        if not content or 'data' not in content:
            return jsonify({"success": False, "error": "No data provided"}), 400
        excel_bytes, filename = generate_excel_bytes(content['data'])
        response = make_response(send_file(
            io.BytesIO(excel_bytes),
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=filename
        ))
        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        return response
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 3000))
    app.run(host='0.0.0.0', port=port, debug=True)`
    },
    {
      name: "parser.py",
      path: "/utils/parser.py",
      icon: Code,
      language: "python",
      code: `import re
import logging

logger = logging.getLogger(__name__)

def parse_vss110_text(text: str) -> list:
    """
    Parses a Visa Settlement text report and extracts VSS-110 report data.
    """
    # 1. Isolating sections
    section_pattern = re.compile(
        r'(REPORT ID:\\s+VSS-110.*?\\*\\*\\*\\s+END OF VSS-110 REPORT\\s+\\*\\*\\*)', 
        re.DOTALL
    )
    sections = section_pattern.findall(text)
    parsed_reports = []
    
    for idx, sec in enumerate(sections, 1):
        try:
            # 2. Extract standard fields
            reporting_for_match = re.search(r'REPORTING FOR:\\s*([^\\n\\r]+)', sec)
            reporting_for = reporting_for_match.group(1).strip() if reporting_for_match else "UNKNOWN"
            
            report_date_match = re.search(r'REPORT DATE:\\s*([^\\s\\n\\r]+)', sec)
            report_date = report_date_match.group(1).strip() if report_date_match else "UNKNOWN"
            
            settlement_currency_match = re.search(r'SETTLEMENT CURRENCY:\\s*([A-Za-z0-9]+)', sec)
            settlement_currency = settlement_currency_match.group(1).strip() if settlement_currency_match else "UNKNOWN"
            
            # 3. Extract Reimbursement Fees Block
            reimb_section_match = re.search(r'REIMBURSEMENT FEES.*?(?:TOTAL ISSUER\\s+([\\d,]+\\.\\d+)\\s+([\\d,]+\\.\\d+)\\s+([\\d,]+\\.\\d+(?:CR|DB)?))', sec, re.DOTALL)
            reimb_credit, reimb_debit, reimb_total = "0.00", "0.00", "0.00"
            if reimb_section_match:
                reimb_credit = reimb_section_match.group(1)
                reimb_debit = reimb_section_match.group(2)
                reimb_total = reimb_section_match.group(3)
            else:
                reimb_sec_block = re.search(r'REIMBURSEMENT FEES.*?(?=VISA CHARGES|TOTAL OTHER|$)', sec, re.DOTALL)
                if reimb_sec_block:
                    reimb_match = re.search(r'TOTAL ISSUER\\s+([\\d,]+\\.\\d+)\\s+([\\d,]+\\.\\d+)\\s+([\\d,]+\\.\\d+(?:CR|DB)?)', reimb_sec_block.group(0))
                    if reimb_match:
                        reimb_credit = reimb_match.group(1)
                        reimb_debit = reimb_match.group(2)
                        reimb_total = reimb_match.group(3)

            # 4. Extract Visa Charges Block
            visa_section_match = re.search(r'VISA CHARGES.*?(?:TOTAL ISSUER\\s+([\\d,]+\\.\\d+)\\s+([\\d,]+\\.\\d+)\\s+([\\d,]+\\.\\d+(?:CR|DB)?))', sec, re.DOTALL)
            visa_credit, visa_debit, visa_total = "0.00", "0.00", "0.00"
            if visa_section_match:
                visa_credit = visa_section_match.group(1)
                visa_debit = visa_section_match.group(2)
                visa_total = visa_section_match.group(3)
            else:
                visa_sec_block = re.search(r'VISA CHARGES.*?(?=\\*\\*\\* END|$)', sec, re.DOTALL)
                if visa_sec_block:
                    visa_match = re.search(r'TOTAL ISSUER\\s+([\\d,]+\\.\\d+)\\s+([\\d,]+\\.\\d+)\\s+([\\d,]+\\.\\d+(?:CR|DB)?)', visa_sec_block.group(0))
                    if visa_match:
                        visa_credit = visa_match.group(1)
                        visa_debit = visa_match.group(2)
                        visa_total = visa_match.group(3)

            parsed_reports.append({
                "REPORT_ID": "VSS-110",
                "REPORTING_FOR": reporting_for,
                "REPORT_DATE": report_date,
                "SETTLEMENT_CURRENCY": settlement_currency,
                "REIMBURSEMENT_FEES_CREDIT": reimb_credit,
                "REIMBURSEMENT_FEES_DEBIT": reimb_debit,
                "REIMBURSEMENT_FEES_TOTAL": reimb_total,
                "VISA_CHARGES_CREDIT": visa_credit,
                "VISA_CHARGES_DEBIT": visa_debit,
                "VISA_CHARGES_TOTAL": visa_total
            })
        except Exception as e:
            logger.error(f"Error parsing section index {idx}: {str(e)}")
            
    return parsed_reports`
    },
    {
      name: "excel_export.py",
      path: "/utils/excel_export.py",
      icon: FileCode,
      language: "python",
      code: `import pandas as pd
import io
import datetime
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def generate_excel_bytes(data: list) -> tuple:
    """
    Generates a beautifully formatted Excel file using pandas and openpyxl.
    """
    columns = [
        "REPORT_ID", "REPORTING_FOR", "REPORT_DATE", "SETTLEMENT_CURRENCY",
        "REIMBURSEMENT_FEES_CREDIT", "REIMBURSEMENT_FEES_DEBIT", "REIMBURSEMENT_FEES_TOTAL",
        "VISA_CHARGES_CREDIT", "VISA_CHARGES_DEBIT", "VISA_CHARGES_TOTAL"
    ]
    df = pd.DataFrame(data, columns=columns)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"VSS110_Output_{timestamp}.xlsx"
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name="VSS-110 Reports")
        
        workbook = writer.book
        worksheet = writer.sheets["VSS-110 Reports"]
        
        # Style Definitions
        font_header = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
        fill_header = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
        font_data = Font(name="Segoe UI", size=10)
        
        align_center = Alignment(horizontal="center", vertical="center")
        align_left = Alignment(horizontal="left", vertical="center")
        align_right = Alignment(horizontal="right", vertical="center")
        
        thin_border = Border(
            left=Side(style="thin", color="D9D9D9"),
            right=Side(style="thin", color="D9D9D9"),
            top=Side(style="thin", color="D9D9D9"),
            bottom=Side(style="thin", color="D9D9D9")
        )
        
        # Apply Header Styling
        worksheet.row_dimensions[1].height = 26
        for col_idx in range(1, len(columns) + 1):
            cell = worksheet.cell(row=1, column=col_idx)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = align_center
            cell.border = thin_border
            
        # Apply Data Row Styling
        for r_idx in range(2, len(df) + 2):
            worksheet.row_dimensions[r_idx].height = 20
            for c_idx in range(1, len(columns) + 1):
                cell = worksheet.cell(row=r_idx, column=c_idx)
                cell.font = font_data
                cell.border = thin_border
                col_name = columns[c_idx - 1]
                
                if col_name in ["REPORT_ID", "REPORT_DATE", "SETTLEMENT_CURRENCY"]:
                    cell.alignment = align_center
                elif col_name == "REPORTING_FOR":
                    cell.alignment = align_left
                else:
                    cell.alignment = align_right
                    
        # Auto-adjust Widths
        for col in worksheet.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            worksheet.column_dimensions[col_letter].width = max(max_len + 4, 12)
            
    output.seek(0)
    return output.read(), filename`
    },
    {
      name: "requirements.txt",
      path: "/requirements.txt",
      icon: FileText,
      language: "text",
      code: `Flask>=3.0.0
pandas>=2.0.0
openpyxl>=3.1.0
regex>=2023.1.1
gunicorn>=21.2.0`
    }
  ];

  const handleCopy = (code: string, name: string) => {
    navigator.clipboard.writeText(code);
    setCopied(name);
    setTimeout(() => setCopied(null), 2000);
  };

  const activeFile = pythonFiles[activeTab];

  return (
    <div id="code_viewer_card" className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Block Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 font-mono flex items-center">
            <span className="w-2.5 h-2.5 bg-sky-400 rounded-full mr-2.5 animate-pulse"></span>
            Python Production Backend Codebase
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Explore the generated, robust files written to your workspace</p>
        </div>
        <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 px-2.5 py-1">Scope: Full Modular Stack</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12">
        {/* Left selector menu */}
        <div className="col-span-1 md:col-span-3 border-r border-slate-100 bg-slate-50/50 p-4 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">File Tree</div>
          {pythonFiles.map((file, idx) => {
            const Icon = file.icon;
            const isActive = activeTab === idx;
            return (
              <button
                key={file.name}
                id={`tab_select_${file.name.replace('.', '_')}`}
                onClick={() => setActiveTab(idx)}
                className={`w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600 pl-2'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <div className="truncate">
                  <div className="font-mono">{file.name}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5 select-none">{file.path}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Code Display Area */}
        <div className="col-span-1 md:col-span-9 flex flex-col min-h-[500px] h-[550px] bg-slate-950">
          {/* File Header Control panel */}
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-800 bg-slate-900/50">
            <span className="text-[11px] font-mono font-medium text-slate-400">{activeFile.path}</span>
            <div className="flex items-center space-x-2">
              <button
                id={`copy_btn_${activeFile.name.replace('.', '_')}`}
                onClick={() => handleCopy(activeFile.code, activeFile.name)}
                className="p-1 px-2 text-[11px] hover:text-white transition rounded border border-slate-700 bg-slate-800 text-slate-300 flex items-center space-x-1.5 cursor-pointer"
              >
                {copied === activeFile.name ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preformatted Code Content */}
          <div id={`code_pre_${activeFile.name.replace('.', '_')}`} className="flex-1 overflow-auto p-5 font-mono text-[12px] leading-relaxed text-slate-300 antialiased whitespace-pre">
            {activeFile.code}
          </div>
        </div>
      </div>
    </div>
  );
}
