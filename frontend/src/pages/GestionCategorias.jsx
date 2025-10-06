import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { categoriasAPI } from '../services/api';
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
    setFormData({
      ...formData,
      [name]: value
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
    navigate('/');
  };

  return (
    <div className="categorias-container">
      <header className="categorias-header">
        <h1>🏷️ Gestión de Categorías</h1>
        <div className="header-actions">
          <button 
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            ➕ Nueva Categoría
          </button>
          <Link to="/proveedor/dashboard" className="btn btn-secondary">
            ← Dashboard
          </Link>
          <button onClick={handleLogout} className="btn btn-danger">
            🚪 Cerrar Sesión
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="form-modal">
          <div className="form-content">
            <h2>{editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
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
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategoria ? 'Actualizar' : 'Crear'} Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="categorias-list">
        <h2>Categorías ({categorias.length})</h2>
        {categorias.length === 0 ? (
          <div className="no-categorias">
            <p>No hay categorías aún</p>
            <button 
              onClick={() => setShowForm(true)}
              className="btn btn-primary"
            >
              Crear Primera Categoría
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
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(categoria.categoriaId)}
                    className="btn btn-sm btn-danger"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionCategorias;
