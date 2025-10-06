import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardAPI, facturasAPI } from '../services/api';
import './OrdenesProveedor.css';

const OrdenesProveedor = () => {
  const [ordenes, setOrdenes] = useState([]);
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
    loadOrdenes();
  }, [proveedor]);

  const loadOrdenes = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getOrdenesProveedor(proveedor.proveedorId);
      setOrdenes(response.success ? (response.data ?? []) : []);
    } catch (err) {
      setError('Error al cargar las órdenes');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado.toLowerCase()) {
      case 'pendiente':
        return '#ffc107';
      case 'pagado':
        return '#28a745';
      case 'enviado':
        return '#17a2b8';
      case 'entregado':
        return '#6c757d';
      case 'cancelado':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDescargarFactura = async (ordenId) => {
    try {
      setLoading(true);
      const response = await facturasAPI.descargarPDFFacturaPorOrden(ordenId);
      if (response.success) {
        alert('PDF de factura descargado exitosamente');
      } else {
        alert('Error al descargar la factura: ' + response.message);
      }
    } catch (err) {
      alert('Error al descargar la factura');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('proveedor');
    navigate('/');
  };

  return (
    <div className="ordenes-container">
      <header className="ordenes-header">
        <h1>📋 Órdenes Recibidas</h1>
        <div className="header-actions">
          <Link to="/proveedor/dashboard" className="btn btn-secondary">
            ← Dashboard
          </Link>
          <button onClick={handleLogout} className="btn btn-danger">
            🚪 Cerrar Sesión
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="ordenes-content">
        {ordenes.length === 0 ? (
          <div className="no-ordenes">
            <div className="no-ordenes-icon">📋</div>
            <h2>No hay órdenes aún</h2>
            <p>Las órdenes de tus productos aparecerán aquí</p>
          </div>
        ) : (
          <div className="ordenes-list">
            {ordenes.map(orden => (
              <div key={orden.ordenId} className="orden-card">
                <div className="orden-header">
                  <div className="orden-info">
                    <h3>Orden #{orden.ordenId}</h3>
                    <p className="orden-fecha">
                      {formatDate(orden.fechaCreacion)}
                    </p>
                    <p className="orden-cliente">
                      Cliente: {orden.clienteNombre}
                    </p>
                  </div>
                  <div className="orden-status">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getEstadoColor(orden.estadoOrden) }}
                    >
                      {orden.estadoOrden}
                    </span>
                  </div>
                </div>

                <div className="orden-details">
                  <div className="orden-items">
                    <h4>Productos ({orden.productos?.length || 0})</h4>
                    {orden.productos?.map((producto, index) => (
                      <div key={index} className="orden-item">
                        <div className="item-info">
                          <span className="item-nombre">{producto?.nombre}</span>
                          <span className="item-cantidad">x{producto.cantidad}</span>
                        </div>
                        <span className="item-precio">
                          ${(producto.cantidad * producto.precioUnitario).toFixed(2)}
                        </span>
                      </div>
                    )) || (
                      <p className="no-items">No hay productos en esta orden</p>
                    )}
                  </div>

                  <div className="orden-totals">
                    <div className="total-row">
                      <span>Total:</span>
                      <span className="total-amount">${orden.total.toFixed(2)}</span>
                    </div>
                    {orden.fechaPago && (
                      <div className="payment-date">
                        Pagado: {formatDate(orden.fechaPago)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="orden-actions">
                  <button 
                    className="btn btn-info"
                    onClick={() => handleDescargarFactura(orden.ordenId)}
                    disabled={loading}
                  >
                    📄 {loading ? 'Generando PDF...' : 'Descargar Factura PDF'}
                  </button>
                  {orden.estadoOrden === 'Pendiente' && (
                    <button className="btn btn-success">
                      ✅ Marcar como Procesado
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdenesProveedor;
