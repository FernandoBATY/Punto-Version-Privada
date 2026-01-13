const API_BASE_URL = 'http://localhost:5028/api';

async function request(url, options = {}) {
  try {
    const res = await fetch(url, options);
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
    }
    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        message: data?.message || res.statusText,
        data,
      };
    }
    return { success: true, status: res.status, data };
  } catch (err) {
    return { success: false, status: 0, message: 'No se pudo conectar con el servidor', data: null };
  }
}

export const authAPI = {
  clienteRegistro: async (clienteData) => {
    return request(`${API_BASE_URL}/auth/cliente/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clienteData),
    });
  },

  clienteLogin: async (credentials) => {
    return request(`${API_BASE_URL}/auth/cliente/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
  },

  getCliente: async (id) => {
    return request(`${API_BASE_URL}/auth/cliente/${id}`);
  },

  proveedorRegistro: async (proveedorData) => {
    return request(`${API_BASE_URL}/auth/proveedor/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proveedorData),
    });
  },

  proveedorLogin: async (credentials) => {
    return request(`${API_BASE_URL}/auth/proveedor/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
  },

  getProveedor: async (id) => {
    return request(`${API_BASE_URL}/auth/proveedor/${id}`);
  }
};

export const productosAPI = {
  getProductos: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        queryParams.append(key, filters[key]);
      }
    });
    
    return request(`${API_BASE_URL}/productos?${queryParams}`);
  },

  getProducto: async (id) => {
    return request(`${API_BASE_URL}/productos/${id}`);
  },

  createProducto: async (productoData) => {
    return request(`${API_BASE_URL}/productos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productoData)
    });
  },

  createProductoConImagen: async (formData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/productos/con-imagen`, {
        method: 'POST',
        body: formData,
      });
      let data = null;
      try { data = await res.json(); } catch (_) {}
      if (!res.ok) {
        return { success: false, status: res.status, message: data?.message || res.statusText, data };
      }
      return { success: true, status: res.status, data };
    } catch (err) {
      return { success: false, status: 0, message: 'No se pudo conectar con el servidor', data: null };
    }
  },

  updateProducto: async (id, productoData) => {
    return request(`${API_BASE_URL}/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productoData)
    });
  },

  deleteProducto: async (id) => {
    return request(`${API_BASE_URL}/productos/${id}`, { method: 'DELETE' });
  }
};

export const cestaAPI = {
  getCestaCliente: async (clienteId) => {
    return request(`${API_BASE_URL}/cestas/cliente/${clienteId}`);
  },

  agregarProducto: async (itemData) => {
    return request(`${API_BASE_URL}/cestas/agregar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData)
    });
  },

  actualizarCantidad: async (itemData) => {
    return request(`${API_BASE_URL}/cestas/actualizar-cantidad`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData)
    });
  },

  eliminarItem: async (itemCestaId) => {
    return request(`${API_BASE_URL}/cestas/item/${itemCestaId}`, { method: 'DELETE' });
  },

  limpiarCesta: async (clienteId) => {
    return request(`${API_BASE_URL}/cestas/limpiar/${clienteId}`, { method: 'DELETE' });
  }
};

export const ordenesAPI = {
  crearOrden: async (ordenData) => {
    return request(`${API_BASE_URL}/ordenes/crear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ordenData)
    });
  },

  crearOrdenMultiproveedor: async (clienteId) => {
    return request(`${API_BASE_URL}/ordenes/crear-multiproveedor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clienteId })
    });
  },

  getOrden: async (id) => {
    return request(`${API_BASE_URL}/ordenes/${id}`);
  },

  getOrdenesCliente: async (clienteId) => {
    return request(`${API_BASE_URL}/ordenes/cliente/${clienteId}`);
  },

  updateEstadoOrden: async (id, estado) => {
    return request(`${API_BASE_URL}/ordenes/${id}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado })
    });
  }
};

export const pagosAPI = {
  procesarPago: async (pagoData) => {
    return request(`${API_BASE_URL}/pagos/procesar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pagoData)
    });
  },

  getPagosOrden: async (ordenId) => {
    return request(`${API_BASE_URL}/pagos/orden/${ordenId}`);
  },

  getPago: async (id) => {
    return request(`${API_BASE_URL}/pagos/${id}`);
  }
};

export const facturasAPI = {
  generarFactura: async (ordenId) => {
    return request(`${API_BASE_URL}/facturas/generar/${ordenId}`, { method: 'POST' });
  },

  getFactura: async (id) => {
    return request(`${API_BASE_URL}/facturas/${id}`);
  },

  getFacturasCliente: async (clienteId) => {
    return request(`${API_BASE_URL}/facturas/cliente/${clienteId}`);
  },

  descargarPDFFactura: async (facturaId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/facturas/pdf/${facturaId}`);
      if (!response.ok) {
        throw new Error('Error al descargar PDF');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factura_${facturaId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  descargarPDFFacturaPorOrden: async (ordenId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/facturas/pdf-orden/${ordenId}`);
      if (!response.ok) {
        throw new Error('Error al descargar PDF');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factura_Orden_${ordenId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
};

export const dashboardAPI = {
  getDashboardProveedor: async (proveedorId) => {
    return request(`${API_BASE_URL}/dashboard/proveedor/${proveedorId}`);
  },

  getProductosProveedor: async (proveedorId) => {
    return request(`${API_BASE_URL}/dashboard/productos/${proveedorId}`);
  },

  getOrdenesProveedor: async (proveedorId) => {
    return request(`${API_BASE_URL}/dashboard/ordenes/${proveedorId}`);
  }
};

export const categoriasAPI = {
  getCategorias: async () => {
    return request(`${API_BASE_URL}/categorias`);
  },

  getCategoria: async (id) => {
    return request(`${API_BASE_URL}/categorias/${id}`);
  },

  createCategoria: async (categoriaData) => {
    return request(`${API_BASE_URL}/categorias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoriaData)
    });
  },

  updateCategoria: async (id, categoriaData) => {
    return request(`${API_BASE_URL}/categorias/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoriaData)
    });
  },

  deleteCategoria: async (id) => {
    return request(`${API_BASE_URL}/categorias/${id}`, { method: 'DELETE' });
  }
};

export const tiposProductoAPI = {
  getTiposProducto: async () => {
    return request(`${API_BASE_URL}/tiposproducto`);
  },

  getTipoProducto: async (id) => {
    return request(`${API_BASE_URL}/tiposproducto/${id}`);
  },

  createTipoProducto: async (tipoData) => {
    return request(`${API_BASE_URL}/tiposproducto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tipoData)
    });
  },

  updateTipoProducto: async (id, tipoData) => {
    return request(`${API_BASE_URL}/tiposproducto/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tipoData)
    });
  },

  deleteTipoProducto: async (id) => {
    return request(`${API_BASE_URL}/tiposproducto/${id}`, { method: 'DELETE' });
  }
};