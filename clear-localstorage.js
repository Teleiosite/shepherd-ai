// Clear old localStorage contacts to force backend loading
// Run this in browser console: F12 → Console → paste this code

console.log('🧹 Clearing old localStorage contacts...');
localStorage.removeItem('shepherd_contacts');
localStorage.removeItem('shepherd_contacts_cache');
console.log('✅ Cleared! Refresh the page to load from backend.');
console.log('📊 Contacts should now load from Supabase database!');
