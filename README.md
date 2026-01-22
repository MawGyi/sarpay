# 📚 AppleBook

A premium, Apple Books-inspired e-book reader and library management application built with Next.js 16, React 19, and Supabase.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=flat-square&logo=supabase)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?style=flat-square&logo=tailwindcss)

---

## ✨ Features

### 📖 Multi-Format Support
- **EPUB Reader** — Full-featured epub.js integration with paginated reading
- **Markdown Reader** — Native `.md` file support with react-markdown rendering
- **Multi-Chapter Books** — Organize multiple markdown files as book chapters

### 🎨 Premium Reading Experience
- **Apple Books-Style UI** — Glassmorphism, smooth animations, and premium aesthetics
- **4 Reading Themes** — Original (White), Quiet (Grey), Paper (Sepia), Focus (Dark)
- **Typography Controls** — Adjustable font size, line height, font weight, and brightness
- **Font Selection** — Serif, Sans-serif, Pyidaungsu, and Noto Sans Myanmar (Burmese support)

### 📚 Library Management
- **Grid & List Views** — Toggle between viewing modes
- **Reading Progress** — Track and sync reading progress across sessions
- **Book Covers** — Automatic cover extraction for EPUBs, custom covers for MD files
- **Bulk Upload** — Upload multiple markdown files at once as chapters

### 🔧 Additional Features
- **Immersive Mode** — Fullscreen reading with auto-hiding controls
- **Keyboard Navigation** — Arrow keys for page navigation
- **Table of Contents** — Sidebar navigation for chapters
- **Progress Sync** — Automatic progress saving with Supabase
- **Edit & Delete** — Manage your book collection

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Frontend** | React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 |
| **Animations** | Framer Motion 12 |
| **Icons** | Lucide React |
| **EPUB Engine** | epub.js |
| **Markdown** | react-markdown |
| **Backend** | Supabase (PostgreSQL + Storage) |

---

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/applebook_app.git
cd applebook_app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Set Up Database

Run the following SQL migrations in your Supabase SQL Editor:

**Create the `books` table:**
```sql
create table books (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  title text not null,
  author text not null default 'Unknown',
  description text,
  file_url text not null,
  cover_url text,
  format_type text not null check (format_type in ('epub', 'md', 'pdf')),
  file_size bigint,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

**Create the `chapters` table:**
```sql
create table chapters (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references books(id) on delete cascade not null,
  title text not null,
  file_url text not null,
  file_path text,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_chapters_book_id on chapters(book_id);
```

**Create the `user_progress` table:**
```sql
create table user_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  book_id uuid references books(id) on delete cascade not null,
  location text not null,
  percentage integer default 0,
  current_location integer,
  total_locations integer,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, book_id)
);
```

**Enable Row Level Security (optional but recommended):**
```sql
alter table books enable row level security;
alter table chapters enable row level security;
alter table user_progress enable row level security;

-- Public read access (adjust based on your needs)
create policy "Public read access" on books for select using (true);
create policy "Public read access" on chapters for select using (true);
```

**Create Storage Bucket:**
```sql
insert into storage.buckets (id, name, public)
values ('books', 'books', true);
```

### 5. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
applebook_app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Library home page
│   │   ├── book/[id]/          # Book details page
│   │   └── reader/[id]/        # Reader page
│   ├── components/
│   │   ├── library/            # Library UI components
│   │   │   ├── BookCard.tsx    # Book card component
│   │   │   ├── LibraryGrid.tsx # Grid/List view
│   │   │   ├── DeleteBookModal.tsx
│   │   │   └── EditMdBookModal.tsx
│   │   ├── reader/             # Reader components
│   │   │   ├── EpubReader.tsx  # EPUB reader
│   │   │   ├── MdReader.tsx    # Markdown reader
│   │   │   └── ReaderSettings.tsx
│   │   └── upload/             # Upload components
│   │       └── UploadModal.tsx
│   ├── hooks/                  # Custom React hooks
│   │   ├── useLocalStorage.ts  # Reader preferences
│   │   ├── useReadingProgressSync.ts
│   │   └── useImmersiveMode.ts
│   ├── lib/
│   │   ├── api/books.ts        # Book CRUD operations
│   │   └── supabase.ts         # Supabase client
│   └── types/
│       └── database.ts         # TypeScript types
├── supabase/
│   └── migrations/             # SQL migrations
├── public/                     # Static assets
└── package.json
```

---

## 🎮 Usage

### Upload Books
1. Click the **+** button in the library header
2. Select EPUB or Markdown file(s)
3. Add metadata (title, author, cover)
4. Click **Upload**

### Reading
- Click any book to open the details page
- Click **Start Reading** to open the reader
- Use arrow keys or buttons to navigate pages
- Press **Aa** to access reading settings

### Settings
- **Theme**: Original, Quiet, Paper, Focus
- **Font**: Serif, Sans, Pyidaungsu, Noto Sans Myanmar
- **Size**: Adjustable font size slider
- **Weight**: Normal, Medium, Bold
- **Line Height**: Adjustable spacing
- **Brightness**: Content brightness control

---

## 🛠️ Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [epub.js](https://github.com/futurepress/epub.js) — EPUB rendering engine
- [Supabase](https://supabase.com) — Backend as a Service
- [Framer Motion](https://www.framer.com/motion/) — Animation library
- [Lucide](https://lucide.dev) — Beautiful icons
- [Apple Books](https://www.apple.com/apple-books/) — Design inspiration

---

<p align="center">Made with ❤️ for book lovers</p>
