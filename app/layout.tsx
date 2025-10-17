import "./globals.css";
import Navbar from "../components/Navbar";

export const metadata = { title: "Vanderbilt Competitor Analysis (Pilot)" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
