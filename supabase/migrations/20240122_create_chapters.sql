-- Create chapters table
create table if not exists chapters (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references books(id) on delete cascade not null,
  title text not null,
  file_url text not null,
  file_path text, -- for storage management
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add index for faster lookups
create index idx_chapters_book_id on chapters(book_id);

-- Add RLS policies (mirroring books table)
alter table chapters enable row level security;

create policy "Chapters are viewable by everyone"
  on chapters for select
  using ( true );

create policy "Users can insert their own book chapters"
  on chapters for insert
  with check ( 
    auth.uid() = (select user_id from books where id = book_id) 
    or 
    (select user_id from books where id = book_id) is null 
  );
