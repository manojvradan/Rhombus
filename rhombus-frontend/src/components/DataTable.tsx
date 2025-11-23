// src/components/DataTable.tsx
import React from 'react';
import { type ProcessedRow } from './FileUploader';

interface DataTableProps {
  data: ProcessedRow[];
}

const DataTable: React.FC<DataTableProps> = ({ data }) => {
  if (!data || data.length === 0) return <p className="text-slate-500 italic">No data to display.</p>;

  // Dynamically extract headers from the first object keys
  const headers = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
      <table className="w-full text-left text-sm text-slate-700">
        <thead className="bg-slate-100 text-slate-800 uppercase font-semibold">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-6 py-3 border-b border-slate-200 whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {data.map((row, rowIndex) => (
            <tr 
              key={rowIndex} 
              className="hover:bg-slate-50 transition-colors duration-150"
            >
              {headers.map((header) => (
                <td key={`${rowIndex}-${header}`} className="px-6 py-3 whitespace-nowrap">
                  {row[header]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;