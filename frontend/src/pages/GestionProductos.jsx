import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productosAPI, categoriasAPI, tiposProductoAPI } from '../services/api';
import './GestionProductos.css';

const GestionProductos = () => {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [tiposProducto, setTiposProducto] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingProducto, setEditingProducto] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        precio: '',
        stock: '',
        categoriaId: '',
        tipoProductoId: '',
        activo: true
    });
    const [imagenFile, setImagenFile] = useState(null);
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
        loadData();
    }, [proveedor]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [productosRes, categoriasRes, tiposRes] = await Promise.all([
                productosAPI.getProductos({ proveedorId: proveedor.proveedorId }),
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

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0] || null;
        setImagenFile(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validaciones
        if (!formData.nombre.trim()) {
            alert('El nombre del producto es obligatorio');
            return;
        }

        if (formData.nombre.trim().length < 3) {
            alert('El nombre debe tener al menos 3 caracteres');
            return;
        }

        if (!formData.precio || parseFloat(formData.precio) <= 0) {
            alert('El precio debe ser mayor a 0');
            return;
        }

        if (!formData.stock || parseInt(formData.stock) < 0) {
            alert('El stock no puede ser negativo');
            return;
        }

        try {
            const baseData = {
                nombre: formData.nombre.trim(),
                descripcion: formData.descripcion.trim() || null,
                precio: parseFloat(formData.precio),
                stock: parseInt(formData.stock),
                categoriaId: formData.categoriaId ? parseInt(formData.categoriaId) : null,
                tipoProductoId: formData.tipoProductoId ? parseInt(formData.tipoProductoId) : null,
                activo: !!formData.activo,
                proveedorId: proveedor.proveedorId
            };

            if (editingProducto) {
                await productosAPI.updateProducto(editingProducto.productoId, baseData);
            } else {
                if (imagenFile) {
                    const fd = new FormData();
                    fd.append('proveedorId', String(baseData.proveedorId));
                    fd.append('nombre', baseData.nombre);
                    fd.append('precio', String(baseData.precio));
                    fd.append('stock', String(baseData.stock));
                    if (baseData.descripcion) fd.append('descripcion', baseData.descripcion);
                    if (baseData.categoriaId !== null) fd.append('categoriaId', String(baseData.categoriaId));
                    if (baseData.tipoProductoId !== null) fd.append('tipoProductoId', String(baseData.tipoProductoId));
                    fd.append('activo', String(baseData.activo));
                    fd.append('imagen', imagenFile);
                    await productosAPI.createProductoConImagen(fd);
                } else {
                    await productosAPI.createProducto(baseData);
                }
            }

            setShowForm(false);
            setEditingProducto(null);
            setImagenFile(null);
            setFormData({
                nombre: '',
                descripcion: '',
                precio: '',
                stock: '',
                categoriaId: '',
                tipoProductoId: '',
                activo: true
            });
            loadData();
        } catch (err) {
            alert('Error al guardar el producto');
        }
    };

    const handleEdit = (producto) => {
        setEditingProducto(producto);
        setImagenFile(null);
        setFormData({
            nombre: producto.nombre,
            descripcion: producto.descripcion || '',
            precio: producto.precio.toString(),
            stock: producto.stock.toString(),
            categoriaId: producto.categoriaId?.toString() || '',
            tipoProductoId: producto.tipoProductoId?.toString() || '',
            activo: producto.activo
        });
        setShowForm(true);
    };

    const handleDelete = async (productoId) => {
        if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;

        try {
            await productosAPI.deleteProducto(productoId);
            loadData();
        } catch (err) {
            alert('Error al eliminar el producto');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('proveedor');
        navigate('/');
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingProducto(null);
        setImagenFile(null);
        setFormData({
            nombre: '',
            descripcion: '',
            precio: '',
            stock: '',
            categoriaId: '',
            tipoProductoId: '',
            activo: true
        });
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="productos-container">
            <header className="productos-header">
                <div className="header-content">
                    <div className="header-left">
                        <Link to="/" className="logo">POS-ting</Link>
                    </div>

                    <div className="header-actions">
                        <span className="user-greeting">
                            👋 {proveedor?.nombre} {proveedor?.apellido}
                        </span>
                        <button onClick={handleLogout} className="btn btn-danger">
                            🚪 Cerrar Sesión
                        </button>
                    </div>
                </div>
            </header>

            <section className="banner-section">
                <div className="banner-content">
                    <h1 className="banner-title">📦 Gestión de Productos</h1>
                    <p className="banner-subtitle">
                        Administra tu catálogo de productos de forma eficiente
                    </p>
                </div>
            </section>

            <div className="productos-main-content">
                {error && <div className="error-message">{error}</div>}

                <div className="actions-bar">
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn btn-primary btn-large"
                    >
                        ➕ Nuevo Producto
                    </button>
                </div>

                {showForm && (
                    <div className="form-modal">
                        <div className="form-content">
                            <h2>{editingProducto ? '✏️ Editar Producto' : '➕ Nuevo Producto'}</h2>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label>Nombre del Producto *</label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={formData.nombre}
                                        onChange={handleInputChange}
                                        required
                                        minLength={3}
                                        placeholder="Nombre del producto"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Descripción</label>
                                    <textarea
                                        name="descripcion"
                                        value={formData.descripcion}
                                        onChange={handleInputChange}
                                        placeholder="Descripción del producto"
                                        rows="4"
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Precio *</label>
                                        <input
                                            type="number"
                                            name="precio"
                                            value={formData.precio}
                                            onChange={handleInputChange}
                                            required
                                            min="0.01"
                                            step="0.01"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Stock *</label>
                                        <input
                                            type="number"
                                            name="stock"
                                            value={formData.stock}
                                            onChange={handleInputChange}
                                            required
                                            min="0"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Categoría</label>
                                        <select
                                            name="categoriaId"
                                            value={formData.categoriaId}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">Sin categoría</option>
                                            {categorias.map(cat => (
                                                <option key={cat.categoriaId} value={cat.categoriaId}>
                                                    {cat.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Tipo de Producto</label>
                                        <select
                                            name="tipoProductoId"
                                            value={formData.tipoProductoId}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">Sin tipo</option>
                                            {tiposProducto.map(tipo => (
                                                <option key={tipo.tipoProductoId} value={tipo.tipoProductoId}>
                                                    {tipo.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {!editingProducto && (
                                    <div className="form-group">
                                        <label>Imagen del Producto</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                        {imagenFile && (
                                            <small style={{ color: '#667eea', marginTop: '0.5rem', display: 'block' }}>
                                                ✓ Imagen seleccionada: {imagenFile.name}
                                            </small>
                                        )}
                                    </div>
                                )}

                                <div className="form-group checkbox-group">
                                    <label>
                                        <input
                                            type="checkbox"
                                            name="activo"
                                            checked={formData.activo}
                                            onChange={handleInputChange}
                                        />
                                        Producto activo
                                    </label>
                                </div>

                                <div className="form-actions">
                                    <button type="button" onClick={handleCancel} className="btn btn-secondary">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingProducto ? '💾 Actualizar' : '➕ Crear'} Producto
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="productos-list">
                    <div className="list-header">
                        <h2>📋 Mis Productos ({productos.length})</h2>
                    </div>

                    {productos.length === 0 ? (
                        <div className="no-productos">
                            <div className="no-productos-icon">📦</div>
                            <h3>No hay productos aún</h3>
                            <p>Comienza creando tu primer producto para tu catálogo</p>
                            <button
                                onClick={() => setShowForm(true)}
                                className="btn btn-primary"
                            >
                                ➕ Crear Primer Producto
                            </button>
                        </div>
                    ) : (
                        <div className="productos-grid">
                            {productos.map(producto => (
                                <div key={producto.productoId} className="producto-card">
                                    <div className="producto-imagen">
                                        {producto.imagenes?.length > 0 ? (
                                            <img src={producto.imagenes[0].url} alt={producto.nombre} />
                                        ) : (
                                            <div className="sin-imagen">🖼️</div>
                                        )}
                                        <span className={`producto-badge ${producto.activo ? 'active' : 'inactive'}`}>
                                            {producto.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>

                                    <div className="producto-info">
                                        <h3>{producto.nombre}</h3>
                                        <p className="producto-descripcion">
                                            {producto.descripcion || 'Sin descripción'}
                                        </p>

                                        <div className="producto-detalles">
                                            <div className="detalle-item">
                                                <span className="detalle-label">Precio:</span>
                                                <span className="detalle-valor">${producto.precio.toFixed(2)}</span>
                                            </div>
                                            <div className="detalle-item">
                                                <span className="detalle-label">Stock:</span>
                                                <span className="detalle-valor">{producto.stock}</span>
                                            </div>
                                            {producto.categoria && (
                                                <div className="detalle-item">
                                                    <span className="detalle-label">Categoría:</span>
                                                    <span className="detalle-valor">{producto.categoria.nombre}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="producto-actions">
                                        <button
                                            onClick={() => handleEdit(producto)}
                                            className="btn btn-sm btn-info"
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(producto.productoId)}
                                            className="btn btn-sm btn-danger"
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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
};

export default GestionProductos;