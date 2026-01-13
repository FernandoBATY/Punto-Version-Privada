import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
    const [showChat, setShowChat] = useState(false);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const scrollToContact = () => {
        const contactSection = document.getElementById('contact-section');
        if (contactSection) {
            contactSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="home-container">
            {/* Encabezado y Navegación */}
            <header className="navbar">

                <div className="navbar-content">
                    <div className="logo">
                        <span className="logo-text">POS-ting</span>
                    </div>

                    <nav className="nav-links">
                        <button onClick={scrollToTop} className="nav-link nav-button">Inicio</button>
                        <Link to="/productos" className="nav-link">Menú</Link>
                        <button onClick={scrollToContact} className="nav-link nav-button">Contacto</button>
                    </nav>

                    <div className="nav-actions">
                       
                        <Link to="/login/cliente" className="btn-login">
                            Iniciar Sesión
                        </Link>
                        <Link to="/login/proveedor" className="btn-dashboard">
                            Acceder Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            {/* Sección Principal con Imagen de Fondo */}
            <section className="hero-section" id="hero-section">
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <h1 className="hero-title">
                        <span className="title-orange">Sabores</span> que <span className="title-white">Enamoran</span>
                    </h1>
                    <p className="hero-subtitle">
                        Descubre la mejor comida casera preparada con ingredientes frescos
                        y entregada directamente a tu puerta
                    </p>
                    <div className="hero-buttons">
                        <Link to="/productos" className="btn-hero btn-primary-hero">
                            Ver Menú
                        </Link>
                        <Link to="/productos" className="btn-hero btn-secondary-hero">
                            Ordenar Ahora
                        </Link>
                    </div>
                </div>
            </section>

            {/* Sección de Categorías */}
            <section className="categories-section">
                <div className="categories-container">
                    <h2 className="categories-title">Nuestras Categorías</h2>
                    <p className="categories-subtitle">
                        Explora nuestra amplia variedad de platillos organizados por categorías
                    </p>

                    <div className="categories-grid">
                        <div className="category-card">
                            <div className="category-icon">🌮</div>
                            <h3 className="category-name">Comida Regional</h3>
                            <p className="category-count">Sabores auténticos de nuestra tierra, recetas tradicionales llenas de historia y pasión.</p>
                        </div>

                        <div className="category-card">
                            <div className="category-icon">🥗</div>
                            <h3 className="category-name">Comida Rápida</h3>
                            <p className="category-count">Deliciosas opciones para disfrutar al momento, perfectas para cualquier ocasión.</p>
                        </div>

                        <div className="category-card">
                            <div className="category-icon">👨‍🍳</div>
                            <h3 className="category-name">Platos Gourmet</h3>
                            <p className="category-count">Alta cocina con ingredientes selectos, experiencias culinarias sofisticadas y elegantes.</p>
                        </div>

                        <div className="category-card">
                            <div className="category-icon">🍰</div>
                            <h3 className="category-name">Postres</h3>
                            <p className="category-count">Endulza tu día con nuestras creaciones artesanales, el final perfecto para tu comida.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Banner de Llamada a la Acción (CTA) */}
            <section className="cta-section">
                <div className="cta-container">
                    <h2 className="cta-title">¿Listo para ordenar?</h2>
                    <p className="cta-subtitle">
                        Únete a miles de clientes satisfechos y disfruta de la mejor comida
                    </p>
                   
                </div>
            </section>

            {/* Pie de Página (Footer) */}
            <footer className="footer" id="contact-section">
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
                    <div className="footer-legal">
                        
                    </div>
                </div>
            </footer>

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

export default Home;

