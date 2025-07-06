import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { authMiddleware } from '$lib/server/auth';
// Importasi untuk dekripsi
import pkg from 'aes-js';
const { ModeOfOperation, utils } = pkg;

// Variabel lingkungan untuk dekripsi
const AES_KEY = process.env.AES_KEY!;
const AES_IV = process.env.AES_IV!;

export const GET: RequestHandler = async (event) => {
	try {
		// Authenticate user
		await authMiddleware(event);

		// 1. Ambil semua data balita
		const toddlers = await prisma.toddler.findMany({});

		// 2. Ambil semua data status, diurutkan berdasarkan tanggal untuk mempermudah pencarian data terbaru
		const statuses = await prisma.status.findMany({
			orderBy: {
				createdAt: 'desc'
			}
		});

		// 3. Dekripsi status dan buat peta (map) untuk status terbaru dari setiap UID
		const latestStatusMap = new Map<string, string>();

		// Konversi kunci hex ke byte array sekali saja untuk efisiensi
		const keyBytes = new Uint8Array(AES_KEY.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
		const ivBytes = new Uint8Array(AES_IV.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

		for (const status of statuses) {
			try {
				const payloadBytes = new Uint8Array(
					status.encrypted_payload.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
				);

				const aesCbc = new ModeOfOperation.cbc(keyBytes, ivBytes);
				const decryptedBytes = aesCbc.decrypt(payloadBytes);

				// Hapus padding PKCS7
				const paddingLength = decryptedBytes[decryptedBytes.length - 1];
				const actualData = decryptedBytes.slice(0, decryptedBytes.length - paddingLength);

				const decryptedText = utils.utf8.fromBytes(actualData);
				const parsedPayload = JSON.parse(decryptedText);

				// Karena status sudah diurutkan, yang pertama kali kita temukan untuk sebuah UID adalah yang terbaru
				if (parsedPayload.uid && !latestStatusMap.has(parsedPayload.uid)) {
					latestStatusMap.set(parsedPayload.uid, parsedPayload.status);
				}
			} catch (e) {
				console.error(`Gagal mendekripsi atau mem-parsing status ID ${status.id}:`, e);
				continue; // Lanjut ke record status berikutnya
			}
		}

		// 4. Gabungkan data balita dengan status terbarunya
		const toddlersWithLatestStatus = toddlers.map((toddler) => ({
			...toddler,
			latestStatus: latestStatusMap.get(toddler.uid) || null // Gunakan null jika tidak ada status
		}));

		return json(toddlersWithLatestStatus);
	} catch (err) {
		console.error('Error fetching toddlers:', err);
		return json({ error: 'Failed to fetch toddlers' }, { status: 500 });
	}
};

export const POST: RequestHandler = async (event) => {
	try {
		// Authenticate user
		await authMiddleware(event);

		const data = await event.request.json();

		// Create a new toddler in the database
		const newToddler = await prisma.toddler.create({
			data: {
				uid: data.uid,
				name: data.name,
				gender: data.gender
			}
		});

		return json(newToddler, { status: 201 });
	} catch (err) {
		console.error('Error creating toddler:', err);
		return json({ error: 'Failed to create toddler' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async (event) => {
	try {
		// Authenticate user
		await authMiddleware(event);

		const { uid } = await event.request.json();

		// Delete the toddler by UID
		const deletedToddler = await prisma.toddler.delete({
			where: { uid }
		});

		return json(deletedToddler, { status: 200 });
	} catch (err) {
		console.error('Error deleting toddler:', err);
		return json({ error: 'Failed to delete toddler' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async (event) => {
	try {
		await authMiddleware(event);
		const data = await event.request.json();

		const { uid, name, gender } = data;
		if (!uid) {
			return json({ error: 'UID is required' }, { status: 400 });
		}

		const updateData: any = {};
		if (name !== undefined) updateData.name = name;
		if (gender !== undefined) updateData.gender = gender;

		if (Object.keys(updateData).length === 0) {
			return json({ error: 'No fields to update' }, { status: 400 });
		}

		const updatedToddler = await prisma.toddler.update({
			where: { uid },
			data: updateData
		});

		return json(updatedToddler);
	} catch (err) {
		console.error('Error updating toddler:', err);
		return json({ error: 'Failed to update toddler' }, { status: 500 });
	}
};
