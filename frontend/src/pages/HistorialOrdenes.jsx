import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ordenesAPI, facturasAPI } from '../services/api';
import './HistorialOrdenes.css';

const HistorialOrdenes = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [cliente, setCliente] = useState(null);

  useEffect(() => {
    try {
      const clienteData = localStorage.getItem('cliente');
      if (!clienteData) {
        navigate('/login/cliente');
        return;
      }
      
      const parsedCliente = JSON.parse(clienteData);
      if (!parsedCliente || !parsedCliente.clienteId) {
        localStorage.removeItem('cliente');
        navigate('/login/cliente');
        return;
      }
      
      setCliente(parsedCliente);
    } catch (error) {
      console.error('Error parsing cliente data:', error);
      localStorage.removeItem('cliente');
      navigate('/login/cliente');
    }
  }, [navigate]);

  useEffect(() => {
    if (!cliente) return;
    loadOrdenes();
  }, [cliente]);

  const loadOrdenes = async () => {
    try {
      setLoading(true);
      const response = await ordenesAPI.getOrdenesCliente(cliente.clienteId);
      setOrdenes(response.data || []);
    } catch (err) {
      setError('Error al cargar el historial de órdenes');
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
      const response = await facturasAPI.descargarPDFFacturaPorOrden(ordenId);
      if (response.success) {
        console.log('PDF descargado exitosamente');
      } else {
        alert('Error al descargar la factura: ' + response.message);
      }
    } catch (error) {
      console.error('Error al descargar factura:', error);
      alert('Error al descargar la factura');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cliente');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="historial-container">
        <div className="loading">Cargando historial...</div>
      </div>
    );
  }

  return (
    <div className="historial-container">
      <header className="historial-header">
        <h1>📋 Historial de Órdenes</h1>
        <div className="header-actions">
          <Link to="/productos" className="btn btn-primary">
            ← Continuar Comprando
          </Link>
          <Link to="/cesta" className="btn btn-secondary">
            🛒 Ver Cesta
          </Link>
          <button onClick={handleLogout} className="btn btn-danger">
            🚪 Cerrar Sesión
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="historial-content">
        {ordenes.length === 0 ? (
          <div className="no-orders">
            <div className="no-orders-icon">📋</div>
            <h2>No tienes órdenes aún</h2>
            <p>Realiza tu primera compra para ver tu historial aquí</p>
            <Link to="/productos" className="btn btn-primary">
              Ver Productos
            </Link>
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
                    <h4>Productos ({orden.items?.length || 0})</h4>
                    {orden.items?.map(item => (
                      <div key={item.itemOrdenId} className="orden-item">
                        <div className="item-info">
                          <span className="item-nombre">{item.producto?.nombre}</span>
                          <span className="item-cantidad">x{item.cantidad}</span>
                        </div>
                        <span className="item-precio">
                          ${(item.cantidad * item.precioUnitario).toFixed(2)}
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

                {orden.estadoOrden === 'Pagado' && (
                  <div className="orden-actions">
                    <button 
                      className="btn btn-success"
                      onClick={() => handleDescargarFactura(orden.ordenId)}
                    >
                      📄 Descargar Factura PDF
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorialOrdenes;
