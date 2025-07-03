import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { authMiddleware } from '$lib/server/auth';
import HmacSHA256 from 'crypto-js/hmac-sha256';
import Hex from 'crypto-js/enc-hex';
import pkg from 'aes-js';
const { ModeOfOperation, utils } = pkg;

// Convert hex strings to byte arrays (matching Arduino format)
const AES_KEY = process.env.AES_KEY!;
const AES_IV = process.env.AES_IV!;
const HMAC_KEY = process.env.HMAC_KEY!;

// Helper function to convert hex string to WordArray (for HMAC)
function hexToWordArray(hexString: string) {
	return Hex.parse(hexString);
}

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
		// Parse JSON request
		let requestData;
		try {
			requestData = await event.request.json();
		} catch (parseError) {
			console.error('JSON parse error:', parseError);
			return json({ error: 'Invalid JSON format' }, { status: 400 });
		}

		const { payload, hmac } = requestData;

		// Validate required fields
		if (!payload || !hmac) {
			return json({ error: 'Payload and HMAC are required' }, { status: 400 });
		}

		// Validate environment variables
		if (!AES_KEY || !AES_IV || !HMAC_KEY) {
			console.error('Missing environment variables: AES_KEY, AES_IV, or HMAC_KEY');
			return json({ error: 'Server configuration error' }, { status: 500 });
		}

		// 1. Verifikasi HMAC
		try {
			const calculatedHmac = HmacSHA256(payload, Hex.parse(HMAC_KEY)).toString(Hex);
			if (calculatedHmac !== hmac) {
				console.error('HMAC mismatch:', { calculated: calculatedHmac, received: hmac });
				return json({ error: 'Invalid HMAC - Data integrity compromised' }, { status: 403 });
			}
		} catch (hmacError) {
			console.error('HMAC calculation error:', hmacError);
			return json({ error: 'HMAC verification failed' }, { status: 500 });
		}

		// 2. Simpan payload terenkripsi ke DB
		let saved;
		try {
			saved = await prisma.status.create({
				data: {
					encrypted_payload: payload
				}
			});
		} catch (dbError) {
			console.error('Database error:', dbError);
			return json({ error: 'Failed to save to database' }, { status: 500 });
		}

		// 3. Dekripsi payload untuk dikirim ke AI agent
		let decryptedText: string = '';
		let parsed: any = null;
		try {
			// Try different decryption approaches
			let decryptedBytes;

			// Approach 1: Try with aes-js (more compatible with mbedtls)
			try {
				// Convert hex strings to Uint8Arrays
				const keyBytes = new Uint8Array(
					AES_KEY.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
				);
				const ivBytes = new Uint8Array(
					AES_IV.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
				);
				const payloadBytes = new Uint8Array(
					payload.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
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
			} catch (e1) {
				console.log('AES decryption failed:', e1);
				throw new Error('Decryption failed');
			}

			// Check if decrypted text is empty
			if (!decryptedText || decryptedText.trim() === '') {
				console.error('Decrypted text is empty');
				return json({ error: 'Decryption resulted in empty string' }, { status: 400 });
			}

			// Parse JSON string menjadi object
			parsed = JSON.parse(decryptedText);
			console.log('Parsed data:', parsed);
		} catch (e) {
			console.error('Decryption/JSON parse failed:', e);
			console.error('Error details:', {
				message: e instanceof Error ? e.message : 'Unknown error',
				stack: e instanceof Error ? e.stack : 'No stack trace'
			});
			// Don't return error here since we already saved the encrypted payload
		}

		// 4. Kirim ke AI agent (async) - hanya jika dekripsi berhasil
		if (parsed) {
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
						const { recommendation } = await response.json();
						if (recommendation) {
							await prisma.status.update({
								where: { id: saved.id },
								data: { recommendation: recommendation }
							});
						}
					}
				} catch (error) {
					console.error('AI Agent error:', error);
				}
			}, 0);
		}

		return json(
			{
				message: 'Status created successfully'
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Unexpected error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
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
