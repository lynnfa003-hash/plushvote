/** @type {import("tailwindcss").Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        blush: "#FFB7C5",
        lavender: "#C8B5E8",
        mint: "#B5E8D0",
        cream: "#FFF9F0"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0, 0, 0, 0.08)"
      }
    }
  },
  plugins: []
};
