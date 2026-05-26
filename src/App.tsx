import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react';
import { parseVSS110Text, VSS110Record } from './utils/parser';
import { exportVSS110ToExcel } from './utils/excelExport';
import { SAMPLE_VISA_REPORTS, SampleSet } from './data/sampleData';
import ReportPreviewTable from './components/ReportPreviewTable';
import PythonCodeViewer from './components/PythonCodeViewer';
import { 
  FileCode, 
  Upload, 
  AlertTriangle, 
  Settings, 
  Terminal, 
  FileText, 
  BookOpen, 
  CornerDownRight, 
  Activity,
  PlusCircle,
  Sparkles,
  Layers,
  HelpCircle
} from 'lucide-react';

export default function App() {
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [records, setRecords] = useState<VSS110Record[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'PARSER' | 'CODEBASE'>('PARSER');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [logs, setLogs] = useState<{ time: string; text: string; type: 'info' | 'success' | 'warn' | 'error' }[]>([]);
  const [isManualInput, setIsManualInput] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize terminal console with starter greeting
  useEffect(() => {
    addLog("Visa Settlement processing core initialized successfully.", "info");
    addLog("Compiled and ready to parse: REPORT ID: VSS-110", "info");
  }, []);

  const addLog = (text: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    setLogs(prev => [...prev, { time: timeStr, text, type }]);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // If multiple files dropped, process the first batch
      handleFilesSelected(Array.from(files));
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesSelected(Array.from(files));
    }
  };

  // Handle a list of files (multiple selection or drop)
  const handleFilesSelected = (files: File[]) => {
    // Filter .txt files only
    const txtFiles = files.filter(f => f.name.toLowerCase().endsWith('.txt'));
    if (txtFiles.length === 0) {
      addLog(`No valid .txt files found in selection.`, 'error');
      setErrorMsg("Invalid file format. Only plain text (.txt) Visa Report files are supported.");
      return;
    }

    // Show combined identity
    const combinedNames = txtFiles.map(f => f.name).join(', ');
    const totalBytes = txtFiles.reduce((acc, f) => acc + f.size, 0);
    setFileName(`Multiple files: ${combinedNames}`);
    setFileSize(`${(totalBytes / 1024).toFixed(1)} KB`);
    setErrorMsg('');
    setIsManualInput(false);

    addLog(`Loading ${txtFiles.length} file(s) into buffer (${(totalBytes/1024).toFixed(1)} KB total)...`, 'info');

    // Read all files and concatenate contents with a separator
    Promise.all(txtFiles.map(f => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string || '');
        reader.onerror = () => reject(new Error(`Failed reading ${f.name}`));
        reader.readAsText(f);
      });
    }))
    .then(contents => {
      const combined = contents.join('\n\n---FILE_BOUNDARY---\n\n');
      setFileContent(combined);
      addLog(`Combined ${txtFiles.length} file(s) into buffer. Click 'Extract VSS-110 Data' to run parser on all sections.`, 'success');
    })
    .catch(err => {
      addLog(`Failed to read files: ${err.message}`, 'error');
      setErrorMsg(`An error occurred while reading the files: ${err.message}`);
    });
  };

  // Run the parsing regex algorithms
  const handleProcessFile = () => {
    if (!fileContent.trim()) {
      addLog("Cannot parse empty structure. Provide document payload.", "error");
      setErrorMsg("Please load or paste raw settlement text before processing.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    addLog("Extracting independent VSS-110 report sections using global bounds pattern...", "info");

    // Artificial tiny lag to show beautiful system compilation loading flow
    setTimeout(() => {
      try {
        // Run parser over combined buffer; it will find all independent sections across files
        const parsed = parseVSS110Text(fileContent);
        setRecords(parsed);
        setIsProcessing(false);

        if (parsed.length === 0) {
          addLog("Zero matches found! Double-check section delimiters ('REPORT ID: VSS-110' and '*** END OF VSS-110 REPORT ***')", "warn");
          setErrorMsg("No VSS-110 report sections detected in the text source. Confirm file formats align.");
        } else {
          addLog(`Success! Extracted ${parsed.length} VSS-110 reports with fully parsed charges & reimbursements.`, "success");
        }
      } catch (err: any) {
        setIsProcessing(false);
        addLog(`Processing failed: ${err.message}`, "error");
        setErrorMsg(`An error occurred during text parse: ${err.message}`);
      }
    }, 500);
  };

  // Pre-load mock preset settlement reports
  const handleLoadPreset = (preset: SampleSet) => {
    setFileName(`Presets: ${preset.name}`);
    
    // Convert text string into size
    const mockBytes = new Blob([preset.content]).size;
    setFileSize(`${(mockBytes / 1024).toFixed(1)} KB`);
    setFileContent(preset.content);
    setRecords([]);
    setErrorMsg('');
    setIsManualInput(false);
    
    addLog(`Loaded preset sample: "${preset.name}"`, 'success');
    addLog(`Ready to process. Press 'Extract VSS-110 Data' to isolate the ${preset.name === "Standard Dual-Currency Settlement Report" ? 'three' : 'single'} section.`, 'info');
  };

  const handleClearWorkspace = () => {
    setFileContent('');
    setFileName('');
    setFileSize('');
    setRecords([]);
    setErrorMsg('');
    setIsManualInput(false);
    addLog("Workspace cleared. Buffer evacuated.", "info");
  };

  return (
    <div className="min-h-screen text-slate-800 bg-slate-50 font-sans tracking-tight">
      
      {/* Visual Navigation Bar */}
      <header className="bg-[#0f172a] text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left side brand name */}
            <div className="flex items-center space-x-3.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 shadow-inner flex items-center justify-center font-black text-lg select-none">
                V
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent flex items-center gap-1.5">
                  Visa Settlement VSS-110 Extractor
                </h1>
                <p className="text-[10px] text-slate-400 font-medium font-mono uppercase tracking-widest">
                  Enterprise Regex Parser &bull; Excel Builder
                </p>
              </div>
            </div>

            {/* Right side tab selector */}
            <nav className="flex space-x-1 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 shadow-inner">
              <button
                id="tab_selector_parser"
                onClick={() => setActiveTab('PARSER')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition flex items-center space-x-2 cursor-pointer ${
                  activeTab === 'PARSER'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Interactive App</span>
              </button>
              
              <button
                id="tab_selector_codebase"
                onClick={() => setActiveTab('CODEBASE')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition flex items-center space-x-2 cursor-pointer ${
                  activeTab === 'CODEBASE'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Python Project Source</span>
              </button>
            </nav>

          </div>
        </div>
      </header>

      {/* Main Container Frame */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Toggleable view 1: Interactive App Dashboard */}
        {activeTab === 'PARSER' ? (
          <div className="space-y-8 animate-fade-in">
            {/* Banner overview card */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center space-x-1 bg-blue-50 text-blue-800 text-[10px] uppercase font-bold font-mono tracking-widest px-2.5 py-1 rounded-full border border-blue-100">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  <span>Real-time Interactive Demonstration</span>
                </div>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Automate Visa Settlement VSS-110 Data Ingestion
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  This interface processes Visa plain-text settlement files, extracts independent <code>VSS-110</code> reports with pattern-matching regexes, previews financial summaries in a clean ledger, and compiles formatted Excel files client-side.
                </p>
              </div>

              {/* Quick instructions container */}
              <div className="self-start md:self-auto bg-slate-900 text-slate-200 p-4 rounded-2xl border border-slate-800 max-w-sm shrink-0 flex items-start space-x-3.5 shadow-sm">
                <BookOpen className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold text-white uppercase font-mono text-[10px] tracking-wide block mb-1">Developer Notice</span>
                  All matching algorithms here align exactly with the Python <code className="text-emerald-300 bg-slate-950 px-1 py-0.5 rounded">utils/parser.py</code> regular expressions. Try uploading your file or clicking one of the sample presets below to test the pipeline!
                </div>
              </div>
            </div>

            {/* Test Sample preset selection deck */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SAMPLE_VISA_REPORTS.map((preset, index) => (
                <div 
                  key={index}
                  id={`preset_card_${index}`}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">Preset Sample {index + 1}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Size: ~{new Blob([preset.content]).size} bytes</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{preset.name}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{preset.description}</p>
                  </div>
                  <div className="pt-4">
                    <button
                      id={`load_preset_btn_${index}`}
                      onClick={() => handleLoadPreset(preset)}
                      className="text-xs text-blue-600 font-semibold hover:text-blue-700 font-mono flex items-center space-x-1 cursor-pointer hover:underline"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Insert sample text to parser</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Core Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Upload center + Console Logger (col-span-4) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* File Upload / Manual Type Card */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <Upload className="w-4 h-4 text-blue-600" />
                      <span>Ingest Report Buffer</span>
                    </h3>
                    <button
                      id="toggle_manual_input"
                      onClick={() => {
                        setIsManualInput(!isManualInput);
                        addLog(`Shifted ingestion mechanic to ${!isManualInput ? 'manual text editor' : 'file uploads'}.`, 'info');
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold font-mono cursor-pointer uppercase hover:underline"
                    >
                      {isManualInput ? 'Use drag & drop' : 'Paste raw text instead'}
                    </button>
                  </div>

                  {isManualInput ? (
                    /* Manual Raw text typing box */
                    <div className="space-y-2">
                      <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">Input Raw Settlement Text:</label>
                      <textarea
                        id="raw_text_textarea"
                        rows={10}
                        placeholder="Paste raw Visa settlement report text blocks here..."
                        value={fileContent}
                        onChange={(e) => {
                          setFileContent(e.target.value);
                          setFileName("pasted_report.txt");
                          const byteSize = new Blob([e.target.value]).size;
                          setFileSize(`${(byteSize / 1024).toFixed(1)} KB`);
                        }}
                        className="w-full text-xs font-mono p-4 bg-slate-950 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 border border-slate-800"
                      />
                    </div>
                  ) : (
                    /* Drag and drop upload space */
                    <div
                      id="drag_drop_zone"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 group relative ${
                        isDragging 
                          ? 'border-blue-500 bg-blue-50/50 scale-[0.98]' 
                          : 'border-slate-300 bg-slate-50 hover:bg-slate-50/80 hover:border-blue-400'
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        accept=".txt"
                        multiple
                        className="hidden"
                      />
                      
                      <div className="space-y-3">
                        <Upload className="w-10 h-10 text-slate-400 mx-auto group-hover:text-blue-500 group-hover:scale-110 transition-all duration-200" />
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-800">Drag &amp; drop plain text report</p>
                          <p className="text-[10px] text-slate-400 font-mono">*.txt plain files up to 16MB</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loaded File Identity Card */}
                  {fileName && (
                    <div id="active_file_banner" className="bg-slate-100 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate select-none">{fileName}</p>
                          <p className="text-[9px] text-slate-400 font-semibold font-mono">{fileSize}</p>
                        </div>
                      </div>
                      <button
                        id="clear_workspace_x"
                        onClick={handleClearWorkspace}
                        className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold uppercase hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  )}

                  {/* Process triggering CTA buttons */}
                  <div className="pt-2">
                    <button
                      id="trigger_parse_button"
                      onClick={handleProcessFile}
                      disabled={!fileContent.trim() || isProcessing}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs py-3 rounded-xl transition flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
                    >
                      <span>{isProcessing ? 'Isolating Sections...' : 'Extract VSS-110 Data'}</span>
                      <CornerDownRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Diagnostic warnings */}
                  {errorMsg && (
                    <div id="diagnostic_alert" className="p-3.5 rounded-xl bg-red-50 text-red-800 border border-red-100 text-[11px] leading-relaxed flex items-start space-x-2.5">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold uppercase tracking-wide block mb-0.5">Parse Warning</span>
                        {errorMsg}
                      </div>
                    </div>
                  )}
                </div>

                {/* Micro Live Logging Terminal Console */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-inner">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center space-x-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span className="text-[11px] font-bold font-mono text-slate-300 uppercase tracking-widest select-none">System Ingestion Logs</span>
                    </div>
                    <div className="flex space-x-1.5">
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full select-none"></span>
                      <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full select-none"></span>
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-full select-none"></span>
                    </div>
                  </div>

                  {/* Logging frame viewport */}
                  <div 
                    id="log_console_viewport" 
                    className="bg-slate-950 p-4 h-56 rounded-xl font-mono text-[10px] overflow-y-auto space-y-2 border border-slate-900 shadow-inner scrollbar-thin"
                  >
                    {logs.map((log, index) => {
                      let color = "text-emerald-400";
                      if (log.type === "error") color = "text-rose-400";
                      if (log.type === "warn") color = "text-amber-300";
                      if (log.type === "success") color = "text-cyan-300";
                      return (
                        <div key={index} className="leading-relaxed flex items-start">
                          <span className="text-slate-600 select-none mr-2">[{log.time}]</span>
                          <span className={color}>{log.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Right Column: Extracted Grid Preview Table (col-span-8) */}
              <div id="preview_table_frame" className="lg:col-span-7 space-y-6">
                {records.length > 0 ? (
                  <ReportPreviewTable 
                    records={records} 
                    onClear={handleClearWorkspace}
                    originalFilename={fileName}
                  />
                ) : (
                  /* Standard empty state preview placeholder */
                  <div className="bg-white border border-slate-200 rounded-2xl py-20 px-8 text-center flex flex-col items-center justify-center shadow-sm">
                    <div className="h-14 w-14 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm animate-pulse">
                      <Activity className="w-6 h-6 text-slate-300" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">Parser State: IDLE</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
                      Upload a Visa Settlement report file or select one of the ready-made presets above to start parsing VSS-110 datasets.
                    </p>
                    <div className="mt-6 flex items-center space-x-2 text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono bg-slate-50 px-3 py-1.5 rounded-full">
                      <Settings className="w-3.5 h-3.5 text-slate-300 animate-spin" />
                      <span>Ready for file uploads</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Toggleable view 2: Python Codebase Explorer */
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
                Production-Ready Python / Flask Architecture
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
                We have generated the complete Python codebase requested in your project workspace. This folder structure integrates a Flask app runner with modular regex parsing modules and openpyxl formatting rules. You can view the code directly inside our explorer tabs below, or copy sections code.
              </p>
            </div>

            <PythonCodeViewer />
          </div>
        )}

      </main>

      {/* Styled Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wider">Visa VSS-110 Extractor Core &bull; Python Web Backend Companion</p>
          <p className="text-slate-600 select-none">&copy; 2026 Visa Settlement Processors. Clean local sandbox execution enabled.</p>
        </div>
      </footer>

    </div>
  );
}
