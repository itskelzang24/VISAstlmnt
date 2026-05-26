import os
import logging
from flask import Flask, request, jsonify, render_template, send_file, make_response
from utils.parser import parse_vss110_text
from utils.excel_export import generate_excel_bytes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Max file upload size = 16MB
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

@app.route('/')
def index():
    """Renders the main dashboard page."""
    return render_template('index.html')

@app.route('/api/process', methods=['POST'])
def process_file():
    """
    Endpoint to process an uploaded text file.
    Validates file extension, runs the VSS-110 parser, and returns the parsed data in JSON format.
    """
    if 'file' not in request.files:
        logger.error("No file part in the request")
        return jsonify({"success": False, "error": "No file portion uploaded"}), 400
        
    file = request.files['file']
    
    if file.filename == '':
        logger.error("Empty filename uploaded")
        return jsonify({"success": False, "error": "No file selected"}), 400
        
    # Validate file extension
    if not file.filename.lower().endswith('.txt'):
        logger.error(f"Invalid file type: {file.filename}")
        return jsonify({
            "success": False, 
            "error": "Invalid file format. Only plain text (.txt) Visa settlement reports are supported."
        }), 400

    try:
        # Read the file content
        file_content = file.read().decode('utf-8', errors='replace')
        
        # Parse the text for VSS-110 reports
        records = parse_vss110_text(file_content)
        
        # Log parsing summary
        logger.info(f"Successfully processed {file.filename}. Found {len(records)} VSS-110 report entries.")
        
        return jsonify({
            "success": True,
            "filename": file.filename,
            "count": len(records),
            "data": records
        })
        
    except Exception as e:
        logger.exception("Unexpected error during file processing")
        return jsonify({
            "success": False,
            "error": f"An error occurred while processing the file: {str(e)}"
        }), 500

@app.route('/api/download', methods=['POST'])
def download_excel():
    """
    Endpoint to download processed data as a beautifully styled Excel sheet.
    Receives JSON list of reports and responds with the .xlsx file buffer.
    """
    try:
        content = request.get_json()
        if not content or 'data' not in content:
            return jsonify({"success": False, "error": "No data provided for Excel translation"}), 400
            
        data = content['data']
        if not isinstance(data, list):
            return jsonify({"success": False, "error": "Data must be a structured list of report sections"}), 400
            
        if len(data) == 0:
            return jsonify({"success": False, "error": "No data rows are available to compile"}), 400

        # Generate excel bytes and timestamped filename
        excel_bytes, filename = generate_excel_bytes(data)
        
        # Build file response
        response = make_response(send_file(
            io.BytesIO(excel_bytes) if hasattr(send_file, 'py_buffer') else excel_bytes,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=filename
        ))
        
        # Handle manual mime headers for older flask variants or edge containers
        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        response.headers["Content-type"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        
        return response
        
    except Exception as e:
        logger.exception("Unexpected error during Excel compilation")
        return jsonify({
            "success": False,
            "error": f"Failed to generate Excel report: {str(e)}"
        }), 500

# Error Handler for oversize files
@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        "success": False,
        "error": "The uploaded file is too large. Maximum supported size is 16MB."
    }), 413

if __name__ == '__main__':
    # Default Flask port inside typical development architectures
    port = int(os.environ.get("PORT", 3000))
    app.run(host='0.0.0.0', port=port, debug=True)
