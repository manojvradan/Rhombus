import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable';
import apiClient from '../api/client';

// Define the shape of a History Step
interface HistoryStep {
  fileId: number;
  data: any[];
}

const SpreadsheetPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { fileId: initialFileId, initialData, filename } = location.state || {};

  // --- STATE MANAGEMENT ---
  
  // 1. History (Undo/Redo)
  const [history, setHistory] = useState<HistoryStep[]>([
    { fileId: initialFileId, data: initialData || [] }
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Derived state from history
  const currentStep = history[currentIndex];
  const tableData = currentStep?.data || [];
  const currentFileId = currentStep?.fileId;

  // 2. Chatbot & UI
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'Hello! I am Rhombus AI.\n\n• Use "Pattern Replace" to clean text.\n• Use "Row Filter" to analyze data.' }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [prompt, setPrompt] = useState('');

  // 3. Mode Switching (The "Two Transformations" Requirement)
  const [mode, setMode] = useState<'regex' | 'filter' | 'math'>('regex');

  // 4. Regex Mode State
  const [replacement, setReplacement] = useState('');
  const [generatedRegex, setGeneratedRegex] = useState<string | null>(null);
  const [generatedColumn, setGeneratedColumn] = useState<string | null>(null);

  // 5. Filter Mode State
  const [generatedFilter, setGeneratedFilter] = useState<string | null>(null);

  // 6. Math Mode State (NEW)
  const [generatedMath, setGeneratedMath] = useState<string | null>(null);
  if (!initialData) return <div className="p-8">No data loaded. <button onClick={() => navigate('/')} className="text-blue-500 underline">Go Home</button></div>;

  // --- UNDO / REDO HANDLERS ---
  const handleUndo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setMessages(prev => [...prev, { role: 'ai', text: '↺ Undid last change.' }]);
    }
  };

  const handleRedo = () => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setMessages(prev => [...prev, { role: 'ai', text: '↻ Redid change.' }]);
    }
  };

  // --- API HELPER: PUSH NEW HISTORY ---
  const pushNewHistoryStep = (newFileId: number, newData: any[], successMsg: string) => {
      const newStep: HistoryStep = { fileId: newFileId, data: newData };
      
      // Remove "future" history if we were in the middle of the stack
      const newHistory = history.slice(0, currentIndex + 1);
      
      setHistory([...newHistory, newStep]);
      setCurrentIndex(newHistory.length); // Point to new latest

      setMessages(prev => [...prev, { role: 'ai', text: `${successMsg} (v${newHistory.length + 1})` }]);
  };

  // --- REGEX HANDLERS ---
  const handleGenerateRegex = async () => {
    if (!prompt.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: prompt }]);
    setIsAiLoading(true);
    setGeneratedRegex(null);
    setGeneratedColumn(null);

    // Send context (first 3 rows) so AI knows formats
    const dataContext = tableData.slice(0, 3);

    try {
      const response = await apiClient.post('/api/generate-regex/', { 
        prompt: prompt,
        data_context: dataContext
      });

      const { regex, column } = response.data;
      setGeneratedRegex(regex);
      setGeneratedColumn(column); // Store detected column

      const targetMsg = column ? `Target: [${column}]` : "Target: All Columns";
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: `I found a pattern!\nRegex: "${regex}"\n${targetMsg}` 
      }]);
      setPrompt(''); // Clear input on success
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "Error generating pattern. Please be more specific." }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApplyRegex = async () => {
    if (!generatedRegex || !currentFileId) return;
    setIsAiLoading(true);

    try {
        const response = await apiClient.post('/api/apply-regex/', {
            file_id: currentFileId,
            regex: generatedRegex,
            replacement: replacement,
            column: generatedColumn // Send the AI-detected column
        });

        pushNewHistoryStep(response.data.new_file_id, response.data.data, `Replaced matches with "${replacement}".`);
        setGeneratedRegex(null); // Reset
        setGeneratedColumn(null);

    } catch (error) {
        setMessages(prev => [...prev, { role: 'ai', text: "Failed to apply changes." }]);
    } finally {
        setIsAiLoading(false);
    }
  };

  // --- FILTER HANDLERS (NEW FEATURE) ---
  const handleGenerateFilter = async () => {
    if (!prompt.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: prompt }]);
    setIsAiLoading(true);
    setGeneratedFilter(null);

    const dataContext = tableData.slice(0, 3);

    try {
        const response = await apiClient.post('/api/generate-filter/', { 
            prompt: prompt,
            data_context: dataContext
        });

        const query = response.data.filter_query;
        setGeneratedFilter(query);

        setMessages(prev => [...prev, { 
            role: 'ai', 
            text: `I constructed this filter query:\nPandas: \`${query}\`\nClick Apply to filter rows.` 
        }]);
        setPrompt('');
    } catch (error) {
        setMessages(prev => [...prev, { role: 'ai', text: "Could not understand filter request." }]);
    } finally {
        setIsAiLoading(false);
    }
  };

  const handleApplyFilter = async () => {
    if (!generatedFilter || !currentFileId) return;
    setIsAiLoading(true);

    try {
        const response = await apiClient.post('/api/apply-filter/', {
            file_id: currentFileId,
            filter_query: generatedFilter
        });

        pushNewHistoryStep(response.data.new_file_id, response.data.data, "Filter applied successfully.");
        setGeneratedFilter(null);

    } catch (error) {
        setMessages(prev => [...prev, { role: 'ai', text: "Filter failed. It might be invalid for this data." }]);
    } finally {
        setIsAiLoading(false);
    }
  };

  // --- MATH HANDLERS (NEW) ---
  const handleGenerateMath = async () => {
    if (!prompt.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: prompt }]);
    setIsAiLoading(true);
    setGeneratedMath(null);

    const dataContext = tableData.slice(0, 3);

    try {
        const response = await apiClient.post('/api/generate-math/', { 
            prompt: prompt,
            data_context: dataContext
        });

        const expression = response.data.expression;
        setGeneratedMath(expression);

        setMessages(prev => [...prev, { 
            role: 'ai', 
            text: `I created this formula:\n\`${expression}\`\nClick Apply to create the column.` 
        }]);
        setPrompt('');
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "Could not understand math request." }]);
    } finally {
        setIsAiLoading(false);
    }
  };

  const handleApplyMath = async () => {
    if (!generatedMath || !currentFileId) return;
    setIsAiLoading(true);

    try {
        const response = await apiClient.post('/api/apply-math/', {
            file_id: currentFileId,
            expression: generatedMath
        });

        pushNewHistoryStep(response.data.new_file_id, response.data.data, "New column created successfully.");
        setGeneratedMath(null);

    } catch (error) {
        setMessages(prev => [...prev, { role: 'ai', text: "Math operation failed." }]);
    } finally {
        setIsAiLoading(false);
    }
  };

  // --- DOWNLOAD HANDLER ---
  const handleDownload = async () => {
    if (!currentFileId) return;

    try {
      const response = await apiClient.get(`/api/download/${currentFileId}/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let fileName = 'edited_data.csv';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match && match.length === 2) fileName = match[1];
      }
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Failed to download file.");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 1. APP HEADER */}
      <header className="flex items-center justify-between px-4 py-3 bg-green-700 text-white shadow-md z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-xs bg-green-800 hover:bg-green-600 px-3 py-1 rounded transition">
             ← Upload New
          </button>
          <div className="flex flex-col">
             <span className="text-sm font-bold">Rhombus AI</span>
             <span className="text-xs opacity-80">{filename}</span>
          </div>

          <div className="h-6 w-px bg-green-600 mx-2"></div>

          {/* Undo/Redo */}
          <div className="flex gap-2">
            <button onClick={handleUndo} disabled={currentIndex === 0} className="flex items-center gap-1 px-3 py-1 bg-green-800 rounded text-xs font-bold hover:bg-green-600 disabled:opacity-50">
                <span>↩ Undo</span>
            </button>
            <button onClick={handleRedo} disabled={currentIndex === history.length - 1} className="flex items-center gap-1 px-3 py-1 bg-green-800 rounded text-xs font-bold hover:bg-green-600 disabled:opacity-50">
                <span>Redo ↪</span>
            </button>
          </div>
          <span className="text-xs opacity-80 ml-2">v{currentIndex + 1}</span>
        </div>

        {/* Download */}
        <button onClick={handleDownload} className="flex items-center gap-2 bg-white text-green-700 hover:bg-slate-100 px-3 py-1.5 rounded text-xs font-bold shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Download CSV
        </button>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: EXCEL GRID */}
        <div className="flex-1 overflow-auto bg-slate-100 p-4 relative">
          <div className="bg-white shadow-sm border border-slate-300 min-h-full">
            <DataTable data={tableData} /> 
          </div>
        </div>

        {/* RIGHT: CHATBOT SIDEBAR */}
        <div className="w-96 flex flex-col border-l border-slate-200 bg-white shadow-xl z-20">
            
            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-lg text-sm whitespace-pre-wrap ${
                    msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                    }`}>
                    {msg.text}
                    </div>
                </div>
                ))}
            </div>

            {/* CONTROL PANEL */}
            <div className="p-4 border-t border-slate-200 bg-white">
                
                {/* Mode Tabs */}
                <div className="flex gap-2 mb-4 border-b border-slate-200 pb-2">
                    <button 
                        onClick={() => { setMode('regex'); setGeneratedFilter(null); }}
                        className={`text-xs font-bold px-3 py-1 rounded transition-colors ${mode === 'regex' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        Pattern Replace
                    </button>
                    <button 
                        onClick={() => { setMode('filter'); setGeneratedRegex(null); }}
                        className={`text-xs font-bold px-3 py-1 rounded transition-colors ${mode === 'filter' ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        Row Filter
                    </button>
                    <button 
                        onClick={() => { setMode('math'); setGeneratedRegex(null); setGeneratedFilter(null); }}
                        className={`text-xs font-bold px-2 py-1 rounded transition-colors ${mode === 'math' ? 'bg-orange-100 text-orange-700' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        Math Columns
                    </button>
                </div>

                {/* --- MODE A: REGEX REPLACE --- */}
                {mode === 'regex' && (
                    <>
                        {generatedRegex ? (
                            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* Regex Preview */}
                                <div className="text-xs font-mono bg-yellow-50 p-2 border border-yellow-200 rounded text-yellow-800 break-all">
                                    Regex: {generatedRegex}
                                </div>
                                {/* Column Detection Preview */}
                                <div className="flex items-center gap-2 text-xs bg-blue-50 p-2 border border-blue-100 rounded text-blue-800">
                                    <span className="font-bold">Target:</span>
                                    {generatedColumn ? (
                                        <span className="font-mono bg-white px-1 rounded border border-blue-200">{generatedColumn}</span>
                                    ) : (
                                        <span className="italic opacity-70">All Columns (Global)</span>
                                    )}
                                </div>

                                <button onClick={handleApplyRegex} className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 rounded">
                                    Confirm & Apply
                                </button>
                                <button onClick={() => setGeneratedRegex(null)} className="w-full text-slate-500 text-xs hover:text-slate-700">
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <div className="animate-in fade-in">
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Describe Pattern</label>
                                <textarea 
                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    rows={2}
                                    placeholder="e.g. Find dates in Ship Date column before 2015..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleGenerateRegex()}
                                />
                                <div className="mt-2 flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Replacement (e.g. REDACTED)" 
                                        className="flex-1 text-sm border border-slate-300 rounded px-2 py-1"
                                        value={replacement}
                                        onChange={(e) => setReplacement(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleGenerateRegex}
                                        disabled={isAiLoading || !prompt.trim()}
                                        className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700 font-medium disabled:opacity-50"
                                    >
                                        {isAiLoading ? '...' : 'Run AI'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* --- MODE B: ROW FILTER --- */}
                {mode === 'filter' && (
                    <>
                        {generatedFilter ? (
                            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="text-xs font-mono bg-purple-50 p-2 border border-purple-200 rounded text-purple-800 break-all">
                                    Query: {generatedFilter}
                                </div>
                                <button onClick={handleApplyFilter} className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 rounded">
                                    Apply Filter
                                </button>
                                <button onClick={() => setGeneratedFilter(null)} className="w-full text-slate-500 text-xs hover:text-slate-700">
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <div className="animate-in fade-in">
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Describe Filter</label>
                                <textarea 
                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                    rows={3}
                                    placeholder="e.g. Remove rows where Units Sold is less than 5000..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleGenerateFilter()}
                                />
                                <button 
                                    onClick={handleGenerateFilter}
                                    disabled={isAiLoading || !prompt.trim()}
                                    className="w-full mt-2 bg-purple-600 text-white text-sm px-4 py-2 rounded hover:bg-purple-700 font-medium disabled:opacity-50"
                                >
                                    {isAiLoading ? 'Generating Query...' : 'Generate Filter Query'}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* --- MODE C: MATH COLUMNS (NEW) --- */}
                {mode === 'math' && (
                    <>
                        {generatedMath ? (
                            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="text-xs font-mono bg-orange-50 p-2 border border-orange-200 rounded text-orange-800 break-all">
                                    Formula: {generatedMath}
                                </div>
                                <button onClick={handleApplyMath} className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 rounded">
                                    Create Column
                                </button>
                                <button onClick={() => setGeneratedMath(null)} className="w-full text-slate-500 text-xs hover:text-slate-700">
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <div className="animate-in fade-in">
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Describe New Column</label>
                                <textarea 
                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                                    rows={3}
                                    placeholder="e.g. Create a Total column by multiplying Price and Quantity..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleGenerateMath()}
                                />
                                <button 
                                    onClick={handleGenerateMath}
                                    disabled={isAiLoading || !prompt.trim()}
                                    className="w-full mt-2 bg-orange-500 text-white text-sm px-4 py-2 rounded hover:bg-orange-600 font-medium disabled:opacity-50"
                                >
                                    {isAiLoading ? 'Generating Formula...' : 'Generate Formula'}
                                </button>
                            </div>
                        )}
                    </>
                )}

            </div>
        </div>
      </div>
    </div>
  );
};

export default SpreadsheetPage;