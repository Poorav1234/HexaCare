/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                neonCyan: '#0ea5e9', // Sky blue replaces cyan
                neonPurple: '#14b8a6', // Teal replaces purple
                neonGreen: '#10b981', // Emerald green
                darkLayer: 'rgba(15, 23, 42, 0.7)',
                glassBorder: 'rgba(255, 255, 255, 0.1)'
            },
        },
    },
    plugins: [],
}
