import { useState } from 'react';
import { VSS110Record } from '../utils/parser';
import { exportVSS110ToExcel } from '../utils/excelExport';
import { Download, Search, Table, RefreshCw, Layers, TrendingUp, AlertCircle } from 'lucide-react';

interface ReportPreviewTableProps {
  records: VSS110Record[];
  onClear: () => void;
  originalFilename?: string;
}

export default function ReportPreviewTable({ records, onClear, originalFilename }: ReportPreviewTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('ALL');

  // Filter records based on search term (reporting identity or date) and currency filters
  const filteredRecords = records.filter(rec => {
    const matchesSearch = 
      rec.REPORTING_FOR.toLowerCase().includes(searchTerm.toLowerCase()) || 
      rec.REPORT_DATE.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesCurrency = selectedCurrency === 'ALL' || rec.SETTLEMENT_CURRENCY === selectedCurrency;
    
    return matchesSearch && matchesCurrency;
  });

  // Calculate distinct currencies for tab filter selector
  const currenciesSet = new Set(records.map(r => r.SETTLEMENT_CURRENCY));
  const availableCurrencies = ['ALL', ...Array.from(currenciesSet)];

  // Helper to safely convert text amounts into accurate float statistics
  const cleanNumeric = (valString: string): number => {
    const cleaned = valString.replace(/,/g, '').replace(/[^\d.]/g, '');
    return parseFloat(cleaned) || 0;
  };

  // Safe color highlight utility for Total strings (usually checks trail for CR / DB)
  const renderTotalCell = (valString: string) => {
    const isCredit = valString.endsWith('CR');
    const isDebit = valString.endsWith('DB');
    let textStyle = 'text-slate-800 font-bold';
    
    if (isCredit) textStyle = 'text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded';
    if (isDebit) textStyle = 'text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded';

    return <span className={`font-mono text-xs ${textStyle}`}>{valString}</span>;
  };

  const handleDownloadExcel = () => {
    exportVSS110ToExcel(filteredRecords, originalFilename);
  };

  return (
    <div id="report_results_card" className="space-y-6">
      {/* Action panel and details */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">Active Parser Session</div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <span id="record_badge" className="bg-blue-600 font-bold text-xs text-white px-2.5 py-1 rounded-full mr-2.5">{records.length}</span>
            Visa VSS-110 Records Isolated
          </h2>
          {originalFilename && (
            <p className="text-xs text-slate-500 font-mono">Source file: <span className="font-semibold text-slate-700">{originalFilename}</span></p>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="export_excel_button"
            onClick={handleDownloadExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-2.5 px-4 rounded-xl shadow-sm transition flex items-center space-x-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download All ({filteredRecords.length}) Row Excel</span>
          </button>
          
          <button
            id="reset_workspace_button"
            onClick={onClear}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-xs py-2.5 px-4 rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Grid of Cumulative Calculations segmented by current filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Isolated Section Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Matched Sections</div>
            <div className="text-xl font-extrabold text-slate-800 mt-0.5">{filteredRecords.length} / {records.length}</div>
          </div>
        </div>

        {/* Reimbursement Fees segment summation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Reimbursement totals in subset</div>
            <div className="text-[11px] font-medium text-slate-700 mt-1 flex justify-between">
              <span className="text-emerald-700">CR: {filteredRecords.reduce((sum, r) => sum + cleanNumeric(r.REIMBURSEMENT_FEES_CREDIT), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              <span className="text-rose-750">DB: {filteredRecords.reduce((sum, r) => sum + cleanNumeric(r.REIMBURSEMENT_FEES_DEBIT), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>

        {/* Visa Charges segment summation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Visa Charges totals in subset</div>
            <div className="text-[11px] font-medium text-slate-700 mt-1 flex justify-between">
              <span className="text-emerald-700">CR: {filteredRecords.reduce((sum, r) => sum + cleanNumeric(r.VISA_CHARGES_CREDIT), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              <span className="text-rose-750">DB: {filteredRecords.reduce((sum, r) => sum + cleanNumeric(r.VISA_CHARGES_DEBIT), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Filter Bar and search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center md:justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <input
              id="grid_search"
              type="text"
              placeholder="Search by ID, matching date, corporate identity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800 transition"
            />
          </div>

          {/* Currency Segment Filter tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-2 font-mono">Filter Settlement Currency:</span>
            {availableCurrencies.map(curr => (
              <button
                key={curr}
                id={`filter_currency_${curr}`}
                onClick={() => setSelectedCurrency(curr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition cursor-pointer ${
                  selectedCurrency === curr
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>

        {/* Datatable Frame */}
        <div className="border border-slate-100 rounded-xl overflow-hidden shadow-inner">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-[11px] text-slate-700">
              <thead className="bg-[#1e293b] text-white whitespace-nowrap select-none">
                <tr>
                  <th className="px-3.5 py-3 text-center border-r border-slate-700/60 font-bold">#</th>
                  <th className="px-4 py-3 border-r border-slate-700/60 font-mono font-bold">REPORT_ID</th>
                  <th className="px-4 py-3 border-r border-slate-700/60 font-bold">REPORTING_FOR</th>
                  <th className="px-4 py-3 border-r border-slate-700/60 text-center font-bold">REPORT_DATE</th>
                  <th className="px-4 py-3 border-r border-slate-700/60 text-center font-bold">CURRENCY</th>
                  <th className="px-4 py-3 border-r border-slate-700/60 text-right font-bold bg-[#334155]">REIMB_CREDIT</th>
                  <th className="px-4 py-3 border-r border-slate-700/60 text-right font-bold bg-[#334155]">REIMB_DEBIT</th>
                  <th className="px-4 py-3 border-r border-slate-700/60 text-right font-bold bg-[#1e293b]">REIMB_TOTAL</th>
                  <th className="px-4 py-3 border-r border-slate-700/60 text-right font-bold bg-[#475569]">VISA_CREDIT</th>
                  <th className="px-4 py-3 border-r border-slate-700/60 text-right font-bold bg-[#475569]">VISA_DEBIT</th>
                  <th className="px-4 py-3 text-right font-bold bg-[#1e293b]">VISA_TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3.5 py-2.5 text-center border-r border-slate-200 text-slate-400 font-semibold bg-slate-50/40">{idx + 1}</td>
                      <td className="px-4 py-2.5 border-r border-slate-200 font-mono font-semibold text-slate-900">{row.REPORT_ID}</td>
                      <td className="px-4 py-2.5 border-r border-slate-200 font-medium max-w-[180px] truncate" title={row.REPORTING_FOR}>
                        {row.REPORTING_FOR}
                      </td>
                      <td className="px-4 py-2.5 border-r border-slate-200 text-center font-mono font-medium">{row.REPORT_DATE}</td>
                      <td className="px-4 py-2.5 border-r border-slate-200 text-center font-mono font-bold text-slate-500">{row.SETTLEMENT_CURRENCY}</td>
                      
                      <td className="px-4 py-2.5 border-r border-slate-200 text-right bg-slate-50/50 font-mono font-medium text-emerald-700">{row.REIMBURSEMENT_FEES_CREDIT}</td>
                      <td className="px-4 py-2.5 border-r border-slate-200 text-right bg-slate-50/50 font-mono font-medium text-rose-750">{row.REIMBURSEMENT_FEES_DEBIT}</td>
                      <td className="px-4 py-2.5 border-r border-slate-200 text-right font-mono">{renderTotalCell(row.REIMBURSEMENT_FEES_TOTAL)}</td>
                      
                      <td className="px-4 py-2.5 border-r border-slate-200 text-right bg-slate-50/20 font-mono font-medium text-emerald-700">{row.VISA_CHARGES_CREDIT}</td>
                      <td className="px-4 py-2.5 border-r border-slate-200 text-right bg-slate-50/20 font-mono font-medium text-rose-750">{row.VISA_CHARGES_DEBIT}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{renderTotalCell(row.VISA_CHARGES_TOTAL)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <AlertCircle className="w-8 h-8 text-slate-300" />
                        <span className="text-xs font-semibold text-slate-500">No records match criteria</span>
                        <span className="text-[10px] text-slate-400">Adjust search filter query terms</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
