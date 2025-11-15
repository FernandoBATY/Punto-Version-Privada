import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { encryptRoute } from '../utils/routeCipher';
import { authAPI } from '../services/api';
import { sha256Base64 } from '../utils/hash';
import { onlyLetters, onlyNumbers, onlyAlphanumeric, validateEmail } from '../utils/validators';
import './Auth.css';

const ClienteLogin = () => {
    const [formData, setFormData] = useState({
        correo: '',
        contrasena: '',
        nombre: '',
        apellido: '',
        telefono: '',
        rfc: '',
        regimenFiscal: '',
        codigoPostal: '',
        usoCFDI: ''
    });
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        let processedValue = value;

        switch (name) {
            case 'nombre':
            case 'apellido':
                processedValue = onlyLetters(value, 100);
                break;

            case 'telefono':
                processedValue = onlyNumbers(value, 10);
                break;

            case 'rfc':
                processedValue = onlyAlphanumeric(value, 13).toUpperCase();
                break;

            case 'codigoPostal':
                processedValue = onlyNumbers(value, 5);
                break;

            default:
                processedValue = value;
        }

        setFormData({
            ...formData,
            [name]: processedValue
        });
    };

    const validateForm = () => {
        if (!formData.correo.trim()) {
            setError('El correo es requerido');
            return false;
        }
        if (!validateEmail(formData.correo)) {
            setError('El formato del correo no es válido');
            return false;
        }

        if (!formData.contrasena) {
            setError('La contraseña es requerida');
            return false;
        }

        if (!isLogin) {
            if (formData.nombre.trim().length < 2) {
                setError('El nombre debe tener al menos 2 caracteres');
                return false;
            }

            if (formData.apellido.trim().length < 2) {
                setError('El apellido debe tener al menos 2 caracteres');
                return false;
            }

            if (formData.telefono && formData.telefono.length !== 10) {
                setError('El teléfono debe tener exactamente 10 dígitos');
                return false;
            }

            if (formData.rfc && (formData.rfc.length < 12 || formData.rfc.length > 13)) {
                setError('El RFC debe tener 12 o 13 caracteres');
                return false;
            }

            if (formData.codigoPostal && formData.codigoPostal.length !== 5) {
                setError('El código postal debe tener exactamente 5 dígitos');
                return false;
            }

            if (!formData.regimenFiscal) {
                setError('Debes seleccionar un régimen fiscal');
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!validateForm()) {
            setLoading(false);
            return;
        }

        try {
            const hashed = await sha256Base64(formData.contrasena || '');
            let resp;
            if (isLogin) {
                resp = await authAPI.clienteLogin({ correo: formData.correo, contrasena: hashed });
            } else {
                resp = await authAPI.clienteRegistro({
                    correo: formData.correo,
                    contrasena: hashed,
                    nombre: formData.nombre.trim(),
                    apellido: formData.apellido.trim(),
                    telefono: formData.telefono || null,
                    rfc: formData.rfc || null,
                    regimenFiscal: formData.regimenFiscal,
                    codigoPostal: formData.codigoPostal || null,
                    usoCFDI: formData.usoCFDI || null
                });
            }

            if (resp.success) {
                localStorage.setItem('cliente', JSON.stringify(resp.data));
                navigate(`/e/${encryptRoute('/productos')}`);
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
                    <h1>👤 {isLogin ? 'Iniciar Sesión' : 'Registrarse'}</h1>
                    <p>Accede como cliente para realizar compras</p>
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
                                <small className="input-hint">Solo letras</small>
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
                                <small className="input-hint">Solo letras</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="telefono">Teléfono</label>
                                <input
                                    type="tel"
                                    id="telefono"
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    placeholder="1234567890"
                                />
                                <small className="input-hint">10 dígitos sin espacios</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="rfc">RFC</label>
                                <input
                                    type="text"
                                    id="rfc"
                                    name="rfc"
                                    value={formData.rfc}
                                    onChange={handleChange}
                                    placeholder="XAXX010101000"
                                    maxLength="13"
                                />
                                <small className="input-hint">12 o 13 caracteres en mayúsculas</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="regimenFiscal">Régimen Fiscal *</label>
                                <select
                                    id="regimenFiscal"
                                    name="regimenFiscal"
                                    value={formData.regimenFiscal}
                                    onChange={handleChange}
                                    required
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
                                    placeholder="12345"
                                    maxLength="5"
                                />
                                <small className="input-hint">5 dígitos</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="usoCFDI">Uso CFDI</label>
                                <select
                                    id="usoCFDI"
                                    name="usoCFDI"
                                    value={formData.usoCFDI}
                                    onChange={handleChange}
                                >
                                    <option value="">Selecciona uso CFDI</option>
                                    <option value="G01">G01 - Adquisición de mercancías</option>
                                    <option value="G02">G02 - Devoluciones, descuentos o bonificaciones</option>
                                    <option value="G03">G03 - Gastos en general</option>
                                    <option value="I01">I01 - Construcciones</option>
                                    <option value="I02">I02 - Mobilario y equipo de oficina por inversiones</option>
                                    <option value="I03">I03 - Equipo de transporte</option>
                                    <option value="I04">I04 - Equipo de computo y accesorios</option>
                                    <option value="I05">I05 - Dados, troqueles, moldes, matrices y herramental</option>
                                    <option value="I06">I06 - Comunicaciones telefónicas</option>
                                    <option value="I07">I07 - Comunicaciones satelitales</option>
                                    <option value="I08">I08 - Otra maquinaria y equipo</option>
                                    <option value="D01">D01 - Honorarios médicos, dentales y gastos hospitalarios</option>
                                    <option value="D02">D02 - Gastos médicos por incapacidad o discapacidad</option>
                                    <option value="D03">D03 - Gastos funerales</option>
                                    <option value="D04">D04 - Donativos</option>
                                    <option value="D05">D05 - Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)</option>
                                    <option value="D06">D06 - Aportaciones voluntarias al SAR</option>
                                    <option value="D07">D07 - Primas por seguros de gastos médicos</option>
                                    <option value="D08">D08 - Gastos de transportación escolar obligatoria</option>
                                    <option value="D09">D09 - Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones</option>
                                    <option value="D10">D10 - Pagos por servicios educativos (colegiaturas)</option>
                                    <option value="P01">P01 - Por definir</option>
                                </select>
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
                    <Link to={`/e/${encryptRoute('/')}`} className="back-link">← Volver al inicio</Link>
                </div>
            </div>
        </div>
    );
};

export default ClienteLogin;