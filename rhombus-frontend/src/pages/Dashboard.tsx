// src/pages/Dashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import FileUploader, { type ProcessedRow } from '../components/FileUploader';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleDataLoaded = (data: ProcessedRow[], fileId: number, filename: string) => {
    // Navigate to the editor page and pass the data in 'state'
    navigate('/editor', { 
      state: { 
        fileId, 
        initialData: data,
        filename
      } 
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">Rhombus AI</h1>
        <p className="text-slate-600">Upload your dataset to begin pattern matching (Limit 4.5MB)</p>
      </div>

      <div className="w-full max-w-xl bg-white p-8 rounded-xl shadow-lg border border-slate-200">
        <FileUploader onDataLoaded={handleDataLoaded} />
      </div>
    </div>
  );
};

export default Dashboard;