import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidPhone,
  isValidNIF,
  isValidNIE,
  isValidCIF,
  isValidTaxId,
  isValidPassword,
  isValidUrl,
  formatTaxId,
} from '../lib/validators';

describe('Email Validation', () => {
  it('should validate correct emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    expect(isValidEmail('user+tag@example.org')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('spaces in@email.com')).toBe(false);
  });
});

describe('Phone Validation', () => {
  it('should validate Spanish mobile numbers', () => {
    expect(isValidPhone('612345678')).toBe(true);
    expect(isValidPhone('+34612345678')).toBe(true);
    expect(isValidPhone('0034612345678')).toBe(true);
    expect(isValidPhone('712345678')).toBe(true);
  });

  it('should validate international numbers', () => {
    expect(isValidPhone('+14155551234')).toBe(true);
    expect(isValidPhone('+441onal23456789')).toBe(false); // Invalid
  });

  it('should reject invalid phones', () => {
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone('12345')).toBe(false);
    expect(isValidPhone('abcdefghi')).toBe(false);
  });
});

describe('NIF Validation (Spanish Personal ID)', () => {
  it('should validate correct NIFs with MOD 23', () => {
    // Test known valid NIFs
    expect(isValidNIF('12345678Z')).toBe(true);
    expect(isValidNIF('00000000T')).toBe(true);
    expect(isValidNIF('99999999R')).toBe(true);
  });

  it('should reject NIFs with wrong control letter', () => {
    expect(isValidNIF('12345678A')).toBe(false);
    expect(isValidNIF('00000000A')).toBe(false);
  });

  it('should handle case insensitivity', () => {
    expect(isValidNIF('12345678z')).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(isValidNIF('')).toBe(false);
    expect(isValidNIF('1234567Z')).toBe(false); // Too short
    expect(isValidNIF('123456789Z')).toBe(false); // Too long
  });
});

describe('NIE Validation (Spanish Foreigner ID)', () => {
  it('should validate correct NIEs', () => {
    expect(isValidNIE('X0000000T')).toBe(true);
    expect(isValidNIE('Y0000001R')).toBe(true);
    expect(isValidNIE('Z0000002W')).toBe(true);
  });

  it('should reject NIEs with wrong control letter', () => {
    expect(isValidNIE('X0000000A')).toBe(false);
  });
});

describe('CIF Validation (Spanish Company ID)', () => {
  it('should validate correct CIFs', () => {
    // CIF with letter control (K, P, Q, R, S)
    expect(isValidCIF('Q2826000H')).toBe(true);
    // CIF with digit control (A, B, E, H)
    expect(isValidCIF('A28000012')).toBe(true);
  });

  it('should reject CIFs with wrong control', () => {
    expect(isValidCIF('A12345670')).toBe(false);
  });
});

describe('Generic Tax ID Validation', () => {
  it('should validate any Spanish tax ID type', () => {
    expect(isValidTaxId('12345678Z')).toBe(true); // NIF
    expect(isValidTaxId('X0000000T')).toBe(true); // NIE
    expect(isValidTaxId('Q2826000H')).toBe(true); // CIF
  });

  it('should reject invalid tax IDs', () => {
    expect(isValidTaxId('')).toBe(false);
    expect(isValidTaxId('INVALID')).toBe(false);
  });
});

describe('Password Validation', () => {
  it('should validate strong passwords', () => {
    const result = isValidPassword('SecurePass123');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject weak passwords', () => {
    // Too short
    expect(isValidPassword('Short1A').valid).toBe(false);

    // No uppercase
    expect(isValidPassword('nouppercase123').valid).toBe(false);

    // No lowercase
    expect(isValidPassword('NOLOWERCASE123').valid).toBe(false);

    // No number
    expect(isValidPassword('NoNumberHere').valid).toBe(false);
  });

  it('should return specific error messages', () => {
    const result = isValidPassword('short');
    expect(result.errors).toContain('Mínimo 12 caracteres');
    expect(result.errors).toContain('Debe incluir mayúscula');
    expect(result.errors).toContain('Debe incluir número');
  });
});

describe('URL Validation', () => {
  it('should validate HTTP/HTTPS URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://localhost:3000')).toBe(true);
    expect(isValidUrl('https://sub.domain.co.uk/path?query=1')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('ftp://files.example.com')).toBe(false);
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('Tax ID Formatting', () => {
  it('should format NIF correctly', () => {
    expect(formatTaxId('12345678Z')).toBe('12345678-Z');
  });

  it('should format NIE correctly', () => {
    expect(formatTaxId('X1234567A')).toBe('X-1234567-A');
  });

  it('should format CIF correctly', () => {
    expect(formatTaxId('A1234567B')).toBe('A-1234567-B');
  });
});
