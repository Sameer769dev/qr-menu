import './globals.css';

export const metadata = {
  title: 'QR Menu — Digital Menu & Direct Ordering for Restaurants',
  description:
    'Build a digital menu, print QR codes for your tables, and receive orders live in your kitchen. No app downloads, no hardware. Built for restaurants in Nepal.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
