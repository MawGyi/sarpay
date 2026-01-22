/**
 * Script to link chapters for the 48 Laws of Power book
 * The files are already uploaded, we just need to create chapter records
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// The book ID from the previous upload
const BOOK_ID = 'a762838a-ded1-4a5b-b90c-8cd5242d3572';
const CONTENT_DIR = '/Users/user/Desktop/my_book/48LawsofPower_MM/content';

function naturalSort(a: string, b: string): number {
    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
    return numA - numB;
}

async function main() {
    console.log('🔗 Linking chapters for book:', BOOK_ID);

    // First, check what columns the chapters table has
    const { data: testData, error: testError } = await supabase
        .from('chapters')
        .select('*')
        .limit(1);

    if (testError) {
        console.error('Error checking chapters table:', testError.message);
    } else {
        console.log('Chapters table columns:', testData ? Object.keys(testData[0] || {}) : 'empty');
    }

    // Get the book to find the file URL pattern
    const { data: book, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', BOOK_ID)
        .single();

    if (bookError || !book) {
        console.error('❌ Book not found:', bookError?.message);
        process.exit(1);
    }

    console.log('📖 Book found:', book.title);
    console.log('📁 Main file URL:', book.file_url);

    // Extract the base URL pattern
    const baseUrl = book.file_url.substring(0, book.file_url.lastIndexOf('/') + 1);
    console.log('🔗 Base URL:', baseUrl);

    // Get file names from content dir
    const allFiles = fs.readdirSync(CONTENT_DIR);
    const lawFiles = allFiles
        .filter(f => /^Law\d+\.md$/i.test(f))
        .sort(naturalSort);

    console.log(`\n📚 Found ${lawFiles.length} chapter files\n`);

    // The timestamp used in the upload (we need to find the actual files in storage)
    // Let's list the storage bucket to find the actual file names
    const { data: storageFiles, error: storageError } = await supabase.storage
        .from('books')
        .list('', { limit: 100, search: '48_Laws_of_Power_ch' });

    if (storageError) {
        console.error('Error listing storage:', storageError.message);
    } else {
        console.log('Storage files found:', storageFiles?.length);

        // Sort by chapter number
        const sortedStorageFiles = (storageFiles || [])
            .filter(f => f.name.includes('48_Laws_of_Power_ch'))
            .sort((a, b) => {
                const numA = parseInt(a.name.match(/_ch(\d+)_/)?.[1] || '0');
                const numB = parseInt(b.name.match(/_ch(\d+)_/)?.[1] || '0');
                return numA - numB;
            });

        console.log(`Found ${sortedStorageFiles.length} chapter files in storage\n`);

        // Create chapter records using only file_url (not file_path)
        for (let i = 0; i < sortedStorageFiles.length; i++) {
            const storageFile = sortedStorageFiles[i];
            const chapterNum = parseInt(storageFile.name.match(/_ch(\d+)_/)?.[1] || '0');
            const lawTitle = `Law${chapterNum}`;

            const { data: urlData } = supabase.storage.from('books').getPublicUrl(storageFile.name);
            const fileUrl = urlData.publicUrl;

            console.log(`🔗 Linking chapter ${chapterNum}: ${lawTitle}`);

            const { error: chapError } = await supabase
                .from('chapters')
                .insert({
                    book_id: BOOK_ID,
                    title: lawTitle,
                    file_url: fileUrl,
                    order_index: i
                });

            if (chapError) {
                console.error(`   ❌ Failed: ${chapError.message}`);
            } else {
                console.log(`   ✅ Done`);
            }
        }
    }

    console.log('\n🎉 Chapter linking complete!');
    console.log(`🔗 View at: http://localhost:3000/book/${BOOK_ID}`);
}

main().catch(console.error);
