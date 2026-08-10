import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "./context/StoreContext";
import QuickView from "./components/QuickView/QuickView";
import SearchPanel from "./components/SearchPanel/SearchPanel";
import CartDrawer from "./components/CartDrawer/CartDrawer";
import WishlistDrawer from "./components/WishlistDrawer/WishlistDrawer";
import AuthModalWrapper from "./components/AuthModal/AuthModalWrapper";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "Sophia Dresses | Luxury Wedding Dresses by Menna Hassan",
  description:
    "Discover breathtaking wedding dresses at Sophia Dresses. Handcrafted bridal couture featuring elegant ball gowns, mermaid dresses, and minimalist designs. Book your private consultation today.",
  keywords:
    "wedding dresses, bridal gowns, luxury bridal, Sophia Dresses, Menna Hassan, ball gown, mermaid dress, A-line wedding dress",
  icons: {
    icon: "/images/headlogo.png",
    shortcut: "/images/headlogo.png",
    apple: "/images/headlogo.png",
  },
  openGraph: {
    title: "Sophia Dresses | Luxury Wedding Dresses",
    description: "Where Elegance Meets Eternity — Discover breathtaking bridal couture.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${montserrat.variable}`}>
        <StoreProvider>
          {children}
          <QuickView />
          <SearchPanel />
          <CartDrawer />
          <WishlistDrawer />
          <AuthModalWrapper />
          <ScrollToTop />
        </StoreProvider>
      </body>
    </html>
  );
}
