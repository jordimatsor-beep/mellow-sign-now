import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface SignPDFOptions {
    signerName: string;
    signerEmail: string;
    signedAt: string; // ISO String
    signatureImage?: string; // Base64
}

/**
 * Appends a signature page to the original PDF.
 * @param originalPdfBuffer Buffer of the original PDF
 * @param options Signature details
 * @returns Buffer of the signed PDF
 */
export async function generateSignedPDF(
    originalPdfBuffer: Buffer,
    options: SignPDFOptions
): Promise<Buffer> {
    // Load the document
    const pdfDoc = await PDFDocument.load(originalPdfBuffer);

    // Embed fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Add a new page (A4 size default: 595 x 842)
    const page = pdfDoc.addPage([595, 842]);
    const { height } = page.getSize();

    // Helper for text drawing
    const drawText = (text: string, x: number, y: number, size: number, isBold: boolean = false) => {
        page.drawText(text, {
            x,
            y,
            size,
            font: isBold ? fontBold : font,
            color: rgb(0, 0, 0),
        });
    };

    // Header
    drawText('PÁGINA DE FIRMA', 50, height - 80, 18, true);

    // Signer Details
    let yPos = height - 140;
    drawText(`Firmante: ${options.signerName}`, 50, yPos, 12);
    yPos -= 25;
    drawText(`Email: ${options.signerEmail}`, 50, yPos, 12);
    yPos -= 25;

    // Format Date for display
    const dateObj = new Date(options.signedAt);
    const dateStr = dateObj.toLocaleString('es-ES', { timeZone: 'UTC' }) + ' (UTC)';
    drawText(`Fecha: ${dateStr}`, 50, yPos, 12);

    // Declaration
    yPos -= 50;
    drawText('Declaración:', 50, yPos, 12, true);
    yPos -= 20;
    drawText('"He leído y acepto el contenido de este documento"', 50, yPos, 11);

    // Visual Signature (if provided)
    if (options.signatureImage) {
        try {
            yPos -= 60;
            drawText('Firma:', 50, yPos, 12, true);

            // Clean base64 string
            const base64Data = options.signatureImage.replace(/^data:image\/\w+;base64,/, '');
            const imageBytes = Buffer.from(base64Data, 'base64');

            // Embed PNG (assuming PNG for signature canvas)
            const signatureImg = await pdfDoc.embedPng(imageBytes);

            // Draw image
            const imgDims = signatureImg.scale(0.5); // Scale down a bit if needed
            page.drawImage(signatureImg, {
                x: 50,
                y: yPos - 100,
                width: Math.min(imgDims.width, 300),
                height: Math.min(imgDims.height, 100),
            });
        } catch (e) {
            console.warn('Failed to embed signature image:', e);
            yPos -= 20;
            drawText('(Error al procesar imagen de firma)', 50, yPos, 10);
        }
    }

    // Footer
    page.drawText('Documento firmado electrónicamente a través de FirmaClara', {
        x: 50,
        y: 50,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
    });

    // Save the document
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}
