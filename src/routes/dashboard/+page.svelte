<script lang="ts">
    import type { PageData } from './$types';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
    import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '$lib/components/ui/dialog';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';

    // State management
    let toddlers: any[] = [];
    let selectedToddler: any = null;
    let selectedToddlerData: any[] = [];
    let loading = true;
    let showAddDialog = false;
    let newToddler = {
        uid: '',
        name: '',
        gender: 'male'
    };

    // Summary statistics
    let summaryStats = {
        totalToddlers: 0,
        normalCount: 0,
        stuntedCount: 0,
        severelyStuntedCount: 0,
        tallCount: 0
    };

    onMount(async () => {
        if (!localStorage.getItem('token')) {
            alert('Please login to continue');
            goto('/login');
        }
        await fetchToddlers();
    });

    async function fetchToddlers() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/toddler', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                toddlers = await response.json();
                calculateSummaryStats();
                if (toddlers.length > 0) {
                    selectedToddler = toddlers[0];
                    await fetchToddlerData(selectedToddler.uid);
                }
            }
        } catch (error) {
            console.error('Error fetching toddlers:', error);
        } finally {
            loading = false;
        }
    }

    async function fetchToddlerData(uid: string) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/toddler/${uid}/status`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                selectedToddlerData = await response.json();
            }
        } catch (error) {
            console.error('Error fetching toddler data:', error);
        }
    }

    async function calculateSummaryStats() {
        summaryStats.totalToddlers = toddlers.length;
        summaryStats.normalCount = 0;
        summaryStats.stuntedCount = 0;
        summaryStats.severelyStuntedCount = 0;
        summaryStats.tallCount = 0;

        // Count toddlers by their latest status
        for (const toddler of toddlers) {
            if (toddler.Status && toddler.Status.length > 0) {
                // Sort by createdAt to get the latest status
                const latestStatus = toddler.Status.sort((a: any, b: any) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )[0];
                
                switch (latestStatus.status) {
                    case 'normal':
                        summaryStats.normalCount++;
                        break;
                    case 'stunted':
                        summaryStats.stuntedCount++;
                        break;
                    case 'severely_stunted':
                        summaryStats.severelyStuntedCount++;
                        break;
                    case 'tinggi':
                        summaryStats.tallCount++;
                        break;
                }
            }
        }
    }

    async function handleToddlerChange(event: any) {
        const uid = event.target.value;
        selectedToddler = toddlers.find(t => t.uid === uid);
        if (selectedToddler) {
            await fetchToddlerData(uid);
        }
    }

    async function handleAddToddler() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/toddler', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newToddler)
            });

            if (response.ok) {
                await fetchToddlers();
                showAddDialog = false;
                newToddler = { uid: '', name: '', gender: 'male' };
            }
        } catch (error) {
            console.error('Error adding toddler:', error);
        }
    }

    async function handleLogout() {
        // Clear any stored tokens/session
        localStorage.removeItem('token');
        // Redirect to login page
        goto('/login');
    }

    function formatRecommendation(recommendation: string) {
        if (!recommendation) return '-';
        
        // Split by * and filter out empty strings
        const points = recommendation.split('*').filter(point => point.trim());
        
        if (points.length === 0) return recommendation;
        
        // Format as bullet points - add bullet to all items including the first
        return points.map(point => `• ${point.trim()}`).join('\n');
    }

    function formatDate(dateString: string) {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    <!-- Background Pattern -->
    <div class="absolute inset-0 opacity-20">
        <div class="absolute inset-0" style="background-image: radial-gradient(circle at 1px 1px, rgba(156, 146, 172, 0.15) 1px, transparent 0); background-size: 20px 20px;"></div>
    </div>

    <!-- Navigation Bar -->
    <nav class="relative backdrop-blur-xl bg-white/10 border-b border-white/20">
        <div class="container mx-auto px-2 sm:px-4 md:px-6 py-4">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div class="flex items-center space-x-4">
                    <div class="w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-600 rounded-lg flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                        </svg>
                    </div>
                    <h1 class="text-xl font-semibold text-white">Stunting Diagnose Dashboard</h1>
                </div>
                <Button variant="outline" onclick={handleLogout}>
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    Logout
                </Button>
            </div>
        </div>
    </nav>

    <div class="relative container mx-auto px-2 sm:px-4 md:px-6 py-4 space-y-6">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
                <h2 class="text-2xl font-bold text-white mb-2">Dashboard Overview</h2>
                <p class="text-slate-300">Monitor and analyze toddler growth data</p>
            </div>
            <Dialog bind:open={showAddDialog}>
                <DialogTrigger>
                    <Button class="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white border-0 w-full sm:w-auto">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Add Toddler
                    </Button>
                </DialogTrigger>
                <DialogContent class="backdrop-blur-xl bg-white/10 border border-white/20 max-w-xs sm:max-w-md w-full">
                    <DialogHeader>
                        <DialogTitle class="text-white">Add New Toddler</DialogTitle>
                        <DialogDescription class="text-slate-300">
                            Enter the details for the new toddler.
                        </DialogDescription>
                    </DialogHeader>
                    <div class="space-y-4">
                        <div>
                            <Label for="uid" class="text-slate-200 mb-2">UID</Label>
                            <Input id="uid" bind:value={newToddler.uid} placeholder="Enter UID" class="bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400" />
                        </div>
                        <div>
                            <Label for="name" class="text-slate-200 mb-2">Name</Label>
                            <Input id="name" bind:value={newToddler.name} placeholder="Enter name" class="bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400" />
                        </div>
                        <div>
                            <Label for="gender" class="text-slate-200 mb-2">Gender</Label>
                            <select id="gender" bind:value={newToddler.gender} class="w-full p-2 bg-slate-800/50 border border-slate-600/50 rounded-md text-white">
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onclick={() => showAddDialog = false} class="w-full sm:w-auto">Cancel</Button>
                        <Button onclick={handleAddToddler} class="w-full sm:w-auto">Add Toddler</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

        {#if loading}
            <div class="flex justify-center items-center h-64">
                <div class="text-lg text-white">Loading...</div>
            </div>
        {:else}
            <!-- Summary Statistics -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div class="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                    <div class="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 class="text-sm font-medium text-slate-200">Total Toddlers</h3>
                        <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                    </div>
                    <div class="text-2xl font-bold text-white">{summaryStats.totalToddlers}</div>
                </div>
                <div class="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                    <div class="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 class="text-sm font-medium text-slate-200">Normal</h3>
                        <svg class="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <div class="text-2xl font-bold text-green-400">{summaryStats.normalCount}</div>
                </div>
                <div class="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                    <div class="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 class="text-sm font-medium text-slate-200">Stunted</h3>
                        <svg class="h-4 w-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                    </div>
                    <div class="text-2xl font-bold text-yellow-400">{summaryStats.stuntedCount}</div>
                </div>
                <div class="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                    <div class="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 class="text-sm font-medium text-slate-200">Severely Stunted</h3>
                        <svg class="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <div class="text-2xl font-bold text-red-400">{summaryStats.severelyStuntedCount}</div>
                </div>
                <div class="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                    <div class="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 class="text-sm font-medium text-slate-200">Tall</h3>
                        <svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"></path>
                        </svg>
                    </div>
                    <div class="text-2xl font-bold text-blue-400">{summaryStats.tallCount}</div>
                </div>
            </div>

            <!-- Toddler Selection -->
            <div class="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                <div class="mb-4">
                    <h3 class="text-lg font-semibold text-white">Select Toddler</h3>
                    <p class="text-slate-300 text-sm">Choose a toddler to view their detailed data</p>
                </div>
                <select 
                    value={selectedToddler?.uid} 
                    on:change={handleToddlerChange}
                    class="w-full p-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                >
                    <option value="">Select a toddler</option>
                    {#each toddlers as toddler}
                        <option value={toddler.uid}>
                            {toddler.name}
                        </option>
                    {/each}
                </select>
            </div>

            {#if selectedToddler}
                <!-- Toddler Details -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Toddler Info -->
                    <div class="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                        <div class="mb-4">
                            <h3 class="text-lg font-semibold text-white">Toddler Information - {selectedToddler.name}</h3>
                            <p class="text-slate-300 text-sm">Basic information about the selected toddler</p>
                        </div>
                        <div class="space-y-4">
                            <div class="flex justify-between">
                                <span class="font-medium text-slate-200">Name:</span>
                                <span class="text-white">{selectedToddler.name}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="font-medium text-slate-200">UID:</span>
                                <span class="text-white">{selectedToddler.uid}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="font-medium text-slate-200">Gender:</span>
                                <span class="text-white capitalize">{selectedToddler.gender}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="font-medium text-slate-200">Total Records:</span>
                                <span class="text-white">{selectedToddlerData.length}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Status Summary -->
                    <div class="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                        <div class="mb-4">
                            <h3 class="text-lg font-semibold text-white">Status Summary</h3>
                            <p class="text-slate-300 text-sm">Current status distribution for this toddler</p>
                        </div>
                        {#if selectedToddlerData.length > 0}
                            <div class="space-y-3 max-h-40 overflow-y-auto pr-2">
                                {#each selectedToddlerData
                                    .slice()
                                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                    .slice(0, 2) as status}
                                    <div class="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg">
                                        <div>
                                            <div class="font-medium text-white">Age: {status.age} months</div>
                                            <div class="text-sm text-slate-300">Height: {status.height} cm</div>
                                        </div>
                                        <span class="px-3 py-1 rounded-full text-xs font-medium
                                            {status.status === 'normal' ? 'bg-green-500/20 text-green-300' :
                                            status.status === 'stunted' ? 'bg-yellow-500/20 text-yellow-300' :
                                            status.status === 'severely_stunted' ? 'bg-red-500/20 text-red-300' :
                                            status.status === 'tinggi' ? 'bg-blue-500/20 text-blue-300' :
                                            'bg-gray-500/20 text-gray-300'}">
                                            {status.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <div class="text-center py-8 text-slate-400">
                                No status data available for this toddler
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Recent Status Data -->
                <div class="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                    <div class="mb-4">
                        <h3 class="text-lg font-semibold text-white">Recent Status Data - {selectedToddler.name}</h3>
                        <p class="text-slate-300 text-sm">Latest measurements and status</p>
                    </div>
                    {#if selectedToddlerData.length > 0}
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr class="border-b border-slate-600">
                                        <th class="text-left p-2 text-slate-200">Date</th>
                                        <th class="text-left p-2 text-slate-200">Age (months)</th>
                                        <th class="text-left p-2 text-slate-200">Height (cm)</th>
                                        <th class="text-left p-2 text-slate-200">Status</th>
                                        <th class="text-left p-2 text-slate-200">Recommendation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each selectedToddlerData.slice(0, 5) as status}
                                        <tr class="border-b border-slate-600/50">
                                            <td class="p-2 text-white">{formatDate(status.createdAt)}</td>
                                            <td class="p-2 text-white">{status.age}</td>
                                            <td class="p-2 text-white">{status.height}</td>
                                            <td class="p-2">
                                                <span class="px-2 py-1 rounded text-xs font-medium
                                                    {status.status === 'normal' ? 'bg-green-500/20 text-green-300' :
                                                    status.status === 'stunted' ? 'bg-yellow-500/20 text-yellow-300' :
                                                    status.status === 'severely_stunted' ? 'bg-red-500/20 text-red-300' :
                                                    status.status === 'tall' ? 'bg-blue-500/20 text-blue-300' :
                                                    'bg-gray-500/20 text-gray-300'}">
                                                    {status.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td class="p-2 text-white">
                                                {#if status.recommendation}
                                                    <div class="whitespace-pre-line text-sm">
                                                        {formatRecommendation(status.recommendation)}
                                                    </div>
                                                {:else}
                                                    -
                                                {/if}
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    {:else}
                        <div class="text-center py-8 text-slate-400">
                            No status data available for this toddler
                        </div>
                    {/if}
                </div>
            {:else}
                <div class="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                    <div class="text-center py-8">
                        <p class="text-slate-400">No toddlers available. Please add a toddler to view the dashboard.</p>
                    </div>
                </div>
            {/if}
        {/if}
    </div>
</div>