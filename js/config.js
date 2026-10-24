/*
 * config.js — optional account sync. Leave both empty to run without accounts.
 * Both values are public by design (they ship to every browser); the database's row-level
 * security is what keeps each person's rows private. See supabase/schema.sql and the README.
 */
window.AT = window.AT || {};
window.AT.config = {
  supabaseUrl: '',       // https://<project-ref>.supabase.co
  supabaseAnonKey: ''    // Project settings → API → anon / publishable key
};
