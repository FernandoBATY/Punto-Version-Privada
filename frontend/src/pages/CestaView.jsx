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
    const [validationErrors, setValidationErrors] = useState({
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

    const validateCardNumber = (value) => {
        const cleanValue = value.replace(/\s/g, '');
        if (!cleanValue) {
            return 'El número de tarjeta es requerido';
        }
        if (!/^\d+$/.test(cleanValue)) {
            return 'Solo se permiten números';
        }
        if (cleanValue.length < 13) {
            return 'Mínimo 13 dígitos';
        }
        if (cleanValue.length > 19) {
            return 'Máximo 19 dígitos';
        }
        return '';
    };

    const validateExpiryDate = (value) => {
        if (!value) {
            return 'La fecha de vencimiento es requerida';
        }
        if (!/^\d{2}\/\d{2}$/.test(value)) {
            return 'Formato: MM/AA';
        }
        const [month, year] = value.split('/');
        const monthNum = parseInt(month);
        if (monthNum < 1 || monthNum > 12) {
            return 'Mes inválido (01-12)';
        }
        const currentYear = new Date().getFullYear() % 100;
        const currentMonth = new Date().getMonth() + 1;
        const yearNum = parseInt(year);
        if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
            return 'Tarjeta vencida';
        }
        return '';
    };

    const validateCVV = (value) => {
        if (!value) {
            return 'El CVV es requerido';
        }
        if (!/^\d+$/.test(value)) {
            return 'Solo números';
        }
        if (value.length < 3 || value.length > 4) {
            return 'Debe tener 3 o 4 dígitos';
        }
        return '';
    };

    const validateCardHolder = (value) => {
        if (!value) {
            return 'El nombre del titular es requerido';
        }
        if (value.length < 3) {
            return 'Mínimo 3 caracteres';
        }
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) {
            return 'Solo letras y espacios';
        }
        return '';
    };

    const handleCardNumberChange = (e) => {
        let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
        if (value.length > 19) value = value.slice(0, 19);

        const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
        setPaymentData({ ...paymentData, numeroTarjeta: formatted });
        setValidationErrors({ ...validationErrors, numeroTarjeta: validateCardNumber(formatted) });
    };

    const handleExpiryDateChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 4) value = value.slice(0, 4);

        if (value.length >= 2) {
            value = value.slice(0, 2) + '/' + value.slice(2);
        }

        setPaymentData({ ...paymentData, fechaVencimiento: value });
        setValidationErrors({ ...validationErrors, fechaVencimiento: validateExpiryDate(value) });
    };

    const handleCVVChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 4) value = value.slice(0, 4);

        setPaymentData({ ...paymentData, cvv: value });
        setValidationErrors({ ...validationErrors, cvv: validateCVV(value) });
    };

    const handleCardHolderChange = (e) => {
        const value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        setPaymentData({ ...paymentData, nombreTitular: value });
        setValidationErrors({ ...validationErrors, nombreTitular: validateCardHolder(value) });
    };

    const handlePayment = async (e) => {
        e.preventDefault();

        const errors = {
            numeroTarjeta: validateCardNumber(paymentData.numeroTarjeta),
            fechaVencimiento: validateExpiryDate(paymentData.fechaVencimiento),
            cvv: validateCVV(paymentData.cvv),
            nombreTitular: validateCardHolder(paymentData.nombreTitular)
        };

        setValidationErrors(errors);

        if (Object.values(errors).some(error => error !== '')) {
            alert('Por favor corrige los errores en el formulario');
            return;
        }

        try {
            console.log('Procesando pago para órdenes:', createdOrders);
            console.log('Datos de pago:', paymentData);

            for (const orden of createdOrders) {
                const pagoData = {
                    ordenId: orden.ordenId,
                    numeroTarjeta: paymentData.numeroTarjeta.replace(/\s/g, ''),
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

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (!cesta || !cesta.items || cesta.items.length === 0) {
        return (
            <div className="cesta-container">
                <header className="cesta-header">
                    <div className="header-content">
                        <div className="header-left">
                            <Link to="/" className="logo">POS-ting</Link>
                        </div>

                        <div className="header-actions">
                            <Link to="/productos" className="btn btn-primary">
                                ← Continuar Comprando
                            </Link>
                            <button onClick={handleLogout} className="btn btn-danger">
                                🚪 Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </header>

                <section className="banner-section">
                    <div className="banner-content">
                        <h1 className="banner-title">🛒 Tu Cesta de Compras</h1>
                        <p className="banner-subtitle">
                            Revisa tus productos y finaliza tu pedido
                        </p>
                    </div>
                </section>

                <div className="cesta-main-content">
                    <div className="empty-cart">
                        <div className="empty-cart-icon">🛒</div>
                        <h2>Tu cesta está vacía</h2>
                        <p>Agrega algunos productos para comenzar tu compra</p>
                        <Link to="/productos" className="btn btn-primary">
                            Ver Productos
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <footer className="footer">
                    <div className="footer-container">
                        <div className="footer-column">
                            <div className="footer-logo">
                                <span className="footer-logo-text">Posting</span>
                            </div>
                            <p className="footer-description">
                                Disfruta de la mejor comida casera preparada con ingredientes frescos y mucho amor.
                                Tu satisfacción es nuestra prioridad.
                            </p>
                        </div>

                        <div className="footer-column">
                            <h3 className="footer-title">Enlaces Rápidos</h3>
                            <ul className="footer-links">
                                <li><button onClick={scrollToTop} className="footer-link">Inicio</button></li>
                                <li><Link to="/productos" className="footer-link">Menú</Link></li>
                            </ul>
                        </div>

                        <div className="footer-column">
                            <h3 className="footer-title">Contacto</h3>
                            <div className="footer-contact">
                                <p className="contact-item">Domicilio Conocido S/N, San Diego Alcalá, 50850 Temoaya, Méx.</p>
                                <p className="contact-item">📞 +52 1 729 297 4595</p>
                                <p className="contact-item">🕒 Lun - Dom: 9:00 AM - 10:00 PM</p>
                                <p className="contact-item">✉️ postingenterprise7@gmail.com</p>
                            </div>
                        </div>
                    </div>

                    <div className="footer-bottom">
                        <p className="copyright">© 2024 Posting. Todos los derechos reservados.</p>
                    </div>
                </footer>

                {/* Botón de WhatsApp flotante */}
                <a
                    href="https://wa.me/5217292974595"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whatsapp-float"
                    aria-label="Contactar por WhatsApp"
                >
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                        alt="WhatsApp"
                        className="whatsapp-icon"
                    />
                </a>
            </div>
        );
    }

    return (
        <div className="cesta-container">
            <header className="cesta-header">
                <div className="header-content">
                    <div className="header-left">
                        <Link to="/" className="logo">POS-ting</Link>
                    </div>

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
                </div>
            </header>

            <section className="banner-section">
                <div className="banner-content">
                    <h1 className="banner-title">🛒 Tu Cesta de Compras</h1>
                    <p className="banner-subtitle">
                        Revisa tus productos y finaliza tu pedido de forma rápida y segura
                    </p>
                </div>
            </section>

            <div className="cesta-main-content">
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
                                        onChange={handleCardNumberChange}
                                        placeholder="1234 5678 9012 3456"
                                        maxLength="23"
                                        className={validationErrors.numeroTarjeta ? 'input-error' : ''}
                                    />
                                    {validationErrors.numeroTarjeta && (
                                        <span className="validation-error">{validationErrors.numeroTarjeta}</span>
                                    )}
                                    <span className="input-hint">💳 13-19 dígitos</span>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Fecha de Vencimiento</label>
                                        <input
                                            type="text"
                                            value={paymentData.fechaVencimiento}
                                            onChange={handleExpiryDateChange}
                                            placeholder="MM/AA"
                                            maxLength="5"
                                            className={validationErrors.fechaVencimiento ? 'input-error' : ''}
                                        />
                                        {validationErrors.fechaVencimiento && (
                                            <span className="validation-error">{validationErrors.fechaVencimiento}</span>
                                        )}
                                        <span className="input-hint">📅 Formato: MM/AA</span>
                                    </div>

                                    <div className="form-group">
                                        <label>CVV</label>
                                        <input
                                            type="text"
                                            value={paymentData.cvv}
                                            onChange={handleCVVChange}
                                            placeholder="123"
                                            maxLength="4"
                                            className={validationErrors.cvv ? 'input-error' : ''}
                                        />
                                        {validationErrors.cvv && (
                                            <span className="validation-error">{validationErrors.cvv}</span>
                                        )}
                                        <span className="input-hint">🔒 3-4 dígitos</span>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Nombre del Titular</label>
                                    <input
                                        type="text"
                                        value={paymentData.nombreTitular}
                                        onChange={handleCardHolderChange}
                                        placeholder="JUAN PEREZ"
                                        className={validationErrors.nombreTitular ? 'input-error' : ''}
                                    />
                                    {validationErrors.nombreTitular && (
                                        <span className="validation-error">{validationErrors.nombreTitular}</span>
                                    )}
                                    <span className="input-hint">👤 Como aparece en la tarjeta</span>
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

            {/* Footer */}
            <footer className="footer">
                <div className="footer-container">
                    <div className="footer-column">
                        <div className="footer-logo">
                            <span className="footer-logo-text">Posting</span>
                        </div>
                        <p className="footer-description">
                            Disfruta de la mejor comida casera preparada con ingredientes frescos y mucho amor.
                            Tu satisfacción es nuestra prioridad.
                        </p>
                    </div>

                    <div className="footer-column">
                        <h3 className="footer-title">Enlaces Rápidos</h3>
                        <ul className="footer-links">
                            <li><button onClick={scrollToTop} className="footer-link">Inicio</button></li>
                            <li><Link to="/productos" className="footer-link">Menú</Link></li>
                        </ul>
                    </div>

                    <div className="footer-column">
                        <h3 className="footer-title">Contacto</h3>
                        <div className="footer-contact">
                            <p className="contact-item">Domicilio Conocido S/N, San Diego Alcalá, 50850 Temoaya, Méx.</p>
                            <p className="contact-item">📞 +52 1 729 297 4595</p>
                            <p className="contact-item">🕒 Lun - Dom: 9:00 AM - 10:00 PM</p>
                            <p className="contact-item">✉️ postingenterprise7@gmail.com</p>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p className="copyright">© 2024 Posting. Todos los derechos reservados.</p>
                </div>
            </footer>

            {/* Botón de WhatsApp flotante */}
            <a
                href="https://wa.me/5217292974595"
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-float"
                aria-label="Contactar por WhatsApp"
            >
                <img
                    src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                    alt="WhatsApp"
                    className="whatsapp-icon"
                />
            </a>
        </div>
    );
};

export default CestaView;