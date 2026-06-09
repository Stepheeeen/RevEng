import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Project Trinity — B2B Acquisition Intelligence Engine | Flair Technologies',
  description: 'A three-trigger autonomous B2B acquisition ecosystem. Hiring signal detection, legacy tech fingerprinting, and automated inbound audit engine — all powering Flair Technologies cold outreach.',
  keywords: 'B2B acquisition, outbound sales automation, hiring signals, legacy tech detection, lighthouse audit, CRM automation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Poppins', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
