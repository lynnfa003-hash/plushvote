/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#F4F7FF",
          primary: "#6B66FF",
          primaryHover: "#5B56E6",
          textDark: "#1E293B",
          textMuted: "#64748B",
          shapeBlue: "#E2EFFF",
          shapePurple: "#ECE8FF",
          shapeGreen: "#E2FBE9",
          shapeYellow: "#FFF4E2"
        }
      },
      boxShadow: {
        soft: "0 20px 40px -15px rgba(107, 102, 255, 0.18)",
        card: "0 10px 30px -10px rgba(0, 0, 0, 0.08)"
      },
      fontFamily: {
        sans: ["Nunito", "sans-serif"]
      }
    }
  },
  plugins: []
};
