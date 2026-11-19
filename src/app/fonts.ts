import localFont from "next/font/local";

// Fontes alojadas localmente (licença SIL OFL — ver src/fonts/).
export const anton = localFont({
  src: "../fonts/anton.woff2",
  variable: "--font-anton",
  weight: "400",
  display: "swap",
});

export const inter = localFont({
  src: "../fonts/inter-var.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});
