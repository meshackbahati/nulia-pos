/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#3b82f6', // Example blue
                    foreground: '#ffffff',
                },
                secondary: {
                    DEFAULT: '#64748b',
                    foreground: '#ffffff',
                },
                background: '#ffffff',
                foreground: '#0f172a',
                muted: {
                    DEFAULT: '#f1f5f9',
                    foreground: '#64748b',
                },
                card: {
                    DEFAULT: '#ffffff',
                    foreground: '#0f172a',
                },
                border: '#e2e8f0',
                input: '#e2e8f0',
            },
        },
    },
    plugins: [],
}
