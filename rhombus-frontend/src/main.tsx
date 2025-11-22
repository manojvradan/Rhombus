// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Route for the main dashboard */}
        <Route path="/" element={<Dashboard />} />
        
        {/* You can add more routes here later, e.g.: */}
        {/* <Route path="/history" element={<HistoryPage />} /> */}
        
        {/* Fallback for 404s */}
        <Route path="*" element={
          <div className="p-10 text-center">
            <h1 className="text-2xl font-bold">404 - Page Not Found</h1>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);