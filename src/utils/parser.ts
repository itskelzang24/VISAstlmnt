export interface VSS110Record {
  REPORT_ID: string;
  REPORTING_FOR: string;
  REPORT_DATE: string;
  SETTLEMENT_CURRENCY: string;
  REIMBURSEMENT_FEES_CREDIT: string;
  REIMBURSEMENT_FEES_DEBIT: string;
  REIMBURSEMENT_FEES_TOTAL: string;
  VISA_CHARGES_CREDIT: string;
  VISA_CHARGES_DEBIT: string;
  VISA_CHARGES_TOTAL: string;
}

/**
 * Parses a Visa Settlement text report and extracts VSS-110 report data.
 * Matches the python-based regex rules and handles edge cases beautifully.
 */
export function parseVSS110Text(text: string): VSS110Record[] {
  // 1. Isolate VSS-110 report sections
  // Using 'g' for global matching and 's' for dotAll (so dot matches newlines)
  const sectionRegex = /REPORT ID:\s+VSS-110.*?\*\*\*\s+END OF VSS-110 REPORT\s+\*\*\*/gs;
  const sections = text.match(sectionRegex) || [];
  
  const parsedRecords: VSS110Record[] = [];

  sections.forEach((sec, idx) => {
    try {
      // Extract reporting identity details
      const reportingForMatch = sec.match(/REPORTING FOR:\s*([^\n\r]+)/);
      const reportingFor = reportingForMatch ? reportingForMatch[1].trim() : "UNKNOWN";

      const reportDateMatch = sec.match(/REPORT DATE:\s*([^\s\n\r]+)/);
      const reportDate = reportDateMatch ? reportDateMatch[1].trim() : "UNKNOWN";

      const currencyMatch = sec.match(/SETTLEMENT CURRENCY:\s*([A-Za-z0-9]+)/);
      const settlementCurrency = currencyMatch ? currencyMatch[1].trim() : "UNKNOWN";

      // Extract REIMBURSEMENT FEES
      // Matches the python rules: REIMBURSEMENT FEES followed by TOTAL ISSUER and credit/debit/total
      const reimbRegex = /REIMBURSEMENT FEES.*?TOTAL ISSUER\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+(?:CR|DB)?)/s;
      const reimbMatch = sec.match(reimbRegex);

      let reimbCredit = "0.00";
      let reimbDebit = "0.00";
      let reimbTotal = "0.00";

      if (reimbMatch) {
        reimbCredit = reimbMatch[1];
        reimbDebit = reimbMatch[2];
        reimbTotal = reimbMatch[3];
      } else {
        // Fallback: search specifically inside the REIMBURSEMENT FEES block
        const reimbBlockMatch = sec.match(/REIMBURSEMENT FEES.*?(?=VISA CHARGES|TOTAL OTHER|$)/s);
        if (reimbBlockMatch) {
          const blockText = reimbBlockMatch[0];
          const fallbackMatch = blockText.match(/TOTAL ISSUER\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+(?:CR|DB)?)/);
          if (fallbackMatch) {
            reimbCredit = fallbackMatch[1];
            reimbDebit = fallbackMatch[2];
            reimbTotal = fallbackMatch[3];
          }
        }
      }

      // Extract VISA CHARGES (specifically isolating TOTAL ISSUER block in it)
      const visaRegex = /VISA CHARGES.*?TOTAL ISSUER\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+(?:CR|DB)?)/s;
      const visaMatch = sec.match(visaRegex);

      let visaCredit = "0.00";
      let visaDebit = "0.00";
      let visaTotal = "0.00";

      if (visaMatch) {
        visaCredit = visaMatch[1];
        visaDebit = visaMatch[2];
        visaTotal = visaMatch[3];
      } else {
        // Fallback: search specifically inside the VISA CHARGES block
        const visaBlockMatch = sec.match(/VISA CHARGES.*?(?=\*\*\* END|$)/s);
        if (visaBlockMatch) {
          const blockText = visaBlockMatch[0];
          const fallbackMatch = blockText.match(/TOTAL ISSUER\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+(?:CR|DB)?)/);
          if (fallbackMatch) {
            visaCredit = fallbackMatch[1];
            visaDebit = fallbackMatch[2];
            visaTotal = fallbackMatch[3];
          }
        }
      }

      parsedRecords.push({
        REPORT_ID: "VSS-110",
        REPORTING_FOR: reportingFor,
        REPORT_DATE: reportDate,
        SETTLEMENT_CURRENCY: settlementCurrency,
        REIMBURSEMENT_FEES_CREDIT: reimbCredit,
        REIMBURSEMENT_FEES_DEBIT: reimbDebit,
        REIMBURSEMENT_FEES_TOTAL: reimbTotal,
        VISA_CHARGES_CREDIT: visaCredit,
        VISA_CHARGES_DEBIT: visaDebit,
        VISA_CHARGES_TOTAL: visaTotal
      });
    } catch (e) {
      console.error(`Error parsing VSS-110 section ${idx}:`, e);
    }
  });

  return parsedRecords;
}
