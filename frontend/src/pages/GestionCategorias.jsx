import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { encryptRoute } from '../utils/routeCipher';
import { categoriasAPI } from '../services/api';
import { onlyLetters } from '../utils/validators';
import './GestionCategorias.css';

const GestionCategorias = () => {
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const hasFetched = useRef(false);
    const [showForm, setShowForm] = useState(false);
    const [editingCategoria, setEditingCategoria] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: ''
    });
    const navigate = useNavigate();
    const [proveedor, setProveedor] = useState(null);

    useEffect(() => {
        try {
            const proveedorData = localStorage.getItem('proveedor');
            if (!proveedorData) {
                navigate(`/e/${encryptRoute('/login/proveedor')}`);
                return;
            }

            const parsedProveedor = JSON.parse(proveedorData);
            if (!parsedProveedor || !parsedProveedor.proveedorId) {
                localStorage.removeItem('proveedor');
                navigate(`/e/${encryptRoute('/login/proveedor')}`);
                return;
            }

            setProveedor(parsedProveedor);
        } catch (error) {
            console.error('Error parsing proveedor data:', error);
            localStorage.removeItem('proveedor');
            navigate(`/e/${encryptRoute('/login/proveedor')}`);
        }
    }, [navigate]);

    useEffect(() => {
        if (!proveedor) return;
        if (hasFetched.current) return;
        hasFetched.current = true;
        loadCategorias();
    }, [proveedor]);

    const loadCategorias = async () => {
        try {
            setLoading(true);
            const response = await categoriasAPI.getCategorias();
            setCategorias(response.success ? (response.data ?? []) : []);
        } catch (err) {
            setError('Error al cargar las categorías');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let processedValue = value;

        // Aplicar validadores según el tipo de campo
        switch (name) {
            case 'nombre':
                // Solo letras, números y espacios (máx 100)
                processedValue = value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').slice(0, 100);
                break;

            case 'descripcion':
                // Permitir letras, números, espacios, puntos, comas (máx 500)
                processedValue = value.slice(0, 500);
                break;

            default:
                processedValue = value;
        }

        setFormData({
            ...formData,
            [name]: processedValue
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCategoria) {
                await categoriasAPI.updateCategoria(editingCategoria.categoriaId, formData);
            } else {
                await categoriasAPI.createCategoria(formData);
            }
            setShowForm(false);
            setEditingCategoria(null);
            setFormData({
                nombre: '',
                descripcion: ''
            });
            loadCategorias();
        } catch (err) {
            alert('Error al guardar la categoría');
        }
    };

    const handleEdit = (categoria) => {
        setEditingCategoria(categoria);
        setFormData({
            nombre: categoria.nombre,
            descripcion: categoria.descripcion || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (categoriaId) => {
        if (!window.confirm('¿Estás seguro de eliminar esta categoría?')) return;
        try {
            await categoriasAPI.deleteCategoria(categoriaId);
            loadCategorias();
        } catch (err) {
            alert('Error al eliminar la categoría');
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingCategoria(null);
        setFormData({
            nombre: '',
            descripcion: ''
        });
    };

    const handleLogout = () => {
        localStorage.removeItem('proveedor');
        navigate(`/e/${encryptRoute('/')}`);
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="categorias-container">
            <header className="categorias-header">
                <div className="header-content">
                    <div className="header-left">
                        <Link to={`/e/${encryptRoute('/')}`} className="logo">POS-ting</Link>
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
                    <h1 className="banner-title">🏷️ Gestión de Categorías</h1>
                    <p className="banner-subtitle">
                        Organiza y administra las categorías de tus productos
                    </p>
                </div>
            </section>

            <div className="categorias-main-content">
                {error && <div className="error-message">{error}</div>}

                <div className="actions-bar">
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn btn-primary btn-large"
                    >
                        ➕ Nueva Categoría
                    </button>
                </div>

                {showForm && (
                    <div className="form-modal">
                        <div className="form-content">
                            <h2>{editingCategoria ? '✏️ Editar Categoría' : '➕ Nueva Categoría'}</h2>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label>Nombre de la Categoría *</label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={formData.nombre}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Nombre de la categoría"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Descripción</label>
                                    <textarea
                                        name="descripcion"
                                        value={formData.descripcion}
                                        onChange={handleInputChange}
                                        placeholder="Descripción de la categoría"
                                        rows="4"
                                    />
                                </div>

                                <div className="form-actions">
                                    <button type="button" onClick={handleCancel} className="btn btn-secondary">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingCategoria ? '💾 Actualizar' : '➕ Crear'} Categoría
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="categorias-list">
                    <div className="list-header">
                        <h2>📋 Mis Categorías ({categorias.length})</h2>
                    </div>

                    {categorias.length === 0 ? (
                        <div className="no-categorias">
                            <div className="no-categorias-icon">🏷️</div>
                            <h3>No hay categorías aún</h3>
                            <p>Comienza creando tu primera categoría para organizar tus productos</p>
                            <button
                                onClick={() => setShowForm(true)}
                                className="btn btn-primary"
                            >
                                ➕ Crear Primera Categoría
                            </button>
                        </div>
                    ) : (
                        <div className="categorias-grid">
                            {categorias.map(categoria => (
                                <div key={categoria.categoriaId} className="categoria-card">
                                    <div className="categoria-info">
                                        <h3>{categoria.nombre}</h3>
                                        <p>{categoria.descripcion || 'Sin descripción'}</p>
                                    </div>
                                    <div className="categoria-actions">
                                        <button
                                            onClick={() => handleEdit(categoria)}
                                            className="btn btn-sm btn-info"
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(categoria.categoriaId)}
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

export default GestionCategorias;