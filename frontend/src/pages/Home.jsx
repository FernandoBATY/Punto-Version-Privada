import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <header className="home-header">
        <h1>🛒 Punto de Venta</h1>
        <p>Sistema de gestión de productos y ventas</p>
      </header>

      <div className="home-options">
        <div className="option-card">
          <h2>👤 Cliente</h2>
          <p>Explora productos, agrega al carrito y realiza compras</p>
          <div className="option-buttons">
            <Link to="/productos" className="btn btn-primary">
              Ver Productos
            </Link>
            <Link to="/login/cliente" className="btn btn-secondary">
              Iniciar Sesión
            </Link>
          </div>
        </div>

        <div className="option-card">
          <h2>🏪 Proveedor</h2>
          <p>Gestiona tus productos, categorías y órdenes</p>
          <div className="option-buttons">
            <Link to="/login/proveedor" className="btn btn-primary">
              Acceder Dashboard
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Home;