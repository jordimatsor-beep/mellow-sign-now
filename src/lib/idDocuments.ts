/**
 * Identity / tax document types for signers.
 *
 * FirmaClara originally accepted only Spanish NIF/NIE/CIF and blocked the
 * document flow when the checksum failed. That made it impossible to send a
 * contract to a signer from Argentina, Colombia, Mexico… without inventing a
 * fake NIF, so signers now pick a document type and type the number freely.
 *
 * Validation policy — deliberate and important:
 *  - Spanish documents stay STRICT (blocking). The MOD-23 checksum catches
 *    real typos and Spain is the bulk of the traffic; losing it would be a
 *    regression.
 *  - Every other document is ADVISORY at most: a wrong-looking value shows a
 *    hint but never blocks sending. Identity-document rules change per country
 *    and per issuing year, and a false negative here means a customer simply
 *    cannot use the product.
 */

import { isValidTaxId } from "./validators";

export type IdDocumentValidation = "strict" | "advisory" | "free";

export interface IdDocumentType {
  /** Stored in documents.signer_tax_id_type / contacts.nif_type. */
  code: string;
  /** Short name shown in the selector and printed before the number. */
  label: string;
  /** Country/region shown as a hint in the selector. */
  country: string;
  placeholder: string;
  validation: IdDocumentValidation;
}

/** Default for existing records and for Spanish issuers. */
export const DEFAULT_ID_DOCUMENT = "ES_NIF";

export const ID_DOCUMENT_TYPES: IdDocumentType[] = [
  { code: "ES_NIF", label: "NIF / NIE / CIF", country: "España", placeholder: "12345678Z", validation: "strict" },
  { code: "AR_CUIT", label: "CUIT / CUIL", country: "Argentina", placeholder: "20-12345678-6", validation: "advisory" },
  { code: "MX_RFC", label: "RFC", country: "México", placeholder: "GODE561231GR8", validation: "advisory" },
  { code: "MX_CURP", label: "CURP", country: "México", placeholder: "GODE561231HDFSRL01", validation: "advisory" },
  { code: "CO_CC", label: "Cédula de ciudadanía", country: "Colombia", placeholder: "1020304050", validation: "advisory" },
  { code: "CO_NIT", label: "NIT", country: "Colombia", placeholder: "900123456-7", validation: "advisory" },
  { code: "CL_RUT", label: "RUT", country: "Chile", placeholder: "12.345.678-5", validation: "advisory" },
  { code: "PE_RUC", label: "RUC", country: "Perú / Ecuador", placeholder: "20123456789", validation: "advisory" },
  { code: "BR_CPF", label: "CPF / CNPJ", country: "Brasil", placeholder: "123.456.789-09", validation: "advisory" },
  { code: "CI", label: "Cédula de identidad", country: "Otros países", placeholder: "Número del documento", validation: "free" },
  { code: "PASSPORT", label: "Pasaporte", country: "Internacional", placeholder: "ABC123456", validation: "free" },
  { code: "OTHER", label: "Otro documento", country: "Internacional", placeholder: "Número del documento", validation: "free" },
];

export const getIdDocumentType = (code: string | null | undefined): IdDocumentType =>
  ID_DOCUMENT_TYPES.find((t) => t.code === code) ||
  ID_DOCUMENT_TYPES.find((t) => t.code === DEFAULT_ID_DOCUMENT)!;

/** Strips separators so checksums can run on the bare characters. */
const bare = (value: string): string => value.toUpperCase().replace(/[\s.\-/]/g, "");

/**
 * Argentine CUIT/CUIL: 11 digits, last one is a mod-11 check digit.
 * https://www.afip.gob.ar
 */
export const isValidCUIT = (value: string): boolean => {
  const digits = bare(value);
  if (!/^\d{11}$/.test(digits)) return false;

  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const remainder = 11 - (sum % 11);
  const check = remainder === 11 ? 0 : remainder === 10 ? 9 : remainder;

  return check === Number(digits[10]);
};

/** Chilean RUT: mod-11 check digit, where 10 is written as "K". */
export const isValidRUT = (value: string): boolean => {
  const clean = bare(value);
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;

  const body = clean.slice(0, -1);
  const check = clean.slice(-1);

  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);

  return expected === check;
};

/** Brazilian CPF (11 digits): two mod-11 check digits. */
export const isValidCPF = (value: string): boolean => {
  const digits = bare(value);
  if (!/^\d{11}$/.test(digits)) return false;
  // Repeated digits (000..., 111...) pass the checksum but are never real.
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const checkDigit = (upTo: number): number => {
    let sum = 0;
    for (let i = 0; i < upTo; i++) sum += Number(digits[i]) * (upTo + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return checkDigit(9) === Number(digits[9]) && checkDigit(10) === Number(digits[10]);
};

const ADVISORY_PATTERNS: Record<string, (value: string) => boolean> = {
  AR_CUIT: isValidCUIT,
  CL_RUT: isValidRUT,
  BR_CPF: (v) => (/^\d{14}$/.test(bare(v)) ? true : isValidCPF(v)), // CNPJ (14) accepted as-is
  MX_RFC: (v) => /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(bare(v)),
  MX_CURP: (v) => /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(bare(v)),
  CO_CC: (v) => /^\d{6,11}$/.test(bare(v)),
  CO_NIT: (v) => /^\d{9,10}$/.test(bare(v)),
  PE_RUC: (v) => /^\d{8,13}$/.test(bare(v)),
};

export interface IdDocumentCheck {
  /** Whether the value looks right for the selected type. */
  valid: boolean;
  /** True only when the value must stop the flow (Spanish documents). */
  blocking: boolean;
  /** User-facing hint, already in Spanish. */
  message?: string;
}

const OK: IdDocumentCheck = { valid: true, blocking: false };

/**
 * Checks a signer identity document.
 *
 * An empty value is treated as valid here — whether the field is required is a
 * decision of the calling form, not of this function.
 */
export const checkIdDocument = (typeCode: string | null | undefined, value: string): IdDocumentCheck => {
  if (!value || !value.trim()) return OK;

  const type = getIdDocumentType(typeCode);

  if (type.validation === "strict") {
    if (isValidTaxId(value)) return OK;
    return {
      valid: false,
      blocking: true,
      message: "Revisa el NIF/NIE/CIF: la letra de control no es válida.",
    };
  }

  if (type.validation === "advisory") {
    const check = ADVISORY_PATTERNS[type.code];
    if (!check || check(value)) return OK;
    return {
      valid: false,
      blocking: false,
      message: `Este ${type.label} no tiene el formato habitual de ${type.country}. Puedes continuar igualmente.`,
    };
  }

  return OK;
};

/**
 * How the document is printed in the contract header and the audit trail,
 * e.g. "CUIT / CUIL: 30-71234567-8".
 */
export const formatIdDocument = (typeCode: string | null | undefined, value: string | null | undefined): string => {
  if (!value || !value.trim()) return "";
  return `${getIdDocumentType(typeCode).label}: ${value.trim()}`;
};
