/** @type {import('tailwindcss').Config} */
module.exports = {
 content: [
 "./src/**/*.{js,jsx,ts,tsx,html}",
 ],
 theme: {
 extend: {
 colors: {
 discord: {
 dark: '#36393f',
 darker: '#2f3136',
 darkest: '#202225',
 blurple: '#5865F2',
 success: '#57F287',
 warning: '#FEE75C',
 danger: '#ED4245',
 }
 },
 animation: {
 'glow': 'glow 2s ease-in-out infinite alternate',
 },
 keyframes: {
 glow: {
 '0%': { boxShadow: '0 0 5px rgba(88, 101, 242, 0.2), 0 0 10px rgba(88, 101, 242, 0.2)' },
 '100%': { boxShadow: '0 0 10px rgba(88, 101, 242, 0.6), 0 0 20px rgba(88, 101, 242, 0.4)' },
 }
 }
 },
 },
 plugins: [],
}
