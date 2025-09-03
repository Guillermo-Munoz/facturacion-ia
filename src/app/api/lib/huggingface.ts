// Utilidades para procesamiento de IA con Hugging Face
// Este archivo puede expandirse para integrar modelos de IA más avanzados

interface AIProcessingResult {
  fecha?: string;
  importe?: string;
  empresa?: string;
  concepto?: string;
  confidence?: number;
}

/**
 * Procesa texto extraído de OCR usando IA para extraer datos estructurados
 * @param text - Texto crudo extraído por OCR
 * @returns Datos estructurados de la factura
 */
export async function processInvoiceWithAI(text: string): Promise<AIProcessingResult> {
  // Por ahora usamos regex avanzados, pero esto puede expandirse
  // para usar modelos de Hugging Face o OpenAI
  
  const result: AIProcessingResult = {};
  
  // Normalización básica de OCR para fechas (corrige confusiones comunes)
  const preclean = (s: string) =>
    s
      .replace(/\u00A0/g, ' ') // nbsp
      .replace(/[|]/g, '/') // algunos OCR leen | por /
      .replace(/O(?=\d)/g, '0') // O mayúscula antes de dígito -> 0
      .replace(/(?<=\d)O/g, '0') // 0 mal leído como O
      .replace(/I(?=\d)/g, '1') // I mayúscula antes de dígito -> 1
      .replace(/l(?=\d)/g, '1') // l minúscula
      .replace(/\s{2,}/g, ' ')
      .trim();
  
  const MONTHS_ES: Record<string, number> = {
    enero: 1,
    febrero: 2,
    marzo: 3,
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    septiembre: 9,
    setiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12
  };
  
  const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const toISO = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;
  const validYMD = (y: number, m: number, d: number) => {
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return false;
    const daysInMonth = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return d <= daysInMonth[m - 1];
  };
  
  const normalizeDate = (raw: string): string | null => {
    if (!raw) return null;
    const s = preclean(raw).toLowerCase();
    
    // 1) "12 de mayo de 2024"
    const rxTextual = /(?:(?:fecha|emisi[oó]n|expedici[oó]n|factura)[:\s]*)?(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{2,4})/i;
    const mText = s.match(rxTextual);
    if (mText) {
      const d = parseInt(mText[1], 10);
      const monthName = mText[2].normalize('NFD').replace(/\p{Diacritic}/gu, '');
      const y = parseInt(mText[3].length === 2 ? (parseInt(mText[3], 10) < 50 ? `20${mText[3]}` : `19${mText[3]}`) : mText[3], 10);
      const m = MONTHS_ES[monthName] || MONTHS_ES[monthName.replace(/s$/,'')];
      if (m && validYMD(y, m, d)) return toISO(y, m, d);
    }
    
    // 2) YYYY-MM-DD o YYYY/MM/DD o DD/MM/YYYY o DD-MM-YYYY (permitir . y espacios)
    const rxAll = /(\d{2,4})[\/.\s-](\d{1,2})[\/.\s-](\d{1,4})/;
    const mAll = s.match(rxAll);
    if (mAll) {
      let a = parseInt(mAll[1], 10);
      let b = parseInt(mAll[2], 10);
      let c = parseInt(mAll[3], 10);
      
      // Determinar formato (si 4 dígitos al inicio, asumimos YYYY-MM-DD)
      if (mAll[1].length === 4) {
        const y = a;
        const m = b;
        const d = c;
        if (validYMD(y, m, d)) return toISO(y, m, d);
      } else if (mAll[3].length === 4) {
        // DD/MM/YYYY o MM/DD/YYYY -> asumimos europeo (DD/MM/YYYY) por contexto español
        const d = a;
        const m = b;
        const y = c;
        if (validYMD(y, m, d)) return toISO(y, m, d);
        // fallback: si el primer campo parece mes válido y el segundo > 12, invertir
        if (a <= 12 && b <= 31 && validYMD(y, a, b)) return toISO(y, a, b);
      }
    }
    
    return null;
  };
  
  // Patrones mejorados para extraer información
  const patterns = {
    fecha: [
      // Etiquetas típicas en español y variantes
      /\bfecha(?:\s+de\s+(?:emisi[oó]n|expedici[oó]n|factura))?\b[\s:,-]*([\w\s\/.\-]+)?/i,
      /\bdate\b[\s:,-]*([\w\s\/.\-]+)?/i,
      // sin etiqueta: formatos comunes
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/i,
      /(\d{1,2}\s+de\s+[a-záéíóú]+\s+de\s+\d{2,4})/i
    ],
    importe: [
      /(?:total|importe|precio|amount)[\s:]*(\d+[,\.]\d{2})\s*[€$]/gi,
      /(\d+[,\.]\d{2})\s*€/g,
      /€\s*(\d+[,\.]\d{2})/g,
      /total[\s:]*(\d+[,\.]\d{2})/gi
    ],
    empresa: [
      /(?:empresa|company|razón social)[\s:]*([A-Z][A-Za-z\s&\.]+)/gi,
      /^([A-Z][A-Za-z\s&\.]+S\.?L\.?)/gm,
      /^([A-Z][A-Za-z\s&\.]+S\.?A\.?)/gm
    ]
  };
  
  // Extraer fecha con mayor precisión (priorizar líneas con etiqueta)
  const lines = preclean(text).split('\n').map(l => l.trim()).filter(Boolean);
  
  const labeledDateKeywords = /(\bfecha(?:\s+de\s+(?:emisi[oó]n|expedici[oó]n|factura))?|\bdate\b)/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!labeledDateKeywords.test(line)) continue;
    
    // Intentar en la misma línea
    const sameLineMatch = line.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|\d{1,2}\s+de\s+[a-záéíóú]+\s+de\s+\d{2,4})/i);
    const candidate = sameLineMatch?.[0] ?? lines[i + 1]; // o en la siguiente línea
    const iso = candidate ? normalizeDate(candidate) : null;
    if (iso) { result.fecha = iso; break; }
  }
  
  // Si no se encontró con etiqueta, buscar el primer candidato válido global
  if (!result.fecha) {
    const globalMatch = text.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|\d{1,2}\s+de\s+[a-záéíóú]+\s+de\s+\d{2,4}/gi) || [];
    for (const m of globalMatch) {
      const iso = normalizeDate(m);
      if (iso) { result.fecha = iso; break; }
    }
  }
  
  // Extraer importe con mayor precisión
  for (const pattern of patterns.importe) {
    const match = text.match(pattern);
    if (match) {
      result.importe = match[1] || match[0];
      break;
    }
  }
  
  // Extraer empresa
  for (const pattern of patterns.empresa) {
    const match = text.match(pattern);
    if (match) {
      result.empresa = (match[1] || match[0]).trim();
      break;
    }
  }
  
  // Extraer concepto (primera línea significativa)
  const conceptLines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 5);
    
  for (const line of conceptLines) {
    if (!patterns.fecha.some(p => p.test(line)) && 
        !patterns.importe.some(p => p.test(line)) &&
        line.length > 10 && 
        !/^[\d\s\-\/\.]+$/.test(line)) {
      result.concepto = line;
      break;
    }
  }
  
  // Calcular confianza basada en datos encontrados
  const foundFields = Object.values(result).filter(v => v).length;
  result.confidence = foundFields / 4; // 4 campos principales
  
  return result;
}

