import re
import logging

logger = logging.getLogger(__name__)

def parse_vss110_text(text: str) -> list:
    """
    Parses a Visa Settlement text report and extracts VSS-110 report data.
    
    Args:
        text (str): The raw text content of the report file.
        
    Returns:
        list: A list of dictionaries, one for each parsed VSS-110 report section.
    """
    # 1. Extract independent VSS-110 report sections
    # Using re.DOTALL to let the dot . match newline characters.
    section_pattern = re.compile(
        r'(REPORT ID:\s+VSS-110.*?\*\*\*\s+END OF VSS-110 REPORT\s+\*\*\*)', 
        re.DOTALL
    )
    
    sections = section_pattern.findall(text)
    logger.info(f"Found {len(sections)} potential VSS-110 report sections in file.")
    
    parsed_reports = []
    
    for idx, sec in enumerate(sections, 1):
        try:
            # 2. Extract standard header information
            # Reporting For
            reporting_for_match = re.search(r'REPORTING FOR:\s*([^\n\r]+)', sec)
            reporting_for = reporting_for_match.group(1).strip() if reporting_for_match else "UNKNOWN"
            
            # Report Date
            report_date_match = re.search(r'REPORT DATE:\s*([^\s\n\r]+)', sec)
            report_date = report_date_match.group(1).strip() if report_date_match else "UNKNOWN"
            
            # Settlement Currency
            settlement_currency_match = re.search(r'SETTLEMENT CURRENCY:\s*([A-Za-z0-9]+)', sec)
            settlement_currency = settlement_currency_match.group(1).strip() if settlement_currency_match else "UNKNOWN"
            
            # 3. Extract Reimbursement Fees Section data
            # First focus on the section under "REIMBURSEMENT FEES" up to "TOTAL OTHER" / next header
            reimb_section_match = re.search(r'REIMBURSEMENT FEES.*?(?:TOTAL ISSUER\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+(?:CR|DB)?))', sec, re.DOTALL)
            
            reimb_credit = "0.00"
            reimb_debit = "0.00"
            reimb_total = "0.00"
            
            if reimb_section_match:
                reimb_credit = reimb_section_match.group(1)
                reimb_debit = reimb_section_match.group(2)
                reimb_total = reimb_section_match.group(3)
            else:
                # Fallback search if the total issuer is further down
                reimb_sec_block = re.search(r'REIMBURSEMENT FEES.*?(?=VISA CHARGES|TOTAL OTHER|$)', sec, re.DOTALL)
                if reimb_sec_block:
                    reimb_match = re.search(r'TOTAL ISSUER\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+(?:CR|DB)?)', reimb_sec_block.group(0))
                    if reimb_match:
                        reimb_credit = reimb_match.group(1)
                        reimb_debit = reimb_match.group(2)
                        reimb_total = reimb_match.group(3)

            # 4. Extract Visa Charges Section data
            # Locate first the block starting with "VISA CHARGES" and extract "TOTAL ISSUER"
            # It must ignore "TOTAL OTHER"
            visa_section_match = re.search(r'VISA CHARGES.*?(?:TOTAL ISSUER\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+(?:CR|DB)?))', sec, re.DOTALL)
            
            visa_credit = "0.00"
            visa_debit = "0.00"
            visa_total = "0.00"
            
            if visa_section_match:
                visa_credit = visa_section_match.group(1)
                visa_debit = visa_section_match.group(2)
                visa_total = visa_section_match.group(3)
            else:
                visa_sec_block = re.search(r'VISA CHARGES.*?(?=\*\*\* END|$)', sec, re.DOTALL)
                if visa_sec_block:
                    visa_match = re.search(r'TOTAL ISSUER\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+(?:CR|DB)?)', visa_sec_block.group(0))
                    if visa_match:
                        visa_credit = visa_match.group(1)
                        visa_debit = visa_match.group(2)
                        visa_total = visa_match.group(3)

            # Assemble parsed record
            record = {
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
            }
            parsed_reports.append(record)
            
        except Exception as e:
            logger.error(f"Error parsing section index {idx}: {str(e)}")
            continue
            
    return parsed_reports
