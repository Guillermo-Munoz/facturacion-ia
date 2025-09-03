import { NextRequest, NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';
import { processInvoiceWithAI, validateAndCleanData } from '../lib/huggingface';

// Tipos para la respuesta de la API
interface OCRResponse {
  raw: string;
  extraido: {
    fecha?: string;
    importe?: string;
    empresa?: string;
    concepto?: string;
  };
  error?: string;
}

// Función para extraer datos usando IA/regex
function extractInvoiceData(text: string) {
  const data: OCRResponse['extraido'] = {};
  
  // Patrones regex para extraer información
  const datePatterns = [
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,
    /(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/gi,
    /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g
  ];
  
  const amountPatterns = [
    /(?:total|importe|precio|€|EUR)[\s:]*(\d+[,\.]\d{2})/gi,
    /(\d+[,\.]\d{2})\s*€/g,
    /(\d+[,\.]\d{2})\s*EUR/gi
  ];
  
  const companyPatterns = [
    /(?:empresa|compañía|razón social)[\s:]*([A-Z][A-Za-z\s]+)/gi,
    /^([A-Z][A-Za-z\s]+S\.?L\.?)/gm
  ];
  
  // Extraer fecha
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      data.fecha = match[0];
      break;
    }
  }
  
  // Extraer importe
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.importe = match[1] || match[0];
      break;
    }
  }
  
  // Extraer empresa
  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.empresa = match[1] || match[0];
      break;
    }
  }
  
  // Extraer concepto (primera línea que no sea fecha ni importe)
  const lines = text.split('\n').filter(line => line.trim().length > 3);
  for (const line of lines) {
    if (!datePatterns.some(p => p.test(line)) && 
        !amountPatterns.some(p => p.test(line)) &&
        line.length > 10) {
      data.concepto = line.trim();
      break;
    }
  }
  
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    
    if (!image) {
      return NextResponse.json(
        { error: 'No se encontró imagen en la solicitud' },
        { status: 400 }
      );
    }
    
    // Validar tipo de archivo
    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'El archivo debe ser una imagen' },
        { status: 400 }
      );
    }
    
    // Validar tamaño (5MB máximo)
    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'La imagen es muy grande. Máximo 5MB' },
        { status: 400 }
      );
    }
    
    // Convertir imagen a buffer
    const imageBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);
    
    // Crear worker de Tesseract
    const worker = await createWorker('spa', 1, {
      logger: m => console.log(m)
    });
    
    try {
      // Procesar imagen con OCR
      const { data: { text } } = await worker.recognize(buffer);
      // Procesar el texto con IA para extraer datos estructurados
      const aiResult = await processInvoiceWithAI(text);
      const cleanedData = validateAndCleanData(aiResult);
      
      return NextResponse.json({
        raw: text,
        extraido: {
          fecha: cleanedData.fecha,
          importe: cleanedData.importe,
          empresa: cleanedData.empresa,
          concepto: cleanedData.concepto
        }
      } as OCRResponse);
      
    } finally {
      await worker.terminate();
    }
    
  } catch (error) {
    console.error('Error en OCR:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
