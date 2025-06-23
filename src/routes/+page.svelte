<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    goto('/login');
  });
</script>

<div class="flex items-center justify-center min-h-screen">
  <div class="text-center">
    <h1 class="text-2xl font-bold text-blue-600 mb-4">Redirecting to Login...</h1>
    <p class="text-gray-600">Please wait while we redirect you to the login page.</p>
  </div>
</div>
