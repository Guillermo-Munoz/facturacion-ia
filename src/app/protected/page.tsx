 'use client';

import OCRPage from './ocr/OCRPage';

export default function ProtectedPage() {
  return (
    <div className="max-w-10/12 w-full mx-auto mt-10 p-8 min-h-[500px] px-4">
      <h1 className="text-2xl font-bold mb-8 text-center">Procesador de facturas</h1>
      <OCRPage />
    </div>
  );
}
