'use client';
import { useState } from 'react';

export default function OCRPage() {
  const [image, setImage] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Validar archivo al cambiar
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten archivos de imagen');
        setImage(null);
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB límite
        setError('El archivo es muy grande. Máximo 5MB');
        setImage(null);
        return;
      }
      setError('');
      setImage(file);
    } else {
      setImage(null);
    }
  };

  // Redimensionar imagen con canvas para mejorar OCR y reducir tamaño
  const resizeImage = (file: File, maxWidth = 1024): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
          }, 'image/jpeg', 0.8);
        }
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) {
      setError('Por favor sube una imagen');
      return;
    }

    setLoading(true);
    setError('');
    setOcrResult('');

    try {
      const resizedBlob = await resizeImage(image);
      const formData = new FormData();
      formData.append('image', resizedBlob, image.name);

      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Error en el servidor');

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
  <div className="max-w-10/12 mx-auto p-6 bg-white rounded-lg shadow-md flex gap-8 min-h-[500px]">
    {/* Columna izquierda: formulario */}
    <div className="w-1/2 flex flex-col justify-between">
      <div>
        <h1 className="text-2xl font-bold mb-6 text-center">Sube tu imagen (factura/recibo)</h1>

        <div className="flex justify-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mx-auto block text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        {image && (
          <div className="mt-4 text-center">
            <img
              src={URL.createObjectURL(image)}
              alt="Previsualización"
              className="inline-block max-w-full h-auto rounded-md"
            />
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-center">
            {error}
          </div>
        )}
      </div>

      <button
        type="submit"
        onClick={handleSubmit}
        disabled={loading}
        className={`w-full mt-10 py-2 px-4 rounded-md text-white font-medium
          ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}
          focus:outline-none focus:ring-2 focus:ring-blue-500`}
      >
        {loading ? 'Procesando...' : 'Extraer Texto'}
      </button>
    </div>

    {/* Columna derecha: resultado */}
    <div className="w-1/2 bg-gray-50 rounded-md border border-gray-200 p-4 overflow-auto max-h-full">
      <h2 className="font-bold text-lg mb-2 text-center">Resultado</h2>
      {ocrResult ? (
        <pre className="whitespace-pre-wrap font-sans text-gray-800">
          {ocrResult}
        </pre>
      ) : (
        <p className="text-center text-gray-400">
          Aquí aparecerán los datos de la factura y el resultado de la IA en formato JSON
        </p>
      )}
    </div>
  </div>
);


}
