# App de Facturación Inteligente con OCR

Este proyecto es una aplicación que permite extraer datos de facturas desde imágenes utilizando OCR (Reconocimiento Óptico de Caracteres) y técnicas de Inteligencia Artificial para convertirlas en texto estructurado.

## Funcionalidades

- Carga de facturas en formato imagen (JPG, PNG, PDF).
- Extracción automática de:
  - Número de factura
  - Fecha
  - Total
  - NIF/CIF
  - Empresa emisora
- Motor OCR basado en Tesseract.
- Procesamiento y limpieza de texto con Python.
- API REST para integraciones externas.
- Interfaz web básica (opcional).

## Tecnologías utilizadas

- Python + FastAPI para el backend.
- Tesseract OCR para reconocimiento de texto.
- OpenCV para preprocesamiento de imágenes.
- Regex / NLP para estructurar datos.
- Docker para facilitar el despliegue (opcional).
- MongoDB / PostgreSQL para almacenar facturas procesadas (opcional).

## Instalación y ejecución

Clona el repositorio:

git clone https://github.com/tu-usuario/nombre-del-repo.git
cd nombre-del-repo

Instala dependencias:

pip install -r requirements.txt

Inicia el servidor:

uvicorn main:app --reload

Accede a la API desde http://localhost:8000/docs

## Uso de la API

Sube una imagen de factura usando la ruta /upload. Puedes hacerlo desde Swagger UI o con curl:

curl -X POST "http://localhost:8000/upload" \
 -F "file=@factura.jpg"

Respuesta esperada:

{
"fecha": "2024-03-15",
"total": "234.50",
"nif": "B12345678",
"empresa": "Facturadora S.A.",
"numero_factura": "F-2024-0005"
}

## Recursos útiles

- Tesseract OCR: https://github.com/tesseract-ocr/tesseract
- FastAPI: https://fastapi.tiangolo.com/
- OpenCV: https://opencv.org/
- Regex101: https://regex101.com/

## Despliegue

Puedes desplegar esta aplicación en plataformas como:

- Render: https://render.com/
- Railway: https://railway.app/
- Heroku: https://heroku.com/
- Servidores propios con Docker + Uvicorn

## Licencia

Este proyecto está bajo la licencia MIT. Puedes usarlo, modificarlo y distribuirlo libremente.
