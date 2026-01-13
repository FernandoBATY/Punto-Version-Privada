import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import ClienteLogin from './pages/ClienteLogin';
import ProveedorLogin from './pages/ProveedorLogin';
import ProductosView from './pages/ProductosView';
import CestaView from './pages/CestaView';
import HistorialOrdenes from './pages/HistorialOrdenes';
import ProveedorDashboard from './pages/ProveedorDashboard';
import GestionProductos from './pages/GestionProductos';
import GestionCategorias from './pages/GestionCategorias';
import OrdenesProveedor from './pages/OrdenesProveedor';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login/cliente" element={<ClienteLogin />} />
          <Route path="/login/proveedor" element={<ProveedorLogin />} />
          
          {/* Client routes */}
          <Route path="/productos" element={<ProductosView />} />
          <Route path="/cesta" element={<CestaView />} />
          <Route path="/historial" element={<HistorialOrdenes />} />
          
          {/* Provider routes */}
          <Route path="/proveedor/dashboard" element={<ProveedorDashboard />} />
          <Route path="/proveedor/productos" element={<GestionProductos />} />
          <Route path="/proveedor/categorias" element={<GestionCategorias />} />
          <Route path="/proveedor/ordenes" element={<OrdenesProveedor />} />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;