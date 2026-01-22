/**
 * Script to link chapters with the correct schema
 * Uses sequence_order instead of order_index
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

const BOOK_ID = 'a762838a-ded1-4a5b-b90c-8cd5242d3572';

async function main() {
    console.log('🔗 Linking chapters for book:', BOOK_ID);

    // List storage files for this book
    const { data: storageFiles, error: storageError } = await supabase.storage
        .from('books')
        .list('', { limit: 200, search: '48_Laws_of_Power_ch' });

    if (storageError) {
        console.error('Error listing storage:', storageError.message);
        process.exit(1);
    }

    // Filter and sort by chapter number
    const chapterFiles = (storageFiles || [])
        .filter(f => f.name.includes('48_Laws_of_Power_ch'))
        .sort((a, b) => {
            const numA = parseInt(a.name.match(/_ch(\d+)_/)?.[1] || '0');
            const numB = parseInt(b.name.match(/_ch(\d+)_/)?.[1] || '0');
            return numA - numB;
        });

    // Remove duplicates (keep the first one for each chapter number)
    const uniqueChapters = new Map<number, typeof chapterFiles[0]>();
    for (const file of chapterFiles) {
        const chapNum = parseInt(file.name.match(/_ch(\d+)_/)?.[1] || '0');
        if (!uniqueChapters.has(chapNum)) {
            uniqueChapters.set(chapNum, file);
        }
    }

    const finalChapters = Array.from(uniqueChapters.entries()).sort((a, b) => a[0] - b[0]);
    console.log(`📚 Found ${finalChapters.length} unique chapters in storage\n`);

    // Create chapter records
    for (const [chapNum, file] of finalChapters) {
        const { data: urlData } = supabase.storage.from('books').getPublicUrl(file.name);
        const fileUrl = urlData.publicUrl;
        const title = `Law${chapNum}`;

        console.log(`🔗 Linking chapter ${chapNum}: ${title}`);

        const { error: chapError } = await supabase
            .from('chapters')
            .insert({
                book_id: BOOK_ID,
                title: title,
                file_url: fileUrl,
                sequence_order: chapNum  // Using sequence_order instead of order_index
            });

        if (chapError) {
            console.error(`   ❌ Failed: ${chapError.message}`);
        } else {
            console.log(`   ✅ Done`);
        }
    }

    console.log('\n🎉 Chapter linking complete!');
    console.log(`🔗 View at: http://localhost:3000/book/${BOOK_ID}`);
}

main().catch(console.error);
