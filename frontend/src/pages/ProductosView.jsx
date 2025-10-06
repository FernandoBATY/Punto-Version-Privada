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

  if (loading) {
    return (
      <div className="productos-container">
        <div className="loading">Cargando productos...</div>
      </div>
    );
  }

  return (
    <div className="productos-container">
      <header className="productos-header">
        <div className="header-title">
          <h1>🛍️ Catálogo de Productos</h1>
          {cliente && (
            <div className="user-info">
              <span className="user-greeting">¡Hola, {cliente.nombre}!</span>
            </div>
          )}
        </div>
        <div className="header-actions">
          {cliente && (
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
          )}
          {!cliente && (
            <Link to="/login/cliente" className="btn btn-login">
              🔐 Iniciar Sesión
            </Link>
          )}
          <Link to="/" className="btn btn-secondary">
            ← Inicio
          </Link>
        </div>
      </header>

      <div className="filters-section">
        <h3>Filtros de Búsqueda</h3>
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

      {error && <div className="error-message">{error}</div>}

      <div className="productos-grid">
        {productos.length === 0 ? (
          <div className="no-products">
            <p>No se encontraron productos</p>
          </div>
        ) : (
          productos.map(producto => (
            <div key={producto.productoId} className="producto-card">
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
                <span className="producto-icon" style={{ display: producto.imagenes && producto.imagenes.length > 0 ? 'none' : 'block' }}>
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
                onClick={() => handleAddToCart(producto)}
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
  );
};

export default ProductosView;
