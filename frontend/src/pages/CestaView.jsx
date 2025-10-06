import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cestaAPI, ordenesAPI, pagosAPI, facturasAPI } from '../services/api';
import './CestaView.css';

const CestaView = () => {
  const [cesta, setCesta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hasFetched = useRef(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState({
    numeroTarjeta: '',
    fechaVencimiento: '',
    cvv: '',
    nombreTitular: ''
  });
  const [createdOrders, setCreatedOrders] = useState([]);
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
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadCesta();
  }, [cliente]);

  const loadCesta = async () => {
    try {
      setLoading(true);
      const response = await cestaAPI.getCestaCliente(cliente.clienteId);
      if (!response.success) {
        setError(response.message || 'Error al cargar la cesta');
        setCesta(null);
        return;
      }
      setCesta(response.data);
    } catch (err) {
      setError('Error al cargar la cesta');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = async (itemCestaId, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      await cestaAPI.actualizarCantidad({
        itemCestaId,
        cantidad: newQuantity
      });
      loadCesta();
    } catch (err) {
      alert('Error al actualizar cantidad');
    }
  };

  const handleRemoveItem = async (itemCestaId) => {
    if (!window.confirm('¿Eliminar este producto de la cesta?')) return;

    try {
      await cestaAPI.eliminarItem(itemCestaId);
      loadCesta();
    } catch (err) {
      alert('Error al eliminar producto');
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm('¿Vaciar toda la cesta?')) return;

    try {
      await cestaAPI.limpiarCesta(cliente.clienteId);
      loadCesta();
    } catch (err) {
      alert('Error al vaciar la cesta');
    }
  };

  const handleCreateOrder = async () => {
    if (!cesta || cesta.items.length === 0) {
      alert('La cesta está vacía');
      return;
    }

    try {
      console.log('Creando órdenes para cliente:', cliente.clienteId);
    
      const response = await ordenesAPI.crearOrdenMultiproveedor(cliente.clienteId);
      console.log('Respuesta de creación de órdenes:', response);
      
      if (response.success) {
       
        console.log('Órdenes creadas:', response.data.ordenes);
        setCreatedOrders(response.data.ordenes);
        setShowPayment(true);
      } else {
        console.error('Error al crear órdenes:', response);
        alert('Error al crear la orden');
      }
    } catch (err) {
      console.error('Error al crear la orden:', err);
      alert('Error al crear la orden');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    try {
      console.log('Procesando pago para órdenes:', createdOrders);
      console.log('Datos de pago:', paymentData);
      
      for (const orden of createdOrders) {
        const pagoData = {
          ordenId: orden.ordenId,
          numeroTarjeta: paymentData.numeroTarjeta,
          fechaVencimiento: paymentData.fechaVencimiento,
          cvv: paymentData.cvv,
          nombreTitular: paymentData.nombreTitular
        };

        console.log('Enviando datos de pago para orden:', orden.ordenId, pagoData);
        const response = await pagosAPI.procesarPago(pagoData);
        console.log('Respuesta del pago:', response);
        
        if (response.success) {
       
          await facturasAPI.generarFactura(orden.ordenId);
        } else {
          console.error('Error al procesar pago:', response);
          alert(`Error al procesar el pago para la orden ${orden.ordenId}`);
          return;
        }
      }
      
      alert('Pago procesado y facturas generadas exitosamente');
      navigate('/historial');
    } catch (err) {
      alert('Error al procesar el pago');
    }
  };

  const calculateTotal = () => {
    if (!cesta || !cesta.items) return 0;
    return cesta.items.reduce((total, item) => total + (item.cantidad * item.precioUnitario), 0);
  };

  const handleLogout = () => {
    localStorage.removeItem('cliente');
    navigate('/');
  };

 
  if (!cesta || !cesta.items || cesta.items.length === 0) {
    return (
      <div className="cesta-container">
        <header className="cesta-header">
          <h1>🛒 Mi Cesta</h1>
          <div className="header-actions">
            <Link to="/productos" className="btn btn-primary">
              ← Continuar Comprando
            </Link>
            <button onClick={handleLogout} className="btn btn-danger">
              🚪 Cerrar Sesión
            </button>
          </div>
        </header>
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h2>Tu cesta está vacía</h2>
          <p>Agrega algunos productos para comenzar tu compra</p>
          <Link to="/productos" className="btn btn-primary">
            Ver Productos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cesta-container">
      <header className="cesta-header">
        <h1>🛒 Mi Cesta</h1>
        <div className="header-actions">
          <Link to="/productos" className="btn btn-secondary">
            ← Continuar Comprando
          </Link>
          <button onClick={handleClearCart} className="btn btn-danger">
            🗑️ Vaciar Cesta
          </button>
          <button onClick={handleLogout} className="btn btn-danger">
            🚪 Cerrar Sesión
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="cesta-content">
        <div className="cesta-items">
          <h2>Productos en tu cesta ({cesta.items.length})</h2>
          {cesta.items.map(item => (
            <div key={item.itemCestaId} className="cesta-item">
              <div className="item-info">
                <h3>{item.producto?.nombre}</h3>
                <p className="item-description">{item.producto?.descripcion}</p>
                <div className="item-details">
                  <span className="item-category">
                    {item.producto.categoria?.nombre || 'Sin categoría'}
                  </span>
                  <span className="item-price">
                    ${item.precioUnitario.toFixed(2)} c/u
                  </span>
                </div>
              </div>

              <div className="item-controls">
                <div className="quantity-controls">
                  <button
                    onClick={() => handleQuantityChange(item.itemCestaId, item.cantidad - 1)}
                    className="btn-quantity"
                    disabled={item.cantidad <= 1}
                  >
                    -
                  </button>
                  <span className="quantity">{item.cantidad}</span>
                  <button
                    onClick={() => handleQuantityChange(item.itemCestaId, item.cantidad + 1)}
                    className="btn-quantity"
                  >
                    +
                  </button>
                </div>

                <div className="item-total">
                  ${(item.cantidad * item.precioUnitario).toFixed(2)}
                </div>

                <button
                  onClick={() => handleRemoveItem(item.itemCestaId)}
                  className="btn-remove"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="cesta-summary">
          <h3>Resumen de Compra</h3>
          <div className="summary-details">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Envío:</span>
              <span>Gratis</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleCreateOrder}
            className="btn btn-primary btn-checkout"
          >
            💳 Proceder al Pago
          </button>
        </div>
      </div>

      {showPayment && (
        <div className="payment-modal">
          <div className="payment-content">
            <h2>💳 Información de Pago</h2>
            <form onSubmit={handlePayment}>
              <div className="payment-form">
                <div className="form-group">
                  <label>Número de Tarjeta</label>
                  <input
                    type="text"
                    value={paymentData.numeroTarjeta}
                    onChange={(e) => setPaymentData({...paymentData, numeroTarjeta: e.target.value})}
                    placeholder="1234 5678 9012 3456"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha de Vencimiento</label>
                    <input
                      type="text"
                      value={paymentData.fechaVencimiento}
                      onChange={(e) => setPaymentData({...paymentData, fechaVencimiento: e.target.value})}
                      placeholder="MM/AA"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>CVV</label>
                    <input
                      type="text"
                      value={paymentData.cvv}
                      onChange={(e) => setPaymentData({...paymentData, cvv: e.target.value})}
                      placeholder="123"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Nombre del Titular</label>
                  <input
                    type="text"
                    value={paymentData.nombreTitular}
                    onChange={(e) => setPaymentData({...paymentData, nombreTitular: e.target.value})}
                    placeholder="Nombre como aparece en la tarjeta"
                    required
                  />
                </div>
              </div>

              <div className="payment-actions">
                <button
                  type="button"
                  onClick={() => setShowPayment(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  💳 Procesar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CestaView;
