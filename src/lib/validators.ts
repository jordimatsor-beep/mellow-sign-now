/**
 * Enhanced validators for FirmaClara
 * Includes proper Spanish NIF/NIE/CIF validation with checksum
 */

// Email validation with stricter regex
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  // RFC 5322 compliant email regex (simplified but robust)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Phone validation - Spanish and international formats
export const isValidPhone = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;

  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Spanish format: +34 followed by 9 digits starting with 6, 7, 8, or 9
  const spanishRegex = /^(\+34|0034)?[6789]\d{8}$/;

  // International format: + followed by 7-15 digits
  const internationalRegex = /^\+[1-9]\d{6,14}$/;

  return spanishRegex.test(cleaned) || internationalRegex.test(cleaned);
};

// Format phone for display
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+34') && cleaned.length === 12) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  return phone;
};

/**
 * Validate Spanish NIF (Número de Identificación Fiscal)
 * Format: 8 digits + 1 control letter
 * Uses MOD 23 algorithm
 */
export const isValidNIF = (nif: string): boolean => {
  if (!nif || typeof nif !== 'string') return false;

  const upperNif = nif.toUpperCase().replace(/[\s\-]/g, '');
  const nifRegex = /^(\d{8})([A-Z])$/;
  const match = upperNif.match(nifRegex);

  if (!match) return false;

  const number = parseInt(match[1], 10);
  const letter = match[2];

  // MOD 23 control letter table
  const controlLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  const expectedLetter = controlLetters[number % 23];

  return letter === expectedLetter;
};

/**
 * Validate Spanish NIE (Número de Identidad de Extranjero)
 * Format: X/Y/Z + 7 digits + 1 control letter
 * X=0, Y=1, Z=2 for calculation
 */
export const isValidNIE = (nie: string): boolean => {
  if (!nie || typeof nie !== 'string') return false;

  const upperNie = nie.toUpperCase().replace(/[\s\-]/g, '');
  const nieRegex = /^([XYZ])(\d{7})([A-Z])$/;
  const match = upperNie.match(nieRegex);

  if (!match) return false;

  const prefix = match[1];
  const digits = match[2];
  const letter = match[3];

  // Replace prefix letter with number
  const prefixMap: Record<string, string> = { 'X': '0', 'Y': '1', 'Z': '2' };
  const number = parseInt(prefixMap[prefix] + digits, 10);

  // MOD 23 control letter table
  const controlLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  const expectedLetter = controlLetters[number % 23];

  return letter === expectedLetter;
};

/**
 * Validate Spanish CIF (Código de Identificación Fiscal)
 * Format: Letter + 7 digits + control character (digit or letter)
 */
export const isValidCIF = (cif: string): boolean => {
  if (!cif || typeof cif !== 'string') return false;

  const upperCif = cif.toUpperCase().replace(/[\s\-]/g, '');
  const cifRegex = /^([ABCDEFGHJKLMNPQRSUVW])(\d{7})([A-J0-9])$/;
  const match = upperCif.match(cifRegex);

  if (!match) return false;

  const letter = match[1];
  const digits = match[2];
  const control = match[3];

  // Calculate control digit
  let sumA = 0;
  let sumB = 0;

  for (let i = 0; i < 7; i++) {
    const digit = parseInt(digits[i], 10);
    if (i % 2 === 0) {
      // Odd positions (1st, 3rd, 5th, 7th) - multiply by 2
      const doubled = digit * 2;
      sumA += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      // Even positions (2nd, 4th, 6th)
      sumB += digit;
    }
  }

  const total = sumA + sumB;
  const controlDigit = (10 - (total % 10)) % 10;

  // Some CIF types use letter, others use digit
  const lettersOnlyTypes = 'KPQRSNW';
  const digitsOnlyTypes = 'ABEH';

  if (lettersOnlyTypes.includes(letter)) {
    // Must be letter J..A (J=0, A=9)
    const controlLetters = 'JABCDEFGHI';
    return control === controlLetters[controlDigit];
  } else if (digitsOnlyTypes.includes(letter)) {
    // Must be digit
    return control === controlDigit.toString();
  } else {
    // Can be either
    const controlLetters = 'JABCDEFGHI';
    return control === controlDigit.toString() || control === controlLetters[controlDigit];
  }
};

/**
 * Validate any Spanish Tax ID (NIF, NIE, or CIF)
 */
export const isValidTaxId = (taxId: string): boolean => {
  if (!taxId || typeof taxId !== 'string') return false;

  const cleaned = taxId.toUpperCase().replace(/[\s\-]/g, '');

  // Try each format
  if (/^\d{8}[A-Z]$/.test(cleaned)) {
    return isValidNIF(cleaned);
  } else if (/^[XYZ]\d{7}[A-Z]$/.test(cleaned)) {
    return isValidNIE(cleaned);
  } else if (/^[A-W]\d{7}[A-J0-9]$/.test(cleaned)) {
    return isValidCIF(cleaned);
  }

  return false;
};

/**
 * Format Tax ID for display (add dashes)
 */
export const formatTaxId = (taxId: string): string => {
  if (!taxId) return '';
  const cleaned = taxId.toUpperCase().replace(/[\s\-]/g, '');

  // NIF: 12345678A -> 12345678-A
  if (/^\d{8}[A-Z]$/.test(cleaned)) {
    return `${cleaned.slice(0, 8)}-${cleaned.slice(8)}`;
  }
  // NIE: X1234567A -> X-1234567-A
  if (/^[XYZ]\d{7}[A-Z]$/.test(cleaned)) {
    return `${cleaned[0]}-${cleaned.slice(1, 8)}-${cleaned.slice(8)}`;
  }
  // CIF: A1234567B -> A-1234567-B
  if (/^[A-W]\d{7}[A-J0-9]$/.test(cleaned)) {
    return `${cleaned[0]}-${cleaned.slice(1, 8)}-${cleaned.slice(8)}`;
  }

  return taxId;
};

/**
 * Password strength validation
 * Requirements: min 12 chars, uppercase, lowercase, number
 */
export const isValidPassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['La contraseña es requerida'] };
  }

  if (password.length < 12) {
    errors.push('Mínimo 12 caracteres');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Debe incluir minúscula');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Debe incluir mayúscula');
  }
  if (!/\d/.test(password)) {
    errors.push('Debe incluir número');
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate URL
 */
export const isValidUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};
