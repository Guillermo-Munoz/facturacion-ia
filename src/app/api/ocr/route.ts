import { NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';
import { preguntarGemini } from '../lib/huggingface';
import sharp from 'sharp';

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('image') as File;

  if (!file) {
    return NextResponse.json({ error: 'No se ha proporcionado ninguna imagen' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    // 🔧 Preprocesamiento con sharp
    const processedBuffer = await sharp(buffer)
      .resize({ width: 1200 })     // Estándar uniforme
      .grayscale()                 // Escala de grises mejora OCR
      .normalize()                 // Aumenta contraste
      .sharpen()                   // Mejora bordes
      // .threshold(150)           // (opcional) blanco y negro
      .toBuffer();

    // 🧠 OCR
    const { data } = await Tesseract.recognize(processedBuffer, 'spa');
    const texto = data.text;

    // ✨ IA para extraer información
    const respuestaIA = await preguntarGemini(texto);

    return NextResponse.json({ raw: texto, extraido: respuestaIA });

  } catch (error) {
    console.error('Error OCR o IA:', error);
    return NextResponse.json({ error: 'Error al procesar la imagen' }, { status: 500 });
  }
}
