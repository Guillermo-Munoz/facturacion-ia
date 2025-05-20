import fetch from 'node-fetch';

const GEMINI_API_KEY = process.env.HUGGINGFACE_API_KEY;;

if (!GEMINI_API_KEY) {
  console.error("❌ No se encontró el API key de Gemini en las variables de entorno");
}

export async function preguntarGemini(texto: string, instruccion: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `${instruccion}\n\nTexto:\n${texto}`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();

  if (!res.ok) {
    console.error('❌ Error al llamar a Gemini:', raw);
    return "Error al consultar la IA.";
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('❌ Error al parsear JSON:', raw);
    return "Respuesta no válida de la IA.";
  }

  console.log('✅ Respuesta Gemini:', JSON.stringify(data, null, 2));

  const respuesta = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return respuesta || "No se obtuvo respuesta válida de la IA.";
}
