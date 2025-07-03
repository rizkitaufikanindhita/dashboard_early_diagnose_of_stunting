import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import pkg from 'aes-js';
const { ModeOfOperation, utils } = pkg;

const AES_KEY = process.env.AES_KEY!;
const AES_IV = process.env.AES_IV!;

export const GET: RequestHandler = async (event) => {
	try {
		// Authenticate user
		// await authMiddleware(event);

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
				// Convert hex strings to Uint8Arrays
				const keyBytes = new Uint8Array(
					AES_KEY.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
				);
				const ivBytes = new Uint8Array(
					AES_IV.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
				);
				const payloadBytes = new Uint8Array(
					status.encrypted_payload.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
				);

				// Create AES cipher
				const aesCbc = new ModeOfOperation.cbc(keyBytes, ivBytes);

				// Decrypt
				const decryptedBytes = aesCbc.decrypt(payloadBytes);

				// Remove PKCS7 padding
				const paddingLength = decryptedBytes[decryptedBytes.length - 1];
				const actualLength = decryptedBytes.length - paddingLength;
				const actualData = decryptedBytes.slice(0, actualLength);

				// Convert to string
				decryptedText = utils.utf8.fromBytes(actualData);
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

		// Filter: only keep the latest entry for each (year, month, age, uid)
		const uniqueMap = new Map();
		for (const item of results) {
			const date = new Date(item.createdAt);
			const year = date.getFullYear();
			const month = date.getMonth() + 1; // 1-based
			const key = `${item.uid}-${year}-${month}-${item.age}`;
			if (
				!uniqueMap.has(key) ||
				new Date(item.createdAt) > new Date(uniqueMap.get(key).createdAt)
			) {
				uniqueMap.set(key, item);
			}
		}
		const filteredResults = Array.from(uniqueMap.values());

		return json(filteredResults);
	} catch (err) {
		console.error('Error fetching toddler status:', err);
		return json({ error: 'Failed to fetch toddler status' }, { status: 500 });
	}
};
