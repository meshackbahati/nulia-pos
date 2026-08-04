/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    experimental: {
        serverComponentsExternalPackages: ['sequelize', 'pdfkit'],
    },
    outputFileTracingIncludes: {
        '/api/[...path]': ['./node_modules/pg/**/*', './node_modules/pg-hstore/**/*'],
        '/[[...path]]': ['./node_modules/pg/**/*', './node_modules/pg-hstore/**/*'],
    },
};

export default nextConfig;