/**
 * Función futura para integrar con Hugging Face API
 * @param text - Texto a procesar
 * @returns Resultado procesado por IA
 */
export async function processWithHuggingFace(text: string): Promise<AIProcessingResult> {
  // TODO: Implementar integración con Hugging Face
  // const response = await fetch('https://api-inference.huggingface.co/models/...', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({ inputs: text }),
  // });
  
  // Por ahora, usar el procesamiento local
  return processInvoiceWithAI(text);
}

/**
 * Valida y limpia los datos extraídos
 * @param data - Datos extraídos
 * @returns Datos validados y limpios
 */
export function validateAndCleanData(data: AIProcessingResult): AIProcessingResult {
  const cleaned = { ...data };
  
  // Normalizar fecha a ISO (YYYY-MM-DD) si es posible
  if (cleaned.fecha) {
    // Si ya tiene formato ISO, mantener
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned.fecha)) {
      // reutilizar normalizador local definido arriba dentro del scope de compilación
      const tryIso = (raw: string) => {
        // copia reducida por no tener acceso directo a normalizeDate aquí en tiempo de compilación
        const tmp = raw.trim();
        // Intenta patrones clave rápidamente
        const m1 = tmp.match(/(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/);
        if (m1) {
          const y = parseInt(m1[1], 10), m = parseInt(m1[2], 10), d = parseInt(m1[3], 10);
          if (y >= 1900 && y <= 2100 && m >=1 && m<=12 && d>=1 && d<=31) {
            const pad = (n:number)=> (n<10?`0${n}`:`${n}`);
            return `${y}-${pad(m)}-${pad(d)}`;
          }
        }
        return raw;
      };
      cleaned.fecha = tryIso(cleaned.fecha);
    }
  }
  
  // Limpiar importe
  if (cleaned.importe) {
    cleaned.importe = cleaned.importe.replace(/[^\d,\.]/g, '');
  }
  
  // Limpiar empresa
  if (cleaned.empresa) {
    cleaned.empresa = cleaned.empresa
      .replace(/[^\w\s&\.]/g, '')
      .trim()
      .substring(0, 100); // Limitar longitud
  }
  
  // Limpiar concepto
  if (cleaned.concepto) {
    cleaned.concepto = cleaned.concepto
      .trim()
      .substring(0, 200); // Limitar longitud
  }
  
  return cleaned;
}