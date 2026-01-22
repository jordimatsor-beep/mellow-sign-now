const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');

async function createPdf() {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage()
    const { width, height } = page.getSize()
    const fontSize = 30
    page.drawText('Test Document TSA', {
        x: 50,
        y: height - 4 * fontSize,
        size: fontSize,
        color: rgb(0, 0.53, 0.71),
    })

    const pdfBytes = await pdfDoc.save()
    fs.writeFileSync('test_doc.pdf', pdfBytes);
    console.log('PDF created: test_doc.pdf');
}

createPdf();
