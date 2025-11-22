import React, { useState, type ChangeEvent } from 'react';
import axios from 'axios';

// 1. Define the shape of the data we expect from the backend
export interface ProcessedRow {
  [key: string]: any;
}

// 2. Define the props this component accepts
interface FileUploaderProps {
  onDataLoaded: (data: ProcessedRow[], fileId: number) => void;
}

// 3. Define the expected API Response structure
interface UploadResponse {
  message: string;
  file_id: number;
  file_url: string;
  data: ProcessedRow[];
}

const FileUploader: React.FC<FileUploaderProps> = ({ onDataLoaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Handle file selection event
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  // Handle API Upload
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const response = await axios.post<UploadResponse>(
        'http://localhost:8000/api/upload/', 
        formData, 
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      onDataLoaded(response.data.data, response.data.file_id);
      
    } catch (err: any) {
      console.error(err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded shadow-md">
      <h2 className="text-xl font-bold mb-4">Upload CSV or Excel</h2>
      
      <div className="flex items-center gap-4">
        <input 
          type="file" 
          accept=".csv, .xlsx, .xls"
          onChange={handleFileChange} 
          className="block w-full text-sm text-slate-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
        
        <button
          onClick={handleUpload}
          disabled={loading || !file}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};

export default FileUploader;