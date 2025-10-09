import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productosAPI, categoriasAPI, tiposProductoAPI, cestaAPI } from '../services/api';
import './ProductosView.css';

const ProductosView = () => {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [tiposProducto, setTiposProducto] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [cliente, setCliente] = useState(null);
    const [selectedProducto, setSelectedProducto] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [filters, setFilters] = useState({
        nombre: '',
        categoriaId: '',
        tipoProductoId: '',
        precioMin: '',
        precioMax: ''
    });
    const navigate = useNavigate();

    useEffect(() => {
        try {
            const clienteData = localStorage.getItem('cliente');
            if (clienteData) {
                const parsedCliente = JSON.parse(clienteData);
                if (parsedCliente && parsedCliente.clienteId) {
                    setCliente(parsedCliente);
                }
            }
        } catch (error) {
            console.error('Error parsing cliente data:', error);
        }

        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [productosRes, categoriasRes, tiposRes] = await Promise.all([
                productosAPI.getProductos(),
                categoriasAPI.getCategorias(),
                tiposProductoAPI.getTiposProducto()
            ]);
            setProductos(productosRes.success ? (productosRes.data?.productos ?? []) : []);
            setCategorias(categoriasRes.success ? (categoriasRes.data ?? []) : []);
            setTiposProducto(tiposRes.success ? (tiposRes.data ?? []) : []);
        } catch (err) {
            setError('Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        setFilters({
            ...filters,
            [e.target.name]: e.target.value
        });
    };

    const handleSearch = async () => {
        try {
            setLoading(true);
            const response = await productosAPI.getProductos(filters);
            setProductos(response.success ? (response.data?.productos ?? []) : []);
        } catch (err) {
            setError('Error al buscar productos');
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = async (producto) => {
        if (!cliente) {
            alert('Debes iniciar sesión para agregar productos al carrito');
            navigate('/login/cliente');
            return;
        }

        try {
            await cestaAPI.agregarProducto({
                clienteId: cliente.clienteId,
                productoId: producto.productoId,
                cantidad: 1,
                precioUnitario: producto.precio
            });
            alert('Producto agregado al carrito');
        } catch (err) {
            alert('Error al agregar producto al carrito');
        }
    };

    const handleHistorialAccess = () => {
        if (!cliente) {
            alert('Debes iniciar sesión para ver tu historial de compras');
            navigate('/login/cliente');
            return;
        }
        navigate('/historial');
    };

    const handleLogout = () => {
        localStorage.removeItem('cliente');
        setCliente(null);
        navigate('/');
    };

    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return null;
        if (imageUrl.startsWith('http')) return imageUrl;
        return `http://localhost:5028${imageUrl}`;
    };

    const clearFilters = () => {
        setFilters({
            nombre: '',
            categoriaId: '',
            tipoProductoId: '',
            precioMin: '',
            precioMax: ''
        });
        loadData();
    };

    const openModal = (producto) => {
        setSelectedProducto(producto);
        setCurrentImageIndex(0);
        setModalOpen(true);
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedProducto(null);
        setCurrentImageIndex(0);
        document.body.style.overflow = 'auto';
    };

    const nextImage = () => {
        if (selectedProducto && selectedProducto.imagenes) {
            setCurrentImageIndex((prev) =>
                (prev + 1) % selectedProducto.imagenes.length
            );
        }
    };

    const prevImage = () => {
        if (selectedProducto && selectedProducto.imagenes) {
            setCurrentImageIndex((prev) =>
                prev === 0 ? selectedProducto.imagenes.length - 1 : prev - 1
            );
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading) {
        return (
            <div className="productos-container">
                <div className="loading">Cargando productos...</div>
            </div>
        );
    }

    return (
        <div className="productos-container">
            {/* Header */}
            <header className="productos-header">
                <div className="header-content">
                    <div className="header-left">
                        <Link to="/" className="logo">POS-ting</Link>
                    </div>

                    <div className="header-actions">
                        {cliente ? (
                            <>
                                <Link to="/cesta" className="btn btn-cart">
                                    🛒 Cesta
                                </Link>
                                <button onClick={handleHistorialAccess} className="btn btn-historial">
                                    📋 Historial
                                </button>
                                <button onClick={handleLogout} className="btn btn-danger">
                                    🚪 Cerrar Sesión
                                </button>
                            </>
                        ) : (
                            <Link to="/login/cliente" className="btn btn-login">
                                Iniciar Sesión
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Banner Section */}
            <section className="banner-section">
                <div className="banner-content">
                    <h1 className="banner-title">Nuestro Menú</h1>
                    <p className="banner-subtitle">
                        Descubre todos nuestros deliciosos platillos preparados con amor
                    </p>
                </div>
            </section>

            {/* Filters Section */}
            <div className="filters-section">
                <div className="filters-container">
                    <h3 className="filters-title">Encuentra tu platillo ideal</h3>

                    <div className="filters-grid">
                        <div className="filter-group">
                            <label>Nombre del producto</label>
                            <input
                                type="text"
                                name="nombre"
                                value={filters.nombre}
                                onChange={handleFilterChange}
                                placeholder="Buscar por nombre..."
                            />
                        </div>

                        <div className="filter-group">
                            <label>Categoría</label>
                            <select
                                name="categoriaId"
                                value={filters.categoriaId}
                                onChange={handleFilterChange}
                            >
                                <option value="">Todas las categorías</option>
                                {categorias.map(cat => (
                                    <option key={cat.categoriaId} value={cat.categoriaId}>
                                        {cat.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Tipo de producto</label>
                            <select
                                name="tipoProductoId"
                                value={filters.tipoProductoId}
                                onChange={handleFilterChange}
                            >
                                <option value="">Todos los tipos</option>
                                {tiposProducto.map(tipo => (
                                    <option key={tipo.tipoProductoId} value={tipo.tipoProductoId}>
                                        {tipo.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Precio mínimo</label>
                            <input
                                type="number"
                                name="precioMin"
                                value={filters.precioMin}
                                onChange={handleFilterChange}
                                placeholder="0"
                                min="0"
                            />
                        </div>

                        <div className="filter-group">
                            <label>Precio máximo</label>
                            <input
                                type="number"
                                name="precioMax"
                                value={filters.precioMax}
                                onChange={handleFilterChange}
                                placeholder="999999"
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="filter-actions">
                        <button onClick={handleSearch} className="btn btn-primary">
                            🔍 Buscar
                        </button>
                        <button onClick={clearFilters} className="btn btn-secondary">
                            🗑️ Limpiar
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && <div className="error-message">{error}</div>}

            {/* Products Grid */}
            <div className="productos-content">
                <div className="productos-grid">
                    {productos.length === 0 ? (
                        <div className="no-products">
                            <p>No se encontraron productos</p>
                        </div>
                    ) : (
                        productos.map(producto => (
                            <div
                                key={producto.productoId}
                                className="producto-card"
                                onClick={() => openModal(producto)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="producto-image">
                                    {producto.imagenes && producto.imagenes.length > 0 ? (
                                        <img
                                            src={getImageUrl(producto.imagenes[0].url)}
                                            alt={producto.nombre}
                                            className="producto-img"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'block';
                                            }}
                                        />
                                    ) : null}
                                    <span
                                        className="producto-icon"
                                        style={{
                                            display: producto.imagenes && producto.imagenes.length > 0 ? 'none' : 'block'
                                        }}
                                    >
                                        📦
                                    </span>
                                </div>

                                <div className="producto-info">
                                    <h3 className="producto-nombre">{producto.nombre}</h3>
                                    <p className="producto-descripcion">{producto.descripcion}</p>
                                    <div className="producto-details">
                                        <span className="producto-categoria">
                                            {producto.categoria?.nombre || 'Sin categoría'}
                                        </span>
                                        <span className="producto-tipo">
                                            {producto.tipoProducto?.nombre || 'Sin tipo'}
                                        </span>
                                    </div>
                                    <div className="producto-precio">
                                        ${producto.precio.toFixed(2)}
                                    </div>
                                    <div className="producto-stock">
                                        Stock: {producto.stock}
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddToCart(producto);
                                    }}
                                    className="btn btn-add-cart"
                                    disabled={producto.stock === 0}
                                >
                                    🛒 Agregar al carrito
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal de Producto */}
            {modalOpen && selectedProducto && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={closeModal}>×</button>

                        <div className="modal-body">
                            {/* Carrusel de Imágenes */}
                            <div className="modal-carousel">
                                {selectedProducto.imagenes && selectedProducto.imagenes.length > 0 ? (
                                    <>
                                        <img
                                            src={getImageUrl(selectedProducto.imagenes[currentImageIndex].url)}
                                            alt={selectedProducto.nombre}
                                            className="modal-image"
                                            onError={(e) => {
                                                e.target.src = '';
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                        {selectedProducto.imagenes.length > 1 && (
                                            <>
                                                <button className="carousel-btn prev" onClick={prevImage}>
                                                    ‹
                                                </button>
                                                <button className="carousel-btn next" onClick={nextImage}>
                                                    ›
                                                </button>
                                                <div className="carousel-indicators">
                                                    {selectedProducto.imagenes.map((_, index) => (
                                                        <span
                                                            key={index}
                                                            className={`indicator ${index === currentImageIndex ? 'active' : ''}`}
                                                            onClick={() => setCurrentImageIndex(index)}
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <div className="modal-no-image">
                                        <span className="modal-icon">📦</span>
                                    </div>
                                )}
                            </div>

                            {/* Información del Producto */}
                            <div className="modal-info">
                                <h2 className="modal-title">{selectedProducto.nombre}</h2>

                                {/* Rating (simulado) */}
                                <div className="modal-rating">
                                    <span className="stars">⭐⭐⭐⭐⭐</span>
                                    <span className="rating-text">4.7 (98 reseñas)</span>
                                </div>

                                {/* Descripción */}
                                <p className="modal-description">{selectedProducto.descripcion}</p>

                                {/* Precio */}
                                <div className="modal-price">
                                    ${selectedProducto.precio.toFixed(2)}
                                </div>

                                {/* Stock */}
                                <div className="modal-stock">
                                    {selectedProducto.stock > 0 ? (
                                        <span className="stock-available">
                                            ✓ En stock ({selectedProducto.stock} disponibles)
                                        </span>
                                    ) : (
                                        <span className="stock-unavailable">
                                            ✗ Sin stock
                                        </span>
                                    )}
                                </div>

                                {/* Características */}
                                <div className="modal-features">
                                    <div className="feature">
                                        <span className="feature-icon">🚚</span>
                                        <div className="feature-text">
                                            <strong>Entrega</strong>
                                            <p>30-45 min</p>
                                        </div>
                                    </div>
                                    <div className="feature">
                                        <span className="feature-icon">🥬</span>
                                        <div className="feature-text">
                                            <strong>Ingredientes frescos</strong>
                                            <p>Productos de calidad</p>
                                        </div>
                                    </div>
                                    <div className="feature">
                                        <span className="feature-icon">✓</span>
                                        <div className="feature-text">
                                            <strong>Calidad garantizada</strong>
                                            <p>100% satisfacción</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Categoría y Tipo */}
                                <div className="modal-tags">
                                    <span className="modal-tag">
                                        {selectedProducto.categoria?.nombre || 'Sin categoría'}
                                    </span>
                                    <span className="modal-tag">
                                        {selectedProducto.tipoProducto?.nombre || 'Sin tipo'}
                                    </span>
                                </div>

                                {/* Botón de agregar al carrito */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddToCart(selectedProducto);
                                    }}
                                    className="btn btn-add-cart modal-add-btn"
                                    disabled={selectedProducto.stock === 0}
                                >
                                    🛒 Agregar al carrito
                                </button>
                            </div>
                        </div>
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

            {/* WhatsApp Float Button */}
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

export default ProductosView;