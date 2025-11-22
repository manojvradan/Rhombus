// src/pages/Dashboard.tsx
import React, { useState } from 'react';
import FileUploader, { type ProcessedRow } from '../components/FileUploader';

const Dashboard: React.FC = () => {
  const [tableData, setTableData] = useState<ProcessedRow[]>([]);
  const [currentFileId, setCurrentFileId] = useState<number | null>(null);

  // This callback receives data from the FileUploader child
  const handleDataLoaded = (data: ProcessedRow[], fileId: number) => {
    console.log('Data received from backend:', data);
    setTableData(data);
    setCurrentFileId(fileId);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <header className="max-w-5xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Rhombus AI Regex Tool</h1>
        <p className="text-slate-600">Upload a CSV, describe a pattern, and replace it.</p>
      </header>

      <main className="max-w-5xl mx-auto space-y-6">
        {/* 1. File Upload Section */}
        <section className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold mb-4">1. Upload Data</h2>
          <FileUploader onDataLoaded={handleDataLoaded} />
        </section>

        {/* 2. Data Preview Section (Visible only after upload) */}
        {tableData.length > 0 && (
          <section className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold mb-4">
              Previewing File ID: {currentFileId}
            </h2>
            
            {/* Quick debugging view of the raw data */}
            <div className="overflow-x-auto bg-slate-900 text-green-400 p-4 rounded font-mono text-sm max-h-96">
              <pre>{JSON.stringify(tableData.slice(0, 5), null, 2)}</pre>
              {tableData.length > 5 && <p className="mt-2 text-slate-500">... {tableData.length - 5} more rows</p>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;