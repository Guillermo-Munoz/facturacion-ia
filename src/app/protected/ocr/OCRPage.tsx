 'use client';
import { useState } from 'react';

export default function OCRPage() {
  const [image, setImage] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) {
      setError('Por favor sube una imagen');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('image', image);

      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Error en el servidor');

      // const { text } = await res.json();
      // setOcrResult(text || 'No se detectó texto');
      const { raw, extraido } = await res.json();
      setOcrResult(`Texto crudo:\n${raw}\n\nResultado IA:\n${extraido}`);

    } catch (err) {
      setError('Error al procesar. ¿La imagen es clara y está bien enfocada?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">OCR para Documentos</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sube tu imagen (factura/recibo)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 rounded-md text-white font-medium
            ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}
            focus:outline-none focus:ring-2 focus:ring-blue-500`}
        >
          {loading ? 'Procesando...' : 'Extraer Texto'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {ocrResult && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-200">
          <h2 className="font-bold text-lg mb-2">Resultado:</h2>
          <pre className="whitespace-pre-wrap font-sans text-gray-800">
            {ocrResult}
          </pre>
        </div>
      )}
    </div>
  );
}