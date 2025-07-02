import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';
import Hex from 'crypto-js/enc-hex';

const AES_KEY = process.env.AES_KEY!;
const AES_IV = process.env.AES_IV!;

export const GET: RequestHandler = async (event) => {
	try {
		const uid = event.params.uid;

		if (!uid) {
			return json({ error: 'UID is required' }, { status: 400 });
		}

		// Fetch all status records
		const statuses = await prisma.status.findMany({
			orderBy: { createdAt: 'desc' }
		});

		const results = [];
		for (const status of statuses) {
			let decryptedText: string;
			try {
				const decryptedBytes = AES.decrypt(status.encrypted_payload, Hex.parse(AES_KEY), {
					iv: Hex.parse(AES_IV)
				});
				decryptedText = decryptedBytes.toString(Utf8).replace(/\0+$/, '');
			} catch (e) {
				console.error('Decryption failed for status id', status.id);
				continue;
			}
			let parsed;
			try {
				parsed = JSON.parse(decryptedText);
			} catch (e) {
				console.error('JSON parse failed for status id', status.id);
				continue;
			}
			if (parsed.uid === uid) {
				results.push({
					...parsed,
					createdAt: status.createdAt,
					recommendation: status.recommendation
				});
			}
		}

		return json(results);
	} catch (err) {
		console.error('Error fetching toddler status:', err);
		return json({ error: 'Failed to fetch toddler status' }, { status: 500 });
	}
};
