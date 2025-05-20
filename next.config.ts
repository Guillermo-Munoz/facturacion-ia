import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Habilitar características experimentales
    config.experiments = { 
      ...config.experiments,
      topLevelAwait: true,
      asyncWebAssembly: true
    };

    // Configuraciones específicas para el servidor
    if (isServer) {
      config.resolve = {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          sharp$: false,
          'onnxruntime-node$': false,
        },
      };

      config.module = {
        ...config.module,
        rules: [
          ...config.module?.rules || [],
          {
            test: /\.worker\.js$/,
            loader: 'worker-loader',
            options: {
              filename: 'static/[hash].worker.js',
              publicPath: '/_next/',
            },
          },
        ],
      };
    }

    return config;
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          },
          {
            key: 'Content-Type',
            value: 'application/wasm'
          }
        ],
      },
    ];
  },

  serverExternalPackages: ['tesseract.js'],
  
  // Opcional: Configuración para standalone (recomendado para producción)
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
};

export default nextConfig;