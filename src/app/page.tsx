 // app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-center items-center text-center px-4">
      <h1 className="text-3xl font-bold mb-4">OCR para facturas con IA</h1>
      <p className="mb-6 text-lg text-gray-700">¿Estás listo para comenzar?</p>
      <Link
        href="/protected"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Empezar
      </Link>
    </main>
  );
}
