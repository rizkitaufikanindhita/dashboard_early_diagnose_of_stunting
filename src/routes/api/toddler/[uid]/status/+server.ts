import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { authMiddleware } from '$lib/server/auth';

export const GET: RequestHandler = async (event) => {
	try {
		// Authenticate user
		// await authMiddleware(event);

		const uid = event.params.uid;

		if (!uid) {
			return json({ error: 'UID is required' }, { status: 400 });
		}

		// Fetch status data for the specific toddler
		const statusData = await prisma.status.findMany({
			where: {
				toddler: {
					uid: uid
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		});

		return json(statusData);
	} catch (err) {
		console.error('Error fetching toddler status:', err);
		return json({ error: 'Failed to fetch toddler status' }, { status: 500 });
	}
};
