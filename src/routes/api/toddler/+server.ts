import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { authMiddleware } from '$lib/server/auth';

export const GET: RequestHandler = async (event) => {
	try {
		// Authenticate user
		// await authMiddleware(event);

		// Fetch all toddlers from the database
		const toddlers = await prisma.toddler.findMany({
			include: {
				Status: true // Include parent details if needed
			}
		});

		return json(toddlers);
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
