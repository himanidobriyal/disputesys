/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF8F3",
        ink: "#1C2333",
        inkSoft: "#3A4256",
        slate: "#64748B",
        line: "#E4E0D6",
        gold: "#C08A28",
        goldSoft: "#F1E4C4",
        member: "#2F6F5E",
        memberSoft: "#E4EFEA",
        merchant: "#A6432F",
        merchantSoft: "#F4E6E1",
        danger: "#B23A48",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
