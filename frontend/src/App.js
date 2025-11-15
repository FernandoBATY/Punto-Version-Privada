import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import EncodedRouter from './components/EncodedRouter';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Root stays accessible. All other links use encoded tokens under /e/:token */}
          <Route path="/" element={<Home />} />
          <Route path="/e/:token" element={<EncodedRouter />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;