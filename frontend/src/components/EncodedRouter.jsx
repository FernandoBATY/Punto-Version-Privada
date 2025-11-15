import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { decryptRoute } from '../utils/routeCipher';

import Home from '../pages/Home';
import ProductosView from '../pages/ProductosView';
import CestaView from '../pages/CestaView';
import HistorialOrdenes from '../pages/HistorialOrdenes';
import ClienteLogin from '../pages/ClienteLogin';
import ProveedorLogin from '../pages/ProveedorLogin';
import ProveedorDashboard from '../pages/ProveedorDashboard';
import GestionProductos from '../pages/GestionProductos';
import GestionCategorias from '../pages/GestionCategorias';
import OrdenesProveedor from '../pages/OrdenesProveedor';

const routeMap = {
  '/': <Home />,
  '/productos': <ProductosView />,
  '/cesta': <CestaView />,
  '/historial': <HistorialOrdenes />,
  '/login/cliente': <ClienteLogin />,
  '/login/proveedor': <ProveedorLogin />,
  '/proveedor/dashboard': <ProveedorDashboard />,
  '/proveedor/productos': <GestionProductos />,
  '/proveedor/categorias': <GestionCategorias />,
  '/proveedor/ordenes': <OrdenesProveedor />
};

export default function EncodedRouter() {
  const { token } = useParams();
  let path = '';
  try {
    path = decryptRoute(token);
  } catch (e) {
    path = '';
  }

  if (!path) return <Navigate to="/" replace />;
  const comp = routeMap[path];
  if (!comp) return <Navigate to="/" replace />;
  return comp;
}
