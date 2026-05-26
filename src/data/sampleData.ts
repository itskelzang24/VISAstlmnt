export interface SampleSet {
  name: string;
  description: string;
  content: string;
}

export const SAMPLE_VISA_REPORTS: SampleSet[] = [
  {
    name: "Standard Dual-Currency Settlement Report",
    description: "Contains three VSS-110 sessions with differing currency regimes (INR, USD) and simulated noise reports (VSS-120, VSS-130).",
    content: `VISA SETTLEMENT SERVICES                      RUN DATE: 26MAY26
CLASS: GLOBAL PROCESSING SERVICE              TIME: 11:03:44
========================================================================

REPORT ID: VSS-110
REPORTING FOR: 9000312087 BOB DOM 470401
REPORT DATE: 28FEB26
SETTLEMENT CURRENCY: INR

------------------------------------------------------------------------
REIMBURSEMENT FEES
------------------------------------------------------------------------
ISSUER TRANSACTIONS                  12,450       45,672.10
ACQUIRER TRANSACTIONS                 9,823       38,410.22
TOTAL INTERCHANGE                             84,082.32
TOTAL OTHER INTERCHANGE                        2,110.45
TOTAL ISSUER                       1,444.64       546.38       898.26CR
TOTAL ACQUIRER                       389.15       941.10       551.95DB
------------------------------------------------------------------------
VISA CHARGES
------------------------------------------------------------------------
MEMBERSHIP ASSESSMENTS                         4,103.02
SYSTEM SERVICE FEES                            1,200.56
TOTAL OTHER                        1,220.30       594.10       626.20CR
TOTAL ISSUER                           0.00        77.23        77.23DB
TOTAL ACQUIRER                       140.00         0.00       140.00CR
------------------------------------------------------------------------
*** END OF VSS-110 REPORT ***

========================================================================
REPORT ID: VSS-120
REPORTING FOR: 9000312087 OTHER ACCOUNTS
REPORT DATE: 28FEB26
SETTLEMENT CURRENCY: INR

REIMBURSEMENT FEES
TOTAL ISSUER                       5,200.00     3,100.00     2,100.00CR
*** END OF VSS-120 REPORT ***
========================================================================

REPORT ID: VSS-110
REPORTING FOR: 9552123990 SMITH US WORLD 992211
REPORT DATE: 15MAR26
SETTLEMENT CURRENCY: USD

------------------------------------------------------------------------
REIMBURSEMENT FEES
------------------------------------------------------------------------
ISSUER FEES                           1,210       34,220.00
TOTAL ISSUER                       8,912.40     1,220.10     7,692.30CR
TOTAL OTHER                          500.00       200.00       300.00CR
------------------------------------------------------------------------
VISA CHARGES
------------------------------------------------------------------------
TRANSACTION ROUTING CHARGES                      450.25
TOTAL ACCORD                          10.00        20.00        10.00DB
TOTAL ISSUER                         150.00       895.40       745.40DB
------------------------------------------------------------------------
*** END OF VSS-110 REPORT ***

========================================================================
REPORT ID: VSS-130
REPORTING FOR: DEBIT NETWORKS CORP
REPORT DATE: 15MAR26
SETTLEMENT CURRENCY: USD

VISA CHARGES
TOTAL ISSUER                          55.00        10.00        45.00CR
*** END OF VSS-130 REPORT ***
========================================================================

REPORT ID: VSS-110
REPORTING FOR: 8120392182 TOKYO CENTRAL BANK 832001
REPORT DATE: 24APR26
SETTLEMENT CURRENCY: JPY

------------------------------------------------------------------------
REIMBURSEMENT FEES
------------------------------------------------------------------------
TOTAL ISSUER                     580,200.00   120,450.00   459,750.00CR
------------------------------------------------------------------------
VISA CHARGES
------------------------------------------------------------------------
TOTAL OTHER                      340,110.00         0.00   340,110.00CR
TOTAL ISSUER                           0.00    14,350.00    14,350.00DB
------------------------------------------------------------------------
*** END OF VSS-110 REPORT ***
`
  },
  {
    name: "Single Clean VSS-110 Settlement",
    description: "A single perfectly formatted VSS-110 block with standard issuer debits and zero credits.",
    content: `VISA SETTLEMENT SERVICES                      RUN DATE: 10JAN26
------------------------------------------------------------------------
REPORT ID: VSS-110
REPORTING FOR: 4509123891 CHASE CORP INT
REPORT DATE: 08JAN26
SETTLEMENT CURRENCY: USD

REIMBURSEMENT FEES
TOTAL ISSUER                         100.25       850.50       750.25DB

VISA CHARGES
TOTAL ISSUER                           0.00       120.00       120.00DB
*** END OF VSS-110 REPORT ***
`
  }
];
