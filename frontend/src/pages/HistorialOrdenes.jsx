import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { encryptRoute } from '../utils/routeCipher';
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
                navigate(`/e/${encryptRoute('/login/cliente')}`);
                return;
            }

            const parsedCliente = JSON.parse(clienteData);
            if (!parsedCliente || !parsedCliente.clienteId) {
                localStorage.removeItem('cliente');
                navigate(`/e/${encryptRoute('/login/cliente')}`);
                return;
            }

            setCliente(parsedCliente);
        } catch (error) {
            console.error('Error parsing cliente data:', error);
            localStorage.removeItem('cliente');
            navigate(`/e/${encryptRoute('/login/cliente')}`);
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
            case 'pendiente': return '#ffc107';
            case 'pagado': return '#28a745';
            case 'enviado': return '#17a2b8';
            case 'entregado': return '#6c757d';
            case 'cancelado': return '#dc3545';
            default: return '#6c757d';
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
        navigate(`/e/${encryptRoute('/')}`);
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
                <div className="header-content">
                    <div className="header-left">
                        <Link to={`/e/${encryptRoute('/')}`} className="logo">POS-ting</Link>
                    </div>

                    <div className="header-actions">
                        <Link to={`/e/${encryptRoute('/productos')}`} className="btn btn-secondary">
                            ← Continuar Comprando
                        </Link>
                        <Link to={`/e/${encryptRoute('/cesta')}`} className="btn btn-secondary">
                            🛒 Ver Cesta
                        </Link>
                        <button onClick={handleLogout} className="btn btn-danger">
                            🚪 Cerrar Sesión
                        </button>
                    </div>
                </div>
            </header>

            <section className="banner-section">
                <div className="banner-content">
                    <h1 className="banner-title">📋 Historial de Órdenes</h1>
                    <p className="banner-subtitle">
                        Revisa todas tus compras y descarga tus facturas
                    </p>
                </div>
            </section>

            <div className="historial-main-content">
                {error && <div className="error-message">{error}</div>}

                {ordenes.length === 0 ? (
                    <div className="no-orders">
                        <div className="no-orders-icon">📋</div>
                        <h2>No tienes órdenes aún</h2>
                        <p>Realiza tu primera compra para ver tu historial aquí</p>
                        <Link to={`/e/${encryptRoute('/productos')}`} className="btn btn-primary">
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
                            <li><Link to={`/e/${encryptRoute('/productos')}`} className="footer-link">Menú</Link></li>
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

export default HistorialOrdenes;