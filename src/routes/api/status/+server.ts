import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { authMiddleware } from '$lib/server/auth';
import AES from 'crypto-js/aes';
import HmacSHA256 from 'crypto-js/hmac-sha256';
import Utf8 from 'crypto-js/enc-utf8';
import Hex from 'crypto-js/enc-hex';

const AES_KEY = process.env.AES_KEY!;
const AES_IV = process.env.AES_IV!;
const HMAC_KEY = process.env.HMAC_KEY!;

export const GET: RequestHandler = async (event) => {
	try {
		// Authenticate user
		await authMiddleware(event);

		// Fetch all status records
		const statuses = await prisma.status.findMany();
		const results = [];

		for (const status of statuses) {
			// Dekripsi payload
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

			// Cari toddler berdasarkan uid
			let toddler = null;
			if (parsed.uid) {
				toddler = await prisma.toddler.findUnique({ where: { uid: parsed.uid } });
			}

			results.push({
				...parsed,
				toddler,
				createdAt: status.createdAt,
				recommendation: status.recommendation
			});
		}

		return json(results);
	} catch (err) {
		console.error('Error fetching/decrypting statuses:', err);
		return json({ error: 'Failed to fetch/decrypt statuses' }, { status: 500 });
	}
};

// export const POST: RequestHandler = async (event) => {
// 	try {
// 		const data = await event.request.json();
// 		const { uid, status, height, age } = data;

// 		const toddler = await prisma.toddler.findUnique({ where: { uid } });

// 		if (!toddler) {
// 			return json({ error: `Toddler with UID ${uid} not found` }, { status: 404 });
// 		}

// 		const existingStatus = await prisma.status.findFirst({
// 			where: {
// 				toddler: { uid },
// 				age
// 			},
// 			include: { toddler: true }
// 		});

// 		let newStatus;
// 		if (existingStatus) {
// 			newStatus = await prisma.status.update({
// 				where: { id: existingStatus.id },
// 				data: { status, height, age },
// 				include: { toddler: true }
// 			});
// 		} else {
// 			newStatus = await prisma.status.create({
// 				data: {
// 					toddler: { connect: { uid } },
// 					status,
// 					height,
// 					age
// 				},
// 				include: { toddler: true }
// 			});
// 		}

// 		// Balas ke ESP32 dulu
// 		const responseToEsp32 = json({ message: 'Status created successfully' }, { status: 201 });

// 		// Jalankan fetch() ke Flask di background
// 		setTimeout(async () => {
// 			try {
// 				const aiAgentUrl = process.env.AI_AGENT_URL;

// 				const response = await fetch(aiAgentUrl + '/api/agent-gemini', {
// 					method: 'POST',
// 					headers: { 'Content-Type': 'application/json' },
// 					body: JSON.stringify({
// 						id: newStatus.id,
// 						age: newStatus.age,
// 						height: newStatus.height,
// 						gender: newStatus.toddler.gender,
// 						status: newStatus.status
// 					})
// 				});

// 				if (response.ok) {
// 					const externalApiResponse = await response.json();
// 					console.log('External API response:', externalApiResponse);

// 					if (externalApiResponse.rekomendasi) {
// 						await prisma.status.update({
// 							where: { id: newStatus.id },
// 							data: { recommendation: externalApiResponse.rekomendasi }
// 						});
// 						console.log('Status updated with recommendation');
// 					}
// 				} else {
// 					console.error('External API error:', response.status, response.statusText);
// 				}
// 			} catch (error) {
// 				console.error('Error calling external API:', error);
// 			}
// 		}, 0); // Async background

// 		return responseToEsp32;
// 	} catch (err) {
// 		console.error('Error creating status:', err);
// 		return json({ error: 'Failed to create status' }, { status: 500 });
// 	}
// };

export const POST: RequestHandler = async (event) => {
	try {
		const { payload, hmac } = await event.request.json();

		// 1. Verifikasi HMAC
		const calculatedHmac = HmacSHA256(payload, Hex.parse(HMAC_KEY)).toString(Hex);
		if (calculatedHmac !== hmac) {
			return json({ error: 'Invalid HMAC - Data integrity compromised' }, { status: 403 });
		}

		// 2. Simpan payload terenkripsi ke DB
		const saved = await prisma.status.create({
			data: {
				encrypted_payload: payload
			}
		});

		// 3. Dekripsi payload untuk dikirim ke AI agent
		let decryptedText: string;
		try {
			const decryptedBytes = AES.decrypt(payload, Hex.parse(AES_KEY), {
				iv: Hex.parse(AES_IV)
			});
			decryptedText = decryptedBytes.toString(Utf8).replace(/\0+$/, '');
		} catch (e) {
			return json({ error: 'Decryption failed' }, { status: 400 });
		}
		const parsed = JSON.parse(decryptedText);
		const responseToEsp32 = json({ message: 'Status created successfully' }, { status: 201 });

		// 4. Kirim ke AI agent (async)
		setTimeout(async () => {
			try {
				const aiAgentUrl = process.env.AI_AGENT_URL;
				const response = await fetch(`${aiAgentUrl}/api/agent-gemini`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						id: saved.id,
						age: parsed.age,
						height: parsed.height,
						gender: parsed.gender,
						status: parsed.status
					})
				});
				if (response.ok) {
					const { rekomendasi } = await response.json();
					if (rekomendasi) {
						await prisma.status.update({
							where: { id: saved.id },
							data: { recommendation: rekomendasi }
						});
					}
				}
			} catch (error) {
				console.error('AI Agent error:', error);
			}
		}, 0);

		return responseToEsp32;
	} catch (error) {
		console.error('Decryption/Storage error:', error);
		return json({ error: 'Invalid encrypted data or internal error' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async (event) => {
	try {
		// await authMiddleware(event);

		const data = await event.request.json();
		const { id, recommendation } = data;

		// Validate that id is provided
		if (!id) {
			return json({ error: 'Status ID is required' }, { status: 400 });
		}

		// Build update data object - only include fields that are provided
		const updateData: any = {};
		if (recommendation !== undefined) {
			updateData.recommendation = recommendation;
		}

		// Check if there are any fields to update
		if (Object.keys(updateData).length === 0) {
			return json({ error: 'No fields to update' }, { status: 400 });
		}

		const updatedStatus = await prisma.status.update({
			where: { id },
			data: updateData
		});

		return json(updatedStatus);
	} catch (err) {
		console.error('Error updating status recommendation:', err);
		return json({ error: 'Failed to update status recommendation' }, { status: 500 });
	}
};
