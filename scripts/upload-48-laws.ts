/**
 * Script to upload 48 Laws of Power as a single book with chapters
 * Run with: npx tsx scripts/upload-48-laws.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CONTENT_DIR = '/Users/user/Desktop/my_book/48LawsofPower_MM/content';
const BOOK_TITLE = '48 Laws of Power';
const BOOK_AUTHOR = 'Robert Greene';

// Natural sort function for Law1, Law2, ..., Law48
function naturalSort(a: string, b: string): number {
    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
    return numA - numB;
}

async function uploadFile(bucket: string, filePath: string, fileName: string): Promise<string> {
    const fileContent = fs.readFileSync(filePath);
    const file = new Blob([fileContent], { type: 'text/markdown' });

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
        });

    if (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
}

async function main() {
    console.log('🚀 Starting upload of 48 Laws of Power...\n');

    // Get all Law*.md files
    const allFiles = fs.readdirSync(CONTENT_DIR);
    const lawFiles = allFiles
        .filter(f => /^Law\d+\.md$/i.test(f))
        .sort(naturalSort);

    console.log(`📚 Found ${lawFiles.length} chapter files\n`);

    if (lawFiles.length === 0) {
        console.error('❌ No Law files found!');
        process.exit(1);
    }

    // Upload all chapter files
    const chapterUploads: { title: string; url: string; storagePath: string; order: number }[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < lawFiles.length; i++) {
        const file = lawFiles[i];
        const filePath = path.join(CONTENT_DIR, file);
        const storageName = `48_Laws_of_Power_ch${i + 1}_${timestamp}.md`;

        console.log(`📤 Uploading chapter ${i + 1}/${lawFiles.length}: ${file}`);

        try {
            const url = await uploadFile('books', filePath, storageName);
            chapterUploads.push({
                title: file.replace('.md', ''),
                url,
                storagePath: storageName,
                order: i
            });
            console.log(`   ✅ Done`);
        } catch (err) {
            console.error(`   ❌ Failed: ${err}`);
            process.exit(1);
        }
    }

    // Create book record
    console.log('\n📖 Creating book record...');
    const mainFileUrl = chapterUploads[0].url;
    const totalSize = lawFiles.reduce((acc, f) => {
        const stat = fs.statSync(path.join(CONTENT_DIR, f));
        return acc + stat.size;
    }, 0);

    const { data: book, error: bookError } = await supabase
        .from('books')
        .insert({
            title: BOOK_TITLE,
            author: BOOK_AUTHOR,
            description: 'The definitive guide to power and strategy.',
            file_url: mainFileUrl,
            cover_url: null,
            format_type: 'md',
            file_size: totalSize,
            user_id: null,
        })
        .select()
        .single();

    if (bookError || !book) {
        console.error('❌ Failed to create book:', bookError?.message);
        process.exit(1);
    }

    console.log(`✅ Book created with ID: ${book.id}`);

    // Create chapter records
    console.log('\n🔗 Linking chapters...');
    for (const chap of chapterUploads) {
        const { error: chapError } = await supabase
            .from('chapters')
            .insert({
                book_id: book.id,
                title: chap.title,
                file_url: chap.url,
                file_path: chap.storagePath,
                order_index: chap.order
            });

        if (chapError) {
            console.error(`   ❌ Failed to link chapter ${chap.title}: ${chapError.message}`);
        } else {
            console.log(`   ✅ Linked: ${chap.title}`);
        }
    }

    console.log('\n🎉 Upload complete!');
    console.log(`📚 Book: ${BOOK_TITLE}`);
    console.log(`📖 Chapters: ${chapterUploads.length}`);
    console.log(`🔗 View at: http://localhost:3000/book/${book.id}`);
}

main().catch(console.error);
