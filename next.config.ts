 import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    config.experiments = { ...config.experiments, topLevelAwait: true };

    if (isServer) {
      config.resolve = {
        ...config.resolve,
        alias: {
          ...config.resolve.alias,
          sharp$: false,
          'onnxruntime-node$': false,
        },
      };

      config.module = {
        ...config.module,
        rules: [
          ...config.module.rules,
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
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },

  // ✅ Aquí va la clave actualizada
  serverExternalPackages: ['tesseract.js'],
 eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
