export function onlyNumbers(value, maxLength = null) {
  let result = value.replace(/\D/g, '');
  if (maxLength && result.length > maxLength) {
    result = result.slice(0, maxLength);
  }
  return result;
}

export function onlyLetters(value, maxLength = null) {
  let result = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
  if (maxLength && result.length > maxLength) {
    result = result.slice(0, maxLength);
  }
  return result;
}

export function onlyAlphanumeric(value, maxLength = null) {
  let result = value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '');
  if (maxLength && result.length > maxLength) {
    result = result.slice(0, maxLength);
  }
  return result;
}

export function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function hasMinLength(value, minLength) {
  return value.length >= minLength;
}

export function hasExactLength(value, exactLength) {
  return value.length === exactLength;
}

export function validatePasswordStrength(password) {
  const requirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isValid =
    requirements.minLength &&
    requirements.hasUpperCase &&
    requirements.hasLowerCase &&
    requirements.hasNumber;

  return { isValid, requirements };
}

export function getFieldValidator(fieldType) {
  const validators = {
    email: (v) => v,
    nombre: onlyLetters,
    apellido: onlyLetters,
    telefono: onlyNumbers,
    rfc: onlyAlphanumeric,
    codigoPostal: onlyNumbers,
    correo: (v) => v,
    contrasena: (v) => v,
  };
  return validators[fieldType] || ((v) => v);
}

export function getFieldMaxLength(fieldType) {
  const maxLengths = {
    email: 255,
    nombre: 100,
    apellido: 100,
    telefono: 10,
    rfc: 13,
    codigoPostal: 5,
    correo: 255,
    contrasena: 255,
  };
  return maxLengths[fieldType] || null;
}

export function getFieldMinLength(fieldType) {
  const minLengths = {
    nombre: 2,
    apellido: 2,
    telefono: 10,
    rfc: 12,
    codigoPostal: 5,
    correo: 5,
    contrasena: 8,
  };
  return minLengths[fieldType] || null;
}

export default {
  onlyNumbers,
  onlyLetters,
  onlyAlphanumeric,
  validateEmail,
  hasMinLength,
  hasExactLength,
  validatePasswordStrength,
  getFieldValidator,
  getFieldMaxLength,
  getFieldMinLength,
};
