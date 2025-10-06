import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Auth.css';

const ProveedorLogin = () => {
  const [formData, setFormData] = useState({
    correo: '',
    contrasena: '',
    nombre: '',
    apellido: '',
    telefono: '',
    rfc: '',
    regimenFiscal: '',
    codigoPostal: ''
  });
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let resp;
      if (isLogin) {
        resp = await authAPI.proveedorLogin({ correo: formData.correo, contrasena: formData.contrasena });
      } else {
        resp = await authAPI.proveedorRegistro({
          correo: formData.correo,
          contrasena: formData.contrasena,
          nombre: formData.nombre,
          apellido: formData.apellido,
          rfc: formData.rfc || null,
          telefono: formData.telefono || null,
          regimenFiscal: formData.regimenFiscal || null,
          codigoPostal: formData.codigoPostal || null
        });
      }

      if (resp.success) {
        localStorage.setItem('proveedor', JSON.stringify(resp.data));
        navigate('/proveedor/dashboard');
      } else {
        setError(resp.message || 'Error en la operación');
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🏪 {isLogin ? 'Iniciar Sesión' : 'Registrarse'}</h1>
          <p>Accede como proveedor para gestionar productos</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="correo">Correo Electrónico</label>
            <input
              type="email"
              id="correo"
              name="correo"
              value={formData.correo}
              onChange={handleChange}
              required
              placeholder="tu@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="contrasena">Contraseña</label>
            <input
              type="password"
              id="contrasena"
              name="contrasena"
              value={formData.contrasena}
              onChange={handleChange}
              required
              placeholder="Tu contraseña"
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="nombre">Nombre *</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  placeholder="Tu nombre"
                />
              </div>

              <div className="form-group">
                <label htmlFor="apellido">Apellido *</label>
                <input
                  type="text"
                  id="apellido"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleChange}
                  required
                  placeholder="Tu apellido"
                />
              </div>

              <div className="form-group">
                <label htmlFor="telefono">Teléfono</label>
                <input
                  type="tel"
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="Tu teléfono"
                />
              </div>

              <div className="form-group">
                <label htmlFor="rfc">RFC</label>
                <input
                  type="text"
                  id="rfc"
                  name="rfc"
                  value={formData.rfc}
                  onChange={handleChange}
                  placeholder="RFC (opcional)"
                  maxLength="13"
                />
              </div>

              <div className="form-group">
                <label htmlFor="regimenFiscal">Régimen Fiscal</label>
                <select
                  id="regimenFiscal"
                  name="regimenFiscal"
                  value={formData.regimenFiscal}
                  onChange={handleChange}
                >
                  <option value="">Selecciona régimen fiscal</option>
                  <option value="601">601 - General de Ley Personas Morales</option>
                  <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                  <option value="605">605 - Sueldos y Salarios e Ingresos Asimilados a Salarios</option>
                  <option value="606">606 - Arrendamiento</option>
                  <option value="608">608 - Demás ingresos</option>
                  <option value="610">610 - Residentes en el Extranjero sin Establecimiento Permanente en México</option>
                  <option value="611">611 - Ingresos por Dividendos (socios y accionistas)</option>
                  <option value="612">612 - Personas Físicas con Actividades Empresariales y Profesionales</option>
                  <option value="614">614 - Ingresos por intereses</option>
                  <option value="615">615 - Régimen de los ingresos por obtención de premios</option>
                  <option value="616">616 - Sin obligaciones fiscales</option>
                  <option value="620">620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos</option>
                  <option value="621">621 - Incorporación Fiscal</option>
                  <option value="622">622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras</option>
                  <option value="623">623 - Opcional para Grupos de Sociedades</option>
                  <option value="624">624 - Coordinados</option>
                  <option value="625">625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas</option>
                  <option value="626">626 - Régimen Simplificado de Confianza</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="codigoPostal">Código Postal</label>
                <input
                  type="text"
                  id="codigoPostal"
                  name="codigoPostal"
                  value={formData.codigoPostal}
                  onChange={handleChange}
                  placeholder="Código postal"
                  maxLength="5"
                />
              </div>
            </>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            <button 
              type="button" 
              className="link-button"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
          <Link to="/" className="back-link">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
};

export default ProveedorLogin;
