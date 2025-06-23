<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let username = '';
	let password = '';
	let isLoading = false;
	let errorMessage = '';

	async function handleLogin() {
		if (!username || !password) {
			errorMessage = 'Please fill in all fields';
			return;
		}

		isLoading = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/users/signin', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ username, password })
			});

			const data = await response.json();

			if (response.ok) {
				// Store the token in localStorage
				localStorage.setItem('token', data.token);
				// Redirect to dashboard or home page after successful login
				goto('/dashboard');
			} else {
				errorMessage = data.error || 'Login failed. Please try again.';
			}
		} catch (error) {
			console.error('Login error:', error);
			errorMessage = 'An error occurred. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	// Clear error message when user starts typing
	function clearError() {
		if (errorMessage) {
			errorMessage = '';
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
	<!-- Background Pattern -->
	<div class="absolute inset-0 opacity-20">
		<div class="absolute inset-0" style="background-image: radial-gradient(circle at 1px 1px, rgba(156, 146, 172, 0.15) 1px, transparent 0); background-size: 20px 20px;"></div>
	</div>
	
	<div class="relative w-full max-w-md">
		<!-- Glass Card Effect -->
		<div class="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
			<!-- Header -->
			<div class="text-center mb-8">
				<div class="mx-auto w-16 h-16 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
					<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
					</svg>
				</div>
				<h1 class="text-3xl font-bold text-white mb-2 tracking-tight">
					Welcome Back
				</h1>
				<p class="text-slate-300 text-sm">
					Sign in to your account to continue
				</p>
			</div>

			<!-- Form -->
			<form class="space-y-6" on:submit|preventDefault={handleLogin}>
				<div class="space-y-4">
					<div>
						<label for="username" class="block text-sm font-medium text-slate-200 mb-2">
							Username
						</label>
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
								</svg>
							</div>
							<input
								id="username"
								name="username"
								type="text"
								autocomplete="username"
								required
								bind:value={username}
								on:input={clearError}
								class="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
								placeholder="Enter your username"
							/>
						</div>
					</div>

					<div>
						<label for="password" class="block text-sm font-medium text-slate-200 mb-2">
							Password
						</label>
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
								</svg>
							</div>
							<input
								id="password"
								name="password"
								type="password"
								autocomplete="current-password"
								required
								bind:value={password}
								on:input={clearError}
								class="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
								placeholder="Enter your password"
							/>
						</div>
					</div>
				</div>

				{#if errorMessage}
					<div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
						<div class="flex items-center">
							<svg class="h-5 w-5 text-red-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
							</svg>
							<p class="text-sm text-red-300">
								{errorMessage}
							</p>
						</div>
					</div>
				{/if}

				<button
					type="submit"
					disabled={isLoading}
					class="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
				>
					{#if isLoading}
						<div class="flex items-center justify-center">
							<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Signing in...
						</div>
					{:else}
						<div class="flex items-center justify-center">
							<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
							</svg>
							Sign in
						</div>
					{/if}
				</button>
			</form>
		</div>
	</div>
</div> 