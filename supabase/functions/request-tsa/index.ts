/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as asn1js from "https://esm.sh/asn1js@3.0.5?target=deno";
import * as pkijs from "https://esm.sh/pkijs@3.0.5?target=deno";
import * as pvutils from "https://esm.sh/pvutils@1.1.3?target=deno";

const ALLOWED_ORIGINS = [
  'https://firmaclara.com',
  'https://mellow-sign-now.lovable.app',
  'http://localhost:8080',
  'http://localhost:3000'
];

// Robust list of TSAs to try in order
const TSA_PROVIDERS = [
  { name: 'Apple', url: 'http://timestamp.apple.com/ts01' },
  { name: 'DigiCert', url: 'http://timestamp.digicert.com' },
  { name: 'FreeTSA', url: 'https://freetsa.org/tsr' },
  { name: 'Sectigo', url: 'http://timestamp.sectigo.com' }
];

function hexToArrayBuffer(hex: string): ArrayBuffer {
  if (hex.length % 2 !== 0) hex = '0' + hex;
  const view = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    view[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return view.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowed ? origin : '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin'
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { hash } = await req.json();
    if (!hash) throw new Error('Hash is required');

    console.log(`[TSA] Starting multi-provider attempt for hash: ${hash}`);
    const crypto = globalThis.crypto;

    // Setup pkijs engine
    try {
      const engine = new pkijs.CryptoEngine({ name: "InternalEngine", crypto: crypto, subtle: crypto.subtle });
      pkijs.setEngine("internal", engine);
    } catch (_e) { /* ignore if set */ }

    // Prepare Request (Standard SHA-256)
    const timeStampReq = new pkijs.TimeStampReq();

    // RFC 5754: SHA-256 parameters MUST be absent.
    timeStampReq.messageImprint.hashAlgorithm = new pkijs.AlgorithmIdentifier({
      algorithmId: "2.16.840.1.101.3.4.2.1"
    });

    const inputHashBuffer = hexToArrayBuffer(hash);
    // @ts-ignore - ESM version mismatch in types, runtime compatible
    timeStampReq.messageImprint.hashedMessage = new asn1js.OctetString({ valueHex: inputHashBuffer });

    const nonceBuffer = new Uint8Array(8);
    crypto.getRandomValues(nonceBuffer);
    // @ts-ignore - ESM version mismatch in types, runtime compatible
    timeStampReq.nonce = new asn1js.Integer({ valueHex: nonceBuffer.buffer });

    timeStampReq.certReq = true;

    const reqSchema = timeStampReq.toSchema();
    const reqBuffer = reqSchema.toBER(false);

    let lastError;

    // Failover Loop
    for (const provider of TSA_PROVIDERS) {
      console.log(`[TSA] Attempting provider: ${provider.name} (${provider.url})`);
      try {
        const response = await fetch(provider.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/timestamp-query',
            'User-Agent': 'Deno/TSA-Client'
          },
          body: reqBuffer
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const respBuffer = await response.arrayBuffer();
        if (respBuffer.byteLength === 0) throw new Error('Empty body');

        // Parse & Verify
        const asn1 = asn1js.fromBER(respBuffer);
        if (asn1.offset === -1) throw new Error('ASN.1 parse failed');

        const timeStampResp = new pkijs.TimeStampResp({ schema: asn1.result });

        const status = timeStampResp.status.status;
        if (status !== 0 && status !== 1) {
          const failInfo = timeStampResp.status.failInfo ? timeStampResp.status.failInfo.toString() : 'none';
          throw new Error(`TSA Status ${status} (FailInfo: ${failInfo})`);
        }

        if (!timeStampResp.timeStampToken) throw new Error('No token');

        // Verify Hash Integrity
        const signedData = new pkijs.SignedData({ schema: timeStampResp.timeStampToken.content });
        const encapContent = signedData.encapContentInfo;
        if (!encapContent.eContent) throw new Error('No eContent');

        const tstInfoSchema = asn1js.fromBER(encapContent.eContent.valueBlock.valueHex);
        const tstInfo = new pkijs.TSTInfo({ schema: tstInfoSchema.result });

        const sentHashHex = pvutils.bufferToHexCodes(inputHashBuffer);
        const receivedHashHex = pvutils.bufferToHexCodes(tstInfo.messageImprint.hashedMessage.valueBlock.valueHex);

        if (sentHashHex.toLowerCase() !== receivedHashHex.toLowerCase()) {
          throw new Error(`Hash mismatch: Sent ${sentHashHex} vs Recv ${receivedHashHex}`);
        }

        // Success!
        const genTime = tstInfo.genTime;
        console.log(`[TSA] Success with ${provider.name}! Time: ${genTime.toISOString()}`);

        return new Response(
          JSON.stringify({
            tsr: arrayBufferToBase64(respBuffer),
            timestamp: genTime.toISOString(),
            request: arrayBufferToBase64(reqBuffer),
            provider: provider.name
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.warn(`[TSA] Failed ${provider.name}: ${errorMessage}`);
        lastError = err;
      }
    }

    // If all failed
    throw lastError || new Error('All TSA providers failed');

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown TSA Error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[TSA Error]', error);
    return new Response(
      JSON.stringify({
        error: errorMessage,
        stack: errorStack,
        details: 'All providers failed. Check logs.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})