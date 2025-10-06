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

    try {
      const baseData = {
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
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

  return (
    <div className="gestion-container">
      <header className="gestion-header">
        <h1>📦 Gestión de Productos</h1>
        <div className="header-actions">
          <button 
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            ➕ Nuevo Producto
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
            <h2>{editingProducto ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre del Producto *</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    required
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
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Precio *</label>
                  <input
                    type="number"
                    name="precio"
                    value={formData.precio}
                    onChange={handleInputChange}
                    required
                    min="0"
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

                {!editingProducto && (
                  <div className="form-group">
                    <label>Imagen del Producto</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
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
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProducto ? 'Actualizar' : 'Crear'} Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="productos-table">
        <h2>Mis Productos ({productos.length})</h2>
        {productos.length === 0 ? (
          <div className="no-products">
            <p>No tienes productos aún</p>
            <button 
              onClick={() => setShowForm(true)}
              className="btn btn-primary"
            >
              Crear Primer Producto
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map(producto => (
                  <tr key={producto.productoId}>
                    <td>
                      {producto.imagenes?.length > 0 ? (
                        <img src={producto.imagenes[0].url} alt={producto.nombre} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                      ) : (
                        <div style={{ width: 48, height: 48, background: '#eee', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🖼️</div>
                      )}
                    </td>
                    <td>{producto.nombre}</td>
                    <td>{producto.descripcion || '-'}</td>
                    <td>${producto.precio.toFixed(2)}</td>
                    <td>{producto.stock}</td>
                    <td>{producto.categoria?.nombre || '-'}</td>
                    <td>
                      <span className={`status ${producto.activo ? 'active' : 'inactive'}`}>
                        {producto.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEdit(producto)}
                          className="btn btn-sm btn-info"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(producto.productoId)}
                          className="btn btn-sm btn-danger"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionProductos;
