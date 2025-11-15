import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { encryptRoute } from '../utils/routeCipher';
import { authAPI } from '../services/api';
import { sha256Base64 } from '../utils/hash';
import { onlyLetters, onlyNumbers, onlyAlphanumeric } from '../utils/validators';
import './ProveedorLogin.css';

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
    const [validation, setValidation] = useState({
        correo: { isValid: null, message: '' },
        contrasena: {
            isValid: null,
            message: '',
            strength: '',
            requirements: {
                minLength: false,
                hasUpperCase: false,
                hasLowerCase: false,
                hasNumber: false,
                hasSpecialChar: false
            }
        }
    });
    const navigate = useNavigate();

    // Validación de correo electrónico con mensajes detallados
    const validateEmail = (email) => {
        if (!email) {
            return { isValid: null, message: '' };
        }

        const hasAt = email.includes('@');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!hasAt) {
            return { isValid: false, message: 'Falta el símbolo @' };
        }

        const parts = email.split('@');
        if (parts.length > 1 && !parts[1].includes('.')) {
            return { isValid: false, message: 'Falta el dominio (ej: .com)' };
        }

        if (!emailRegex.test(email)) {
            return { isValid: false, message: 'Formato de correo inválido' };
        }

        return { isValid: true, message: '✓ Correo válido' };
    };

    // Validación de contraseña con requisitos detallados
    const validatePassword = (password) => {
        if (!password) {
            return {
                isValid: null,
                message: '',
                strength: '',
                requirements: {
                    minLength: false,
                    hasUpperCase: false,
                    hasLowerCase: false,
                    hasNumber: false,
                    hasSpecialChar: false
                }
            };
        }

        const requirements = {
            minLength: password.length >= 8,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        let strength = '';
        let strengthScore = 0;
        let message = '';
        const messages = [];

        // Contar requisitos cumplidos
        Object.values(requirements).forEach(req => {
            if (req) strengthScore++;
        });

        // Generar mensajes específicos para requisitos faltantes
        if (!requirements.minLength) {
            messages.push('Mínimo 8 caracteres');
        }
        if (!requirements.hasUpperCase) {
            messages.push('Falta una mayúscula (A-Z)');
        }
        if (!requirements.hasLowerCase) {
            messages.push('Falta una minúscula (a-z)');
        }
        if (!requirements.hasNumber) {
            messages.push('Falta un número (0-9)');
        }
        if (!requirements.hasSpecialChar) {
            messages.push('Falta un símbolo (!@#$%^&*)');
        }

        // Determinar fortaleza
        if (strengthScore <= 2) {
            strength = 'weak';
            message = messages.length > 0 ? messages[0] : 'Contraseña débil';
        } else if (strengthScore <= 4) {
            strength = 'medium';
            message = messages.length > 0 ? messages[0] : 'Contraseña media';
        } else {
            strength = 'strong';
            message = '✓ Contraseña fuerte';
        }

        const isValid = requirements.minLength && requirements.hasUpperCase &&
            requirements.hasLowerCase && requirements.hasNumber;

        return {
            isValid: isValid ? true : false,
            message,
            strength,
            requirements
        };
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let processedValue = value;

        // Aplicar validadores según el tipo de campo
        switch (name) {
            case 'nombre':
            case 'apellido':
                // Solo letras y espacios (máx 100)
                processedValue = onlyLetters(value, 100);
                break;

            case 'telefono':
                // Solo números (máx 10)
                processedValue = onlyNumbers(value, 10);
                break;

            case 'rfc':
                // Solo letras y números, mayúsculas (máx 13)
                processedValue = onlyAlphanumeric(value, 13).toUpperCase();
                break;

            case 'codigoPostal':
                // Solo números (máx 5)
                processedValue = onlyNumbers(value, 5);
                break;

            default:
                processedValue = value;
        }

        setFormData({
            ...formData,
            [name]: processedValue
        });

        // Validar en tiempo real para correo y contraseña
        if (name === 'correo') {
            const emailValidation = validateEmail(processedValue);
            setValidation(prev => ({
                ...prev,
                correo: { isValid: emailValidation, message: emailValidation ? '✓ Correo válido' : 'Formato de correo inválido' }
            }));
        }
    };

    const validateForm = () => {
        // Validar correo en todos los casos (login y registro)
        const emailValid = validateEmail(formData.correo);
        if (!emailValid) {
            setError('Por favor ingresa un correo válido');
            return false;
        }

        // Validar contraseña en todos los casos (login y registro)
        if (!formData.contrasena || formData.contrasena.trim().length === 0) {
            setError('La contraseña es obligatoria');
            return false;
        }

        if (!isLogin) {
            // REGISTRO: Validaciones adicionales
            // Validar nombre
            if (!formData.nombre || formData.nombre.trim().length < 2) {
                setError('El nombre debe tener al menos 2 caracteres');
                return false;
            }

            // Validar apellido
            if (!formData.apellido || formData.apellido.trim().length < 2) {
                setError('El apellido debe tener al menos 2 caracteres');
                return false;
            }

            // Validar teléfono (requerido en registro)
            if (!formData.telefono || formData.telefono.length !== 10) {
                setError('El teléfono debe tener exactamente 10 dígitos');
                return false;
            }

            // Validar RFC (requerido en registro)
            if (!formData.rfc || (formData.rfc.length < 12 || formData.rfc.length > 13)) {
                setError('El RFC debe tener 12 o 13 caracteres');
                return false;
            }

            // Validar código postal (requerido en registro)
            if (!formData.codigoPostal || formData.codigoPostal.length !== 5) {
                setError('El código postal debe tener exactamente 5 dígitos');
                return false;
            }

            // Validar régimen fiscal
            if (!formData.regimenFiscal || formData.regimenFiscal.trim().length === 0) {
                setError('El régimen fiscal es obligatorio');
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validación final antes de enviar
        const emailValidation = validateEmail(formData.correo);
        const passwordValidation = validatePassword(formData.contrasena);

        if (!emailValidation.isValid || (!isLogin && !passwordValidation.isValid)) {
            setError('Por favor corrige los errores en el formulario');
            setLoading(false);
            return;
        }

        // Validar formulario adicional para registro
        if (!validateForm()) {
            setLoading(false);
            return;
        }

        try {
            // Hash contraseña en cliente para evitar mostrarla en texto plano
            const hashed = await sha256Base64(formData.contrasena || '');
            let resp;
            if (isLogin) {
                resp = await authAPI.proveedorLogin({
                    correo: formData.correo,
                    contrasena: hashed
                });
            } else {
                resp = await authAPI.proveedorRegistro({
                    correo: formData.correo,
                    contrasena: hashed,
                    nombre: formData.nombre.trim(),
                    apellido: formData.apellido.trim(),
                    rfc: formData.rfc || null,
                    telefono: formData.telefono || null,
                    regimenFiscal: formData.regimenFiscal || null,
                    codigoPostal: formData.codigoPostal || null
                });
            }

            if (resp.success) {
                localStorage.setItem('proveedor', JSON.stringify(resp.data));
                navigate(`/e/${encryptRoute('/proveedor/dashboard')}`);
            } else {
                setError(resp.message || 'Error en la operación');
            }
        } catch (err) {
            setError('Error de conexión. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setValidation({
            correo: { isValid: null, message: '' },
            contrasena: {
                isValid: null,
                message: '',
                strength: '',
                requirements: {
                    minLength: false,
                    hasUpperCase: false,
                    hasLowerCase: false,
                    hasNumber: false,
                    hasSpecialChar: false
                }
            }
        });
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
                            className={validation.correo.isValid === false ? 'error' : validation.correo.isValid === true ? 'success' : ''}
                        />
                        {validation.correo.message && (
                            <div className={`validation-message ${validation.correo.isValid ? 'success' : 'error'}`}>
                                {validation.correo.message}
                            </div>
                        )}
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
                            className={validation.contrasena.isValid === false ? 'error' : validation.contrasena.isValid === true ? 'success' : ''}
                        />

                        {/* Mostrar requisitos de contraseña en modo registro */}
                        {!isLogin && formData.contrasena && (
                            <>
                                <div className="password-requirements">
                                    <div className={`requirement ${validation.contrasena.requirements.minLength ? 'met' : ''}`}>
                                        {validation.contrasena.requirements.minLength ? '✓' : '○'} Mínimo 8 caracteres
                                    </div>
                                    <div className={`requirement ${validation.contrasena.requirements.hasUpperCase ? 'met' : ''}`}>
                                        {validation.contrasena.requirements.hasUpperCase ? '✓' : '○'} Una letra mayúscula (A-Z)
                                    </div>
                                    <div className={`requirement ${validation.contrasena.requirements.hasLowerCase ? 'met' : ''}`}>
                                        {validation.contrasena.requirements.hasLowerCase ? '✓' : '○'} Una letra minúscula (a-z)
                                    </div>
                                    <div className={`requirement ${validation.contrasena.requirements.hasNumber ? 'met' : ''}`}>
                                        {validation.contrasena.requirements.hasNumber ? '✓' : '○'} Un número (0-9)
                                    </div>
                                    <div className={`requirement ${validation.contrasena.requirements.hasSpecialChar ? 'met' : ''}`}>
                                        {validation.contrasena.requirements.hasSpecialChar ? '✓' : '○'} Un símbolo especial (!@#$%^&*)
                                    </div>
                                </div>

                                {validation.contrasena.strength && (
                                    <div className="password-strength">
                                        <div className="strength-bar">
                                            <div className={`strength-fill ${validation.contrasena.strength}`}></div>
                                        </div>
                                        <div className={`strength-text ${validation.contrasena.strength}`}>
                                            {validation.contrasena.message}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Mensaje de validación para login */}
                        {isLogin && validation.contrasena.message && formData.contrasena && (
                            <div className={`validation-message ${validation.contrasena.isValid ? 'success' : 'error'}`}>
                                {validation.contrasena.message}
                            </div>
                        )}
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
                                    placeholder="12345"
                                    maxLength="5"
                                />
                                <small className="input-hint">5 dígitos</small>
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
                            onClick={toggleMode}
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

export default ProveedorLogin;