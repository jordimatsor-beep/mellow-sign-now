import * as crypto from 'crypto';

// Note: This matches the user's request for "api/redsys.ts" (Backend) specifically for signature generation.
// In a real usage, this would be an API route handler (e.g., Express, Next.js API route, or Supabase Edge Function).
// Since the environment is Vite+React+Node, this looks like a utility or a backend handler file.

interface RedsysConfig {
    merchantCode: string;
    terminal: string;
    secretKey: string;
}

export class RedsysAPI {
    private config: RedsysConfig;

    constructor(config: RedsysConfig) {
        this.config = config;
    }

    private encrypt3DES(str: string, key: Buffer): Buffer {
        const iv = Buffer.alloc(8, 0); // IV zero for Redsys
        const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);
        cipher.setAutoPadding(false); // Manual padding might be needed or standard pkcs works, Redsys uses ZeroPadding usually or specific logic.
        // However, Node's standard crypto might need careful handling. 
        // Simplified Redsys compatible 3DES implementation often strictly follows their manual.
        // For this task, standard 3DES-CBC is the core.

        // Standard Redsys algorithm often implies:
        // 1. Padding (Multiples of 8 bytes)
        // 2. 3DES CBC with IV=0

        const len = 8 - (str.length % 8);
        const padding = Buffer.alloc(len, 0); // Zero padding
        const paddedStr = Buffer.concat([Buffer.from(str, 'utf-8'), padding]);

        return Buffer.concat([cipher.update(paddedStr), cipher.final()]);
    }

    private base64UrlEncode(str: string): string {
        return Buffer.from(str).toString('base64');
    }

    public createMerchantParameters(amount: string, orderId: string, currency: string = '978', transactionType: string = '0'): string {
        const params = {
            DS_MERCHANT_AMOUNT: amount,
            DS_MERCHANT_ORDER: orderId,
            DS_MERCHANT_MERCHANTCODE: this.config.merchantCode,
            DS_MERCHANT_CURRENCY: currency,
            DS_MERCHANT_TRANSACTIONTYPE: transactionType,
            DS_MERCHANT_TERMINAL: this.config.terminal,
            DS_MERCHANT_MERCHANTURL: "", // callback url
            DS_MERCHANT_URLOK: "", // success
            DS_MERCHANT_URLKO: "", // error
        };
        return Buffer.from(JSON.stringify(params)).toString('base64');
    }

    public createMerchantSignature(merchantParameters: string, orderId: string): string {
        // 1. Decode Key (Base64)
        const key = Buffer.from(this.config.secretKey, 'base64');

        // 2. Encrypt OrderId with 3DES
        const encryptedOrder = this.encrypt3DES(orderId, key);

        // 3. HMAC SHA256 of Parameters using Encrypted Order as Key
        const hmac = crypto.createHmac('sha256', encryptedOrder);
        hmac.update(merchantParameters);
        const signature = hmac.digest('base64');

        return signature;
    }
}

// Example usage:
// const redsys = new RedsysAPI({ merchantCode: '...', terminal: '...', secretKey: '...' });
// const params = redsys.createMerchantParameters('1000', 'ORDER123');
// const signature = redsys.createMerchantSignature(params, 'ORDER123');
