 import { NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';
import { preguntarGemini } from '../lib/huggingface';

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('image') as File;

  if (!file) {
    return NextResponse.json({ error: 'No se ha proporcionado ninguna imagen' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const { data } = await Tesseract.recognize(buffer, 'spa');
    const texto = data.text;

    // Instrucción: puedes ajustarla según lo que necesites
    // const instruccion = "Extrae la fecha y el total de la factura";

    // const respuestaIA = await preguntarGemini(texto, instruccion);
    const instruccion = "Extrae la fecha y el total de la factura";
    const respuestaIA = await preguntarGemini(texto, instruccion);

    return NextResponse.json({ raw: texto, extraido: respuestaIA });
  } catch (error) {
    console.error('Error OCR o IA:', error);
    return NextResponse.json({ error: 'Error al procesar la imagen' }, { status: 500 });
  }

}
