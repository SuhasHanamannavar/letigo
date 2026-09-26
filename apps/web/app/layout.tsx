import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Litigo — Your rules. Every chatbot.',
  description:
    'Define your AI rules once. Litigo keeps them enforced across ChatGPT, Claude, Gemini, and other chatbots. Runs locally, respects your privacy.',
  keywords: [
    'Litigo',
    'AI rules',
    'AI compliance',
    'rule enforcement',
    'ChatGPT rules',
    'Claude rules',
    'AI governance',
    'local processing',
    'privacy first',
  ],
  authors: [{ name: 'Litigo' }],
  openGraph: {
    type: 'website',
    title: 'Litigo — Your rules. Every chatbot.',
    description:
      'Define your AI rules once. Litigo keeps them enforced across the chatbots you use.',
    siteName: 'Litigo',
    images: [
      {
        url: 'https://p16-flow-image-sign.ibyteimg.com/tos-mya-i-3rsxbfecgb/rc_gen_image/c9c5eed2d68b4496ab0d549c4edd7dee.jpeg~tplv-0es2k971ck-image.image?rcl=202609261839003AE82734A6FE5C8E65B2&rk3s=8e244e95&rrcfp=02a80fc2&x-expires=1793011199&x-signature=L4TU83S5sUGJhT0RzlaUkYZWQZg%3D',
        width: 1200,
        height: 630,
        alt: 'Litigo — AI Rule Enforcement',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Litigo — Your rules. Every chatbot.',
    description:
      'Define your AI rules once. Litigo keeps them enforced across the chatbots you use.',
    images: [
      'https://p16-flow-image-sign.ibyteimg.com/tos-mya-i-3rsxbfecgb/rc_gen_image/c9c5eed2d68b4496ab0d549c4edd7dee.jpeg~tplv-0es2k971ck-image.image?rcl=202609261839003AE82734A6FE5C8E65B2&rk3s=8e244e95&rrcfp=02a80fc2&x-expires=1793011199&x-signature=L4TU83S5sUGJhT0RzlaUkYZWQZg%3D',
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://litigo-ai.vercel.app/',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/logo-64px.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
