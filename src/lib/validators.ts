export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
    // Accepts Spanish phones (9 digits, optional +34) and international formats roughly
    const phoneRegex = /^(\+34|0034|34)?[6789]\d{8}$/;
    // For broader acceptance during dev, we can use a simpler one:
    const simplePhoneRegex = /^\+?[\d\s-]{9,15}$/;
    return simplePhoneRegex.test(phone);
};

export const isValidTaxId = (taxId: string): boolean => {
    // Basic Regex for Spanish NIF/NIE/CIF
    // This is a simplified validation. For production, use a library or full algorithm (mod 23).
    // NIF: 8 numbers + 1 letter
    // NIE: X/Y/Z + 7 numbers + 1 letter
    // CIF: Letter + 8 digits (or 7 digits + letter)

    if (!taxId) return false;
    const upperTaxId = taxId.toUpperCase();

    // Basic structure check
    const structureRegex = /^([A-Z]\d{7}[A-Z0-9]|\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$/;
    return structureRegex.test(upperTaxId);
};
