import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable';
import apiClient from '../api/client'; 

const SpreadsheetPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Retrieve data passed from Dashboard
  const { fileId, initialData, filename } = location.state || {};

  // Chatbot & Input State
  const [prompt, setPrompt] = useState('');
  const [replacement, setReplacement] = useState(''); // <--- New state for replacement value
  const [isAiLoading, setIsAiLoading] = useState(false); // <--- Loading state
  
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'Hello! I am Rhombus AI. Describe a pattern you want to find in this sheet.' }
  ]);

  // Redirect if no data
  if (!initialData) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl text-red-500">No data loaded.</h2>
        <button onClick={() => navigate('/')} className="text-blue-600 underline">
          Go back to upload
        </button>
      </div>
    );
  }

  // --- THE NEW HANDLER FUNCTION ---
  const handleSendMessage = async () => {
    if (!prompt.trim()) return;

    // 1. Add User Message to Chat immediately
    const userMessage = prompt;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setPrompt(''); // Clear input
    setIsAiLoading(true);

    try {
      // 2. Call the Backend LLM Endpoint
      const response = await apiClient.post('/api/generate-regex/', {
        prompt: userMessage
      });

      const regexPattern = response.data.regex;

      // 3. Add AI Response to Chat
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: `I generated this Regex pattern for you:\n\n${regexPattern}` 
      }]);

    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: "Sorry, I encountered an error generating that pattern. Please try again." 
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 1. APP HEADER */}
      <header className="flex items-center justify-between px-4 py-3 bg-green-700 text-white shadow-md z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="text-xs bg-green-800 hover:bg-green-600 px-3 py-1 rounded transition"
          >
            ← Upload New
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold">Rhombus AI Editor</h1>
            <span className="text-xs opacity-80">{filename || 'Untitled.csv'}</span>
          </div>
        </div>
        <div className="text-xs bg-green-800 px-2 py-1 rounded">
          File ID: {fileId}
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT: EXCEL GRID */}
        <div className="flex-1 overflow-auto bg-slate-100 p-4 relative">
          <div className="bg-white shadow-sm border border-slate-300 min-h-full">
            <DataTable data={initialData} />
          </div>
        </div>

        {/* RIGHT: CHATBOT SIDEBAR */}
        <div className="w-96 flex flex-col border-l border-slate-200 bg-white shadow-xl z-20">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-700">AI Pattern Assistant</h2>
            <p className="text-xs text-slate-500">Describe patterns to replace.</p>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-lg text-sm whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {/* Loading Indicator */}
            {isAiLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-500 text-xs px-3 py-2 rounded-lg rounded-bl-none animate-pulse">
                  Generating pattern...
                </div>
              </div>
            )}
          </div>

          {/* Input Area (Updated with your requested snippet) */}
          <div className="p-4 border-t border-slate-200 bg-white">
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Natural Language Prompt</label>
            <textarea 
              className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={3}
              placeholder="E.g., Find all email addresses..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={isAiLoading}
            />
            <div className="mt-2 flex justify-between items-center gap-2">
               <input 
                 type="text" 
                 placeholder="Replacement value (optional)" 
                 className="text-sm border border-slate-300 rounded px-2 py-1 w-full"
                 value={replacement}
                 onChange={(e) => setReplacement(e.target.value)}
                 disabled={isAiLoading}
               />
               <button 
                 onClick={handleSendMessage}
                 disabled={isAiLoading || !prompt.trim()}
                 className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700 font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isAiLoading ? '...' : 'Run AI'}
               </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SpreadsheetPage;