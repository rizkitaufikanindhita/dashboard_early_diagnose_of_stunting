import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { authMiddleware } from '$lib/server/auth';

export const GET: RequestHandler = async (event) => {
	try {
		// Authenticate user
		await authMiddleware(event);

		// Fetch all toddlers from the database
		const status = await prisma.status.findMany({
			include: {
				toddler: true // Include parent details if needed
			}
		});

		return json(status);
	} catch (err) {
		console.error('Error fetching toddlers:', err);
		return json({ error: 'Failed to fetch toddlers' }, { status: 500 });
	}
};

export const POST: RequestHandler = async (event) => {
	try {
		const data = await event.request.json();
		const { uid, status, height, age } = data;

		const toddler = await prisma.toddler.findUnique({ where: { uid } });

		if (!toddler) {
			return json({ error: `Toddler with UID ${uid} not found` }, { status: 404 });
		}

		const existingStatus = await prisma.status.findFirst({
			where: {
				toddler: { uid },
				age
			},
			include: { toddler: true }
		});

		let newStatus;
		if (existingStatus) {
			newStatus = await prisma.status.update({
				where: { id: existingStatus.id },
				data: { status, height, age },
				include: { toddler: true }
			});
		} else {
			newStatus = await prisma.status.create({
				data: {
					toddler: { connect: { uid } },
					status,
					height,
					age
				},
				include: { toddler: true }
			});
		}

		// Balas ke ESP32 dulu
		const responseToEsp32 = json({ message: 'Status created successfully' }, { status: 201 });

		// Jalankan fetch() ke Flask di background
		setTimeout(async () => {
			try {
				const aiAgentUrl = process.env.AI_AGENT_URL;

				const response = await fetch(aiAgentUrl + '/api/agent-gemini', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						id: newStatus.id,
						age: newStatus.age,
						height: newStatus.height,
						gender: newStatus.toddler.gender,
						status: newStatus.status
					})
				});

				if (response.ok) {
					const externalApiResponse = await response.json();
					console.log('External API response:', externalApiResponse);

					if (externalApiResponse.rekomendasi) {
						await prisma.status.update({
							where: { id: newStatus.id },
							data: { recommendation: externalApiResponse.rekomendasi }
						});
						console.log('Status updated with recommendation');
					}
				} else {
					console.error('External API error:', response.status, response.statusText);
				}
			} catch (error) {
				console.error('Error calling external API:', error);
			}
		}, 0); // Async background

		return responseToEsp32;
	} catch (err) {
		console.error('Error creating status:', err);
		return json({ error: 'Failed to create status' }, { status: 500 });
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
