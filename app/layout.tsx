import type { Metadata } from 'next';
import React from 'react';
import { Roboto } from 'next/font/google';

const roboto = Roboto({ subsets: ['latin'], weight: ['100','300','400','500','700'], display: 'swap' });

export const metadata: Metadata = {
	title: 'AmpLM',
	description: 'FAISS + NVIDIA NIM RAG chatbot'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body
				className={roboto.className}
				style={{
					margin: 0,
					backgroundColor: '#000',
					color: '#eaeaea'
				}}
			>
				{children}
			</body>
		</html>
	);
} 