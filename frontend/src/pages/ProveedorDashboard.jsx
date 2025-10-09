import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import {
    BarChart, Bar, PieChart, Pie, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Cell
} from 'recharts';
import './ProveedorDashboard.css';

const ProveedorDashboard = () => {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [proveedor, setProveedor] = useState(null);
    const navigate = useNavigate();

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
            loadDashboard(parsedProveedor.proveedorId);
        } catch (error) {
            console.error('Error parsing proveedor data:', error);
            localStorage.removeItem('proveedor');
            navigate('/login/proveedor');
        }
    }, [navigate]);

    const loadDashboard = async (proveedorId) => {
        try {
            setLoading(true);
            setError('');
            console.log('Cargando dashboard para proveedor:', proveedorId);
            const response = await dashboardAPI.getDashboardProveedor(proveedorId);
            console.log('Respuesta del dashboard:', response);

            if (!response.success) {
                setError(response.message || 'Error al cargar el dashboard');
                setDashboard(null);
                return;
            }

            setDashboard(response.data);
        } catch (err) {
            console.error('Error en loadDashboard:', err);
            setError('Error al cargar el dashboard: ' + err.message);
            setDashboard(null);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('proveedor');
        navigate('/');
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Preparar datos para las gráficas
    const prepareChartData = () => {
        if (!dashboard) return null;

        // Datos para gráfica de productos (Pie Chart)
        const productosData = [
            {
                name: 'Activos',
                value: dashboard.estadisticasProductos?.productosActivos || 0,
                color: '#27ae60'
            },
            {
                name: 'Inactivos',
                value: dashboard.estadisticasProductos?.productosInactivos || 0,
                color: '#e74c3c'
            },
            {
                name: 'Sin Stock',
                value: dashboard.estadisticasProductos?.productosSinStock || 0,
                color: '#95a5a6'
            },
            {
                name: 'Bajo Stock',
                value: dashboard.estadisticasProductos?.productosBajoStock || 0,
                color: '#f39c12'
            }
        ].filter(item => item.value > 0);

        // Datos para gráfica de inventario (Bar Chart)
        const inventarioData = [
            {
                categoria: 'Total',
                cantidad: dashboard.estadisticasProductos?.totalProductos || 0,
                color: '#667eea'
            },
            {
                categoria: 'Activos',
                cantidad: dashboard.estadisticasProductos?.productosActivos || 0,
                color: '#27ae60'
            },
            {
                categoria: 'Inactivos',
                cantidad: dashboard.estadisticasProductos?.productosInactivos || 0,
                color: '#e74c3c'
            },
            {
                categoria: 'Bajo Stock',
                cantidad: dashboard.estadisticasProductos?.productosBajoStock || 0,
                color: '#f39c12'
            }
        ];

        // Datos para ventas por mes (Line Chart)
        const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const ventasPorMesData = dashboard.ventasPorMes?.map(venta => ({
            mes: `${mesesNombres[venta.mes - 1]} ${venta.año}`,
            ventas: parseFloat(venta.total.toFixed(2)),
            ordenes: venta.cantidadOrdenes
        })) || [];

        // Datos para productos más vendidos (Bar Chart)
        const productosMasVendidosData = dashboard.productosMasVendidos?.slice(0, 5).map(prod => ({
            nombre: prod.nombre.length > 20 ? prod.nombre.substring(0, 20) + '...' : prod.nombre,
            cantidad: prod.cantidadVendida,
            ventas: parseFloat(prod.totalVentas.toFixed(2))
        })) || [];

        // Datos para estados de órdenes (Pie Chart)
        const estadosOrdenesData = dashboard.estadosOrdenes?.map((estado, index) => ({
            name: estado.estado,
            value: estado.cantidad,
            color: ['#27ae60', '#f39c12', '#e74c3c', '#3498db', '#9b59b6'][index % 5]
        })) || [];

        return {
            productosData,
            inventarioData,
            ventasPorMesData,
            productosMasVendidosData,
            estadosOrdenesData
        };
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="loading">Cargando dashboard...</div>
            </div>
        );
    }

    const chartData = prepareChartData();

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-content">
                    <div className="header-left">
                        <Link to="/" className="logo">POS-ting</Link>
                    </div>

                    <div className="header-actions">
                        <span className="user-greeting">
                            {proveedor?.nombre} {proveedor?.apellido}
                        </span>
                        <button onClick={handleLogout} className="btn btn-danger">
                            🚪 Cerrar Sesión
                        </button>
                    </div>
                </div>
            </header>

            <section className="banner-section">
                <div className="banner-content">
                    <h1 className="banner-title">🏪 Dashboard del Proveedor</h1>
                    <p className="banner-subtitle">
                        Gestiona tus productos, categorías y órdenes de forma eficiente
                    </p>
                </div>
            </section>

            <div className="dashboard-main-content">
                {error && <div className="error-message">{error}</div>}

                {/* Tarjetas de Navegación Rápida */}
                <div className="dashboard-nav">
                    <Link to="/proveedor/productos" className="nav-card">
                        <div className="nav-icon">📦</div>
                        <h3>Gestionar Productos</h3>
                        <p>Agregar, editar y eliminar productos de tu inventario</p>
                    </Link>

                    <Link to="/proveedor/categorias" className="nav-card">
                        <div className="nav-icon">🏷️</div>
                        <h3>Gestionar Categorías</h3>
                        <p>Administrar y organizar categorías de productos</p>
                    </Link>
                </div>

                {/* Estadísticas con Tarjetas */}
                {dashboard ? (
                    <>
                        <div className="dashboard-stats">
                            <h2>📊 Estadísticas Generales</h2>

                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-icon">📦</div>
                                    <div className="stat-info">
                                        <h3>{dashboard.estadisticasProductos?.productosActivos || 0}</h3>
                                        <p>Productos Activos</p>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon">💰</div>
                                    <div className="stat-info">
                                        <h3>${(dashboard.estadisticasVentas?.totalVentas || 0).toFixed(2)}</h3>
                                        <p>Ventas Totales</p>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon">✅</div>
                                    <div className="stat-info">
                                        <h3>{dashboard.estadisticasVentas?.ordenesPagadas || 0}</h3>
                                        <p>Órdenes Pagadas</p>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon">🏷️</div>
                                    <div className="stat-info">
                                        <h3>{dashboard.estadisticasProductos?.totalCategorias || 0}</h3>
                                        <p>Categorías</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* GRÁFICAS - SECCIÓN NUEVA */}
                        <div className="charts-section">
                            {/* Fila 1: Distribución de Productos y Estado de Inventario */}
                            <div className="charts-row">
                                {/* Gráfica de Distribución de Productos (Pie) */}
                                {chartData?.productosData && chartData.productosData.length > 0 && (
                                    <div className="chart-card">
                                        <h3 className="chart-title">📊 Distribución de Productos</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={chartData.productosData}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {chartData.productosData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Gráfica de Inventario (Bar) */}
                                {chartData?.inventarioData && (
                                    <div className="chart-card">
                                        <h3 className="chart-title">📦 Estado de Inventario</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={chartData.inventarioData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="categoria" />
                                                <YAxis />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="cantidad" fill="#667eea">
                                                    {chartData.inventarioData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>

                            {/* Fila 2: Ventas por Mes */}
                            {chartData?.ventasPorMesData && chartData.ventasPorMesData.length > 0 && (
                                <div className="chart-card-full">
                                    <h3 className="chart-title">📈 Ventas por Mes</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={chartData.ventasPorMesData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="mes" />
                                            <YAxis yAxisId="left" />
                                            <YAxis yAxisId="right" orientation="right" />
                                            <Tooltip />
                                            <Legend />
                                            <Line
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="ventas"
                                                stroke="#27ae60"
                                                strokeWidth={3}
                                                name="Ventas ($)"
                                            />
                                            <Line
                                                yAxisId="right"
                                                type="monotone"
                                                dataKey="ordenes"
                                                stroke="#3498db"
                                                strokeWidth={3}
                                                name="Órdenes"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Fila 3: Productos Más Vendidos y Estados de Órdenes */}
                            <div className="charts-row">
                                {/* Productos Más Vendidos */}
                                {chartData?.productosMasVendidosData && chartData.productosMasVendidosData.length > 0 && (
                                    <div className="chart-card">
                                        <h3 className="chart-title">🏆 Top 5 Productos Más Vendidos</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart
                                                data={chartData.productosMasVendidosData}
                                                layout="vertical"
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis dataKey="nombre" type="category" width={150} />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="cantidad" fill="#f39c12" name="Cantidad Vendida" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Estados de Órdenes */}
                                {chartData?.estadosOrdenesData && chartData.estadosOrdenesData.length > 0 && (
                                    <div className="chart-card">
                                        <h3 className="chart-title">📋 Estados de Órdenes</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={chartData.estadosOrdenesData}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, value }) => `${name}: ${value}`}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {chartData.estadosOrdenesData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Detalles de Inventario */}
                        {dashboard.estadisticasProductos && (
                            <div className="dashboard-stats">
                                <div className="stats-details">
                                    <h3>📦 Detalles de Inventario</h3>
                                    <div className="details-grid">
                                        <div className="detail-item">
                                            <span className="detail-label">Total de productos:</span>
                                            <span className="detail-value">{dashboard.estadisticasProductos.totalProductos || 0}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Productos activos:</span>
                                            <span className="detail-value">{dashboard.estadisticasProductos.productosActivos || 0}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Productos inactivos:</span>
                                            <span className="detail-value">{dashboard.estadisticasProductos.productosInactivos || 0}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Productos con bajo stock:</span>
                                            <span className="detail-value">{dashboard.estadisticasProductos.productosBajoStock || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="no-data">
                        <div className="no-data-icon">📊</div>
                        <h2>No hay datos disponibles</h2>
                        <p>No se pudieron cargar las estadísticas del dashboard</p>
                        <button onClick={() => loadDashboard(proveedor?.proveedorId)} className="btn btn-primary">
                            🔄 Recargar Dashboard
                        </button>
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

export default ProveedorDashboard;