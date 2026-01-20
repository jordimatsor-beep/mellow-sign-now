import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface CertificateData {
    documentTitle: string;
    documentId: string;
    senderName: string;
    senderEmail: string;
    signerName: string;
    signerEmail: string;
    signerIp: string;
    signerUserAgent: string;
    originalHash: string;
    signedHash: string;
    tsaTimestamp: string;
    tsaResponse: string; // Base64 or string representation
    events: Array<{
        date: string;
        description: string;
    }>;
}

export async function generateCertificate(data: CertificateData): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50;
    const leftMargin = 50;
    const lineHeight = 15;

    const drawLine = (text: string, isBold: boolean = false, size: number = 10, color = rgb(0, 0, 0)) => {
        page.drawText(text, { x: leftMargin, y, size, font: isBold ? fontBold : font, color });
        y -= lineHeight;
    };

    const drawLabelValue = (label: string, value: string) => {
        page.drawText(label, { x: leftMargin, y, size: 10, font: fontBold });
        page.drawText(value, { x: leftMargin + 100, y, size: 10, font });
        y -= lineHeight;
    };

    // Title
    drawLine('CERTIFICADO DE EVIDENCIAS TÉCNICAS', true, 16);
    drawLine('FirmaClara', false, 12, rgb(0.5, 0.5, 0.5));
    y -= 20;

    // Document Info
    drawLine('INFORMACIÓN DEL DOCUMENTO', true, 11);
    drawLabelValue('Título:', data.documentTitle);
    drawLabelValue('ID:', data.documentId);
    y -= 10;

    // Sender Info
    drawLine('EMISOR', true, 11);
    drawLabelValue('Nombre:', data.senderName);
    drawLabelValue('Email:', data.senderEmail);
    y -= 10;

    // Signer Info
    drawLine('FIRMANTE', true, 11);
    drawLabelValue('Nombre:', data.signerName);
    drawLabelValue('Email:', data.signerEmail);
    drawLabelValue('IP:', data.signerIp);
    // User Agent can be long
    page.drawText('Navegador:', { x: leftMargin, y, size: 10, font: fontBold });
    y -= lineHeight; // Move down for user agent content
    page.drawText(data.signerUserAgent.substring(0, 80) + '...', { x: leftMargin, y, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
    y -= lineHeight;
    y -= 10;

    // Evidencias Técnicas
    drawLine('EVIDENCIAS TÉCNICAS', true, 11);

    page.drawText('Hash Original (SHA-256):', { x: leftMargin, y, size: 10, font: fontBold });
    y -= lineHeight;
    page.drawText(data.originalHash, { x: leftMargin, y, size: 9, font: font });
    y -= lineHeight;

    page.drawText('Hash Firmado (SHA-256):', { x: leftMargin, y, size: 10, font: fontBold });
    y -= lineHeight;
    page.drawText(data.signedHash, { x: leftMargin, y, size: 9, font: font });
    y -= lineHeight;

    drawLabelValue('Sellado Tiempo:', data.tsaTimestamp);
    page.drawText('TSA Response (Truncated):', { x: leftMargin, y, size: 10, font: fontBold });
    y -= lineHeight;
    page.drawText((data.tsaResponse || '').substring(0, 60) + '...', { x: leftMargin, y, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
    y -= lineHeight;
    y -= 10;

    // Cronología
    drawLine('CRONOLOGÍA DE EVENTOS', true, 11);
    for (const event of data.events) {
        const dateStr = new Date(event.date).toLocaleString('es-ES', { timeZone: 'UTC' });
        page.drawText(dateStr, { x: leftMargin, y, size: 9, font });
        page.drawText(event.description, { x: leftMargin + 120, y, size: 9, font: fontBold });
        y -= lineHeight;
    }
    y -= 20;

    // Footer / Legal
    drawLine('AVISO LEGAL', true, 10);
    const legalText = [
        'Este certificado documenta las evidencias técnicas de la firma electrónica simple',
        'realizada a través de FirmaClara. La firma electrónica simple tiene efectos jurídicos',
        'conforme al artículo 25 del Reglamento (UE) 910/2014 (eIDAS).',
        'Este certificado no constituye firma electrónica cualificada.'
    ];

    legalText.forEach(line => {
        page.drawText(line, { x: leftMargin, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
        y -= 10;
    });

    return Buffer.from(await pdfDoc.save());
}
