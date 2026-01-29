/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                'jua': ['Jua', 'sans-serif'],
            },
            colors: {
                'warm-yellow': '#FFF9E6',
                'soft-green': '#E8F5E9',
                'mint': '#C8E6C9',
            }
        },
    },
    plugins: [],
}
