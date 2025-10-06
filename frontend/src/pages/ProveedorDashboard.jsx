import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import './ProveedorDashboard.css';

const ProveedorDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const hasFetched = useRef(false);

  const [proveedor, setProveedor] = useState(null);

  useEffect(() => {
    try {
      const proveedorData = localStorage.getItem('proveedor');
      if (!proveedorData) {
        navigate('/login/proveedor');
        return;
      }
      
      const parsedProveedor = JSON.parse(proveedorData);
      if (!parsedProveedor || !parsedProveedor.proveedorId) {
        localStorage.removeItem('proveedor');
        navigate('/login/proveedor');
        return;
      }
      
      setProveedor(parsedProveedor);
    } catch (error) {
      console.error('Error parsing proveedor data:', error);
      localStorage.removeItem('proveedor');
      navigate('/login/proveedor');
    }
  }, [navigate]);

  useEffect(() => {
    if (!proveedor) return;
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadDashboard();
  }, [proveedor]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await dashboardAPI.getDashboardProveedor(proveedor.proveedorId);
      if (!response.success) {
        setError(response.message || 'Error al cargar el dashboard');
        setDashboard(null);
        return;
      }
      setDashboard(response.data);
    } catch (err) {
      setError('Error al cargar el dashboard');
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('proveedor');
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-info">
          <h1>🏪 Dashboard del Proveedor</h1>
          <p>Bienvenido, {proveedor?.nombre} {proveedor?.apellido}</p>
        </div>
        <div className="header-actions">
          <button onClick={handleLogout} className="btn btn-danger">
            Cerrar Sesión
          </button>
          <Link to="/" className="btn btn-secondary">
            ← Inicio
          </Link>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-content">
        <div className="dashboard-nav">
          <Link to="/proveedor/productos" className="nav-card">
            <div className="nav-icon">📦</div>
            <h3>Gestionar Productos</h3>
            <p>Agregar, editar y eliminar productos</p>
          </Link>

          <Link to="/proveedor/categorias" className="nav-card">
            <div className="nav-icon">🏷️</div>
            <h3>Gestionar Categorías</h3>
            <p>Administrar categorías de productos</p>
          </Link>

          <Link to="/proveedor/ordenes" className="nav-card">
            <div className="nav-icon">📋</div>
            <h3>Ver Órdenes</h3>
            <p>Revisar órdenes recibidas</p>
          </Link>
        </div>

        {dashboard && (
          <div className="dashboard-stats">
            <h2>📊 Estadísticas</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📦</div>
                <div className="stat-info">
                  <h3>{dashboard?.estadisticasProductos?.productosActivos ?? 0}</h3>
                  <p>Productos Activos</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-info">
                  <h3>{dashboard?.estadisticasVentas?.totalOrdenes ?? 0}</h3>
                  <p>Órdenes Totales</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-info">
                  <h3>${(dashboard?.estadisticasVentas?.totalVentas ?? 0).toFixed(2)}</h3>
                  <p>Ventas Totales</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-info">
                  <h3>{(dashboard?.estadisticasVentas?.totalOrdenes ?? 0) - (dashboard?.estadisticasVentas?.ordenesPagadas ?? 0)}</h3>
                  <p>Órdenes Pendientes</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProveedorDashboard;
