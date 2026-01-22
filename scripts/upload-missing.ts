/**
 * Script to upload missing chapters (5-9, 47-48)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
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
const CONTENT_DIR = '/Users/user/Desktop/my_book/48LawsofPower_MM/content';

// Chapters that need to be uploaded
const MISSING_CHAPTERS = [5, 6, 7, 8, 9, 47, 48];

async function main() {
    console.log('📤 Uploading missing chapters:', MISSING_CHAPTERS.join(', '));
    const timestamp = Date.now();

    for (const chapNum of MISSING_CHAPTERS) {
        const fileName = `Law${chapNum}.md`;
        const filePath = path.join(CONTENT_DIR, fileName);

        if (!fs.existsSync(filePath)) {
            console.log(`   ⚠️  File not found: ${fileName}`);
            continue;
        }

        const storageName = `48_Laws_of_Power_ch${chapNum}_${timestamp}.md`;
        console.log(`📤 Uploading ${fileName}...`);

        const fileContent = fs.readFileSync(filePath);
        const file = new Blob([fileContent], { type: 'text/markdown' });

        const { data, error: uploadError } = await supabase.storage
            .from('books')
            .upload(storageName, file, {
                cacheControl: '3600',
                upsert: true,
            });

        if (uploadError) {
            console.log(`   ❌ Upload failed: ${uploadError.message}`);
            continue;
        }

        const { data: urlData } = supabase.storage.from('books').getPublicUrl(data.path);
        const fileUrl = urlData.publicUrl;

        // Create chapter record
        const { error: chapError } = await supabase
            .from('chapters')
            .insert({
                book_id: BOOK_ID,
                title: `Law${chapNum}`,
                file_url: fileUrl,
                sequence_order: chapNum
            });

        if (chapError) {
            console.log(`   ❌ Link failed: ${chapError.message}`);
        } else {
            console.log(`   ✅ Done`);
        }
    }

    // Verify total chapters
    const { data: chapters, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', BOOK_ID)
        .order('sequence_order', { ascending: true });

    if (error) {
        console.log('Error fetching chapters:', error.message);
    } else {
        console.log(`\n📚 Total chapters linked: ${chapters?.length || 0}`);
        console.log('Chapter numbers:', chapters?.map(c => c.sequence_order).join(', '));
    }

    console.log(`\n🔗 View at: http://localhost:3000/book/${BOOK_ID}`);
}

main().catch(console.error);
