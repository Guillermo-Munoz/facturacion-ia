 'use client';

import OCRPage from './ocr/OCRPage';

export default function ProtectedPage() {
  return (
    <div className="max-w-xl mx-auto mt-10 p-4 border rounded shadow">
      <h1 className="text-2xl font-bold mb-4 text-center">Procesador de facturas</h1>
      <OCRPage />
    </div>
  );
}
