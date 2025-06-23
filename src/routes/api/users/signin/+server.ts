import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import bcrypt from 'bcryptjs';
import { generateToken } from '$lib/server/auth';

// POST /api/users/signin - Signin (Authenticate user)
export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		// Validate required fields
		if (!data.username || !data.password) {
			return json({ error: 'Username and password are required' }, { status: 400 });
		}

		// Find user
		const user = await prisma.user.findFirst({
			where: { username: data.username.toLowerCase() }
		});

		if (!user || !user.password) {
			return json({ error: 'Invalid username or password' }, { status: 401 });
		}

		// Verify password
		const passwordMatch = await bcrypt.compare(data.password, user.password);
		if (!passwordMatch) {
			return json({ error: 'Invalid username or password' }, { status: 401 });
		}

		// Generate JWT token
		const token = generateToken(user.id);

		// Remove password from response
		const { password, ...userWithoutPassword } = user;

		return json({
			user: userWithoutPassword,
			token
		});
	} catch (error) {
		console.error('Error signing in:', error);
		return json({ error: 'Failed to sign in' }, { status: 500 });
	}
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 204 });
};
