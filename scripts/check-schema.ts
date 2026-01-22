/**
 * Script to discover the actual chapters table schema
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    console.log('🔍 Checking database schema...\n');

    // Try to insert a minimal chapter to see what columns are required
    const { error: insertError } = await supabase
        .from('chapters')
        .insert({
            book_id: 'a762838a-ded1-4a5b-b90c-8cd5242d3572',
            title: 'Test Chapter',
            file_url: 'https://example.com/test.md'
        });

    if (insertError) {
        console.log('Insert error (reveals schema):', insertError.message);
        console.log('Full error:', JSON.stringify(insertError, null, 2));
    } else {
        console.log('Insert succeeded! Deleting test record...');
        await supabase
            .from('chapters')
            .delete()
            .eq('title', 'Test Chapter');
    }

    // Try to select from chapters
    const { data, error } = await supabase.from('chapters').select('*').limit(5);
    if (error) {
        console.log('\nSelect error:', error.message);
    } else {
        console.log('\nExisting chapters:', data?.length || 0);
        if (data && data.length > 0) {
            console.log('Column names:', Object.keys(data[0]));
            console.log('Sample record:', JSON.stringify(data[0], null, 2));
        }
    }

    // Query the information schema to see actual columns
    const { data: schemaData, error: schemaError } = await supabase
        .rpc('get_table_columns', { table_name: 'chapters' });

    if (schemaError) {
        console.log('\nRPC error (function may not exist):', schemaError.message);
    } else {
        console.log('\nTable columns from RPC:', schemaData);
    }
}

main().catch(console.error);
