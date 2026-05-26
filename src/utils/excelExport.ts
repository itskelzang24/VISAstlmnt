import * as XLSX from 'xlsx';
import { VSS110Record } from './parser';

/**
 * Compiles parsed VSS-110 report records into a polished Excel file for download.
 * Calculates dynamic column widths and formats titles cleanly.
 */
export function exportVSS110ToExcel(records: VSS110Record[], originalFilename?: string): string {
  // Map internal database keys to clean spreadsheet headers
  // If there are no records, create an empty row to preserve headers
  const excelData = (records && records.length > 0) ? records.map(rec => ({
    "REPORT_ID": rec.REPORT_ID,
    "REPORTING_FOR": rec.REPORTING_FOR,
    "REPORT_DATE": rec.REPORT_DATE,
    "SETTLEMENT_CURRENCY": rec.SETTLEMENT_CURRENCY,
    "REIMBURSEMENT_FEES_CREDIT": rec.REIMBURSEMENT_FEES_CREDIT,
    "REIMBURSEMENT_FEES_DEBIT": rec.REIMBURSEMENT_FEES_DEBIT,
    "REIMBURSEMENT_FEES_TOTAL": rec.REIMBURSEMENT_FEES_TOTAL,
    "VISA_CHARGES_CREDIT": rec.VISA_CHARGES_CREDIT,
    "VISA_CHARGES_DEBIT": rec.VISA_CHARGES_DEBIT,
    "VISA_CHARGES_TOTAL": rec.VISA_CHARGES_TOTAL
  })) : [
    {
      REPORT_ID: '',
      REPORTING_FOR: '',
      REPORT_DATE: '',
      SETTLEMENT_CURRENCY: '',
      REIMBURSEMENT_FEES_CREDIT: '',
      REIMBURSEMENT_FEES_DEBIT: '',
      REIMBURSEMENT_FEES_TOTAL: '',
      VISA_CHARGES_CREDIT: '',
      VISA_CHARGES_DEBIT: '',
      VISA_CHARGES_TOTAL: ''
    }
  ];

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Auto-fit Column Widths to prevent truncation alerts (###)
  const columns = Object.keys(excelData[0] || {});
  const colWidths = columns.map(key => {
    const headerLen = key.length;
    const maxValLen = excelData.reduce((max, row: any) => {
      const valStr = String(row[key] || '');
      return valStr.length > max ? valStr.length : max;
    }, 0);
    return { wch: Math.max(headerLen, maxValLen) + 4 }; // Add 4 characters padding
  });
  worksheet['!cols'] = colWidths;

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "VSS-110 Reports");

  // Determine a polished output name
  const timestamp = new Date().toISOString()
    .slice(0, 19)
    .replace('T', '_')
    .replace(/[:-]/g, '');
  const filename = `VSS110_Output_${timestamp}.xlsx`;

  // Write and trigger download in browser
  XLSX.writeFile(workbook, filename);

  return filename;
}
