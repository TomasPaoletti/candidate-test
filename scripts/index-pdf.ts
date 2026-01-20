import axios from 'axios';
import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const API_URL = 'http://localhost:3333/api';

async function extractTextFromPDF(pdfPath: string) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return {
    text: fullText,
    numPages: pdf.numPages,
  };
}

async function indexPDF(pdfPath: string, courseId: string) {
  try {
    console.log(`\n📄 Leyendo PDF: ${pdfPath}`);

    const data = await extractTextFromPDF(pdfPath);

    console.log(`✅ PDF leído exitosamente`);
    console.log(`   📊 Páginas: ${data.numPages}`);
    console.log(`   📝 Caracteres: ${data.text.length}`);

    console.log(`\n🔄 Indexando contenido...`);

    const fileName = pdfPath.split('/').pop()!;
    const response = await axios.post(`${API_URL}/knowledge/index`, {
      courseId,
      content: data.text,
      sourceFile: fileName,
    });

    console.log(`✅ Indexación exitosa!`);
    console.log(`   📦 Chunks creados: ${response.data.chunksCreated}`);

    return response.data;
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Iniciando prueba del sistema RAG\n');
  console.log('='.repeat(50));

  try {
    // 1. Indexar PDF
    await indexPDF(
      './data/courses/javascript-fundamentals.pdf',
      '507f1f77bcf86cd799439011',
    );

    console.log('\n' + '='.repeat(50));
    console.log('✅ Prueba completada exitosamente!');
    console.log('\n💡 Ahora puedes abrir el frontend en http://localhost:5173');
  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.log('❌ La prueba falló. Revisa los errores arriba.');
    process.exit(1);
  }
}

main();
