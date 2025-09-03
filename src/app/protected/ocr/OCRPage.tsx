'use client';
import { useState, useCallback } from 'react';

interface OCRResult {
  raw: string;
  extraido: {
    fecha?: string;
    importe?: string;
    empresa?: string;
    concepto?: string;
  };
}

export default function OCRPage() {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        setError('Por favor selecciona un archivo de imagen válido');
        return;
      }
      
      // Validar tamaño (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen es muy grande. Máximo 5MB');
        return;
      }
      
      setError('');
      setSuccess('');
      setImage(file);
      
      // Crear preview de la imagen
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImage(null);
    }
  }, []);

  // Redimensionar imagen con canvas para mejorar OCR y reducir tamaño
  const resizeImage = useCallback((file: File, maxWidth: number = 1200, maxHeight: number = 900): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo crear el contexto del canvas'));
        return;
      }
      
      const img = new Image();
      
      img.onload = () => {
        let { width, height } = img;
        
        // Calcular nuevas dimensiones manteniendo proporción
        const aspectRatio = width / height;
        
        if (width > maxWidth || height > maxHeight) {
          if (aspectRatio > 1) {
            width = maxWidth;
            height = maxWidth / aspectRatio;
          } else {
            height = maxHeight;
            width = maxHeight * aspectRatio;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Mejorar calidad de renderizado
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Error al procesar la imagen'));
          }
        }, 'image/jpeg', 0.9);
      };
      
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) {
      setError('Por favor sube una imagen');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    setOcrResult(null);
    
    try {
      const resizedBlob = await resizeImage(image);
      const formData = new FormData();
      formData.append('image', resizedBlob, image.name);
      
      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del servidor: ${res.status}`);
      }
      
      const result: OCRResult = await res.json();
      setOcrResult(result);
      setSuccess('¡Procesamiento completado exitosamente!');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error al procesar: ${errorMessage}. Verifica que la imagen sea clara y esté bien enfocada.`);
      console.error('Error en OCR:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setImage(null);
    setImagePreview(null);
    setOcrResult(null);
    setError('');
    setSuccess('');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Procesador OCR de Facturas</h1>
        <p className="text-lg text-gray-600">Extrae datos automáticamente de tus facturas y recibos</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Panel de carga */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Subir Factura</h3>
            <p className="text-sm text-gray-600 mt-1">Selecciona una imagen clara de tu factura o recibo</p>
          </div>
          <div className="px-6 py-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar imagen
                </label>
                <input
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                />
              </div>
              
              {imagePreview && (
                <div className="mt-4">
                  <img 
                    src={imagePreview} 
                    alt="Vista previa" 
                    className="max-w-full h-48 object-contain mx-auto rounded-lg border border-gray-200"
                  />
                </div>
              )}
              
              {error && (
                <div className="rounded-md border p-4 bg-red-50 border-red-200 text-red-800">
                  <div className="flex">
                    <div className="flex-shrink-0 text-red-400">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm">{error}</p>
                    </div>
                    <div className="ml-auto pl-3">
                      <button
                        onClick={() => setError('')}
                        className="inline-flex rounded-md p-1.5 text-red-400 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <span className="sr-only">Cerrar</span>
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {success && (
                <div className="rounded-md border p-4 bg-green-50 border-green-200 text-green-800">
                  <div className="flex">
                    <div className="flex-shrink-0 text-green-400">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm">{success}</p>
                    </div>
                    <div className="ml-auto pl-3">
                      <button
                        onClick={() => setSuccess('')}
                        className="inline-flex rounded-md p-1.5 text-green-400 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <span className="sr-only">Cerrar</span>
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!image || loading}
                  className="flex-1 inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 px-4 py-2 text-base"
                >
                  {loading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {loading ? 'Procesando...' : 'Procesar Imagen'}
                </button>
                
                {(image || ocrResult) && (
                  <button
                    type="button"
                    onClick={clearResults}
                    disabled={loading}
                    className="inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500 px-4 py-2 text-base"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
        
        {/* Panel de resultados */}
        {ocrResult && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Datos Extraídos</h3>
              <p className="text-sm text-gray-600 mt-1">Información procesada automáticamente</p>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                {/* Datos estructurados */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {ocrResult.extraido.fecha || 'No detectada'}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Importe</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {ocrResult.extraido.importe || 'No detectado'}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Empresa</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {ocrResult.extraido.empresa || 'No detectada'}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Concepto</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {ocrResult.extraido.concepto || 'No detectado'}
                    </p>
                  </div>
                </div>
                
                {/* Texto completo */}
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    Ver texto completo extraído
                  </summary>
                  <div className="mt-3 bg-gray-50 p-4 rounded-lg">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-48">
                      {ocrResult.raw}
                    </pre>
                  </div>
                </details>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
