import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Mocks ───────────────────────────────────────────────

import React from 'react';

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: null,
    isAdmin: false,
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock framer-motion to remove animations
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');

  // Use a Proxy so motion.div, motion.aside, motion.button, etc. all work
  const motionProxy = new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      // Return a component that renders the underlying HTML element, filtering framer props
      const Wrapper = React.forwardRef(function MotionWrapper(
        props: Record<string, unknown>,
        ref: React.Ref<unknown>,
      ) {
        const {
          children,
          initial: _i, animate: _a, exit: _e, transition: _t, variants: _v,
          whileHover: _wh, whileTap: _wt, whileFocus: _wf, whileInView: _wi, whileDrag: _wd,
          layout: _l, layoutId: _lid,
          ...rest
        } = props;
        return React.createElement(prop, { ...rest, ref }, children as React.ReactNode);
      });
      Wrapper.displayName = `motion.${prop}`;
      return Wrapper;
    },
  });

  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: motionProxy,
  };
});

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

import { BookCard } from '@/components/library/BookCard';
import { LibraryGrid } from '@/components/library/LibraryGrid';
import { EmptyLibraryIllustration, NoResultsIllustration } from '@/components/library/EmptyStates';
import { Sidebar } from '@/components/library/Sidebar';
import type { Book } from '@/types/database';

// ─── Test data ───────────────────────────────────────────

const sampleBook: Book = {
  id: 'b1',
  title: 'Test Book',
  author: 'Jane Doe',
  fileUrl: '/books/test.epub',
  coverUrl: 'https://example.com/cover.jpg',
  formatType: 'epub',
  progress: 42,
  createdAt: '2025-01-01T00:00:00Z',
  chapterCount: 5,
};

const sampleBooks: Book[] = [
  sampleBook,
  {
    id: 'b2',
    title: 'Markdown Guide',
    author: 'John Smith',
    fileUrl: '/books/guide.md',
    coverUrl: null,
    formatType: 'md',
    progress: 0,
    createdAt: '2025-02-01T00:00:00Z',
  },
];

// ─── BookCard ────────────────────────────────────────────

describe('BookCard', () => {
  it('renders book title and author', () => {
    render(<BookCard book={sampleBook} index={0} />);
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('renders cover image when coverUrl is present', () => {
    render(<BookCard book={sampleBook} index={0} />);
    const img = screen.getByAltText('Test Book');
    expect(img).toBeInTheDocument();
  });

  it('renders gradient fallback when no cover', () => {
    const book = { ...sampleBook, coverUrl: null };
    render(<BookCard book={book} index={0} />);
    // The title is in the gradient fallback
    const titles = screen.getAllByText('Test Book');
    expect(titles.length).toBeGreaterThanOrEqual(1);
  });

  it('shows progress percentage for epub books', () => {
    render(<BookCard book={sampleBook} index={0} />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('shows NEW badge when progress is 0', () => {
    const book = { ...sampleBook, progress: 0 };
    render(<BookCard book={book} index={0} />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('shows chapter count badge', () => {
    render(<BookCard book={sampleBook} index={0} />);
    expect(screen.getByText('5 ch')).toBeInTheDocument();
  });

  it('fires onClick callback', async () => {
    const onClick = vi.fn();
    render(<BookCard book={sampleBook} index={0} onClick={onClick} />);
    await userEvent.setup().click(screen.getByRole('listitem'));
    expect(onClick).toHaveBeenCalledWith(sampleBook);
  });

  it('has proper accessibility attributes', () => {
    render(<BookCard book={sampleBook} index={0} />);
    const item = screen.getByRole('listitem');
    expect(item).toHaveAttribute('aria-label', 'Test Book by Jane Doe');
    expect(item).toHaveAttribute('tabIndex', '0');
  });

  it('shows delete button when onDelete prop is provided', () => {
    const onDelete = vi.fn();
    render(<BookCard book={sampleBook} index={0} onDelete={onDelete} />);
    expect(screen.getByTitle('Delete Book')).toBeInTheDocument();
  });

  it('does not show delete button when onDelete is not provided', () => {
    render(<BookCard book={sampleBook} index={0} />);
    expect(screen.queryByTitle('Delete Book')).not.toBeInTheDocument();
  });

  it('shows edit button for md books when onEdit prop is provided', () => {
    const mdBook = { ...sampleBook, formatType: 'md' as const };
    const onEdit = vi.fn();
    render(<BookCard book={mdBook} index={0} onEdit={onEdit} />);
    expect(screen.getByTitle('Edit Book')).toBeInTheDocument();
  });

  it('does not show edit button for epub books even with onEdit', () => {
    const onEdit = vi.fn();
    render(<BookCard book={sampleBook} index={0} onEdit={onEdit} />);
    expect(screen.queryByTitle('Edit Book')).not.toBeInTheDocument();
  });
});

// ─── LibraryGrid ─────────────────────────────────────────

describe('LibraryGrid', () => {
  it('renders all books', () => {
    render(<LibraryGrid books={sampleBooks} />);
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    // "Markdown Guide" appears in both gradient fallback and title
    expect(screen.getAllByText('Markdown Guide').length).toBeGreaterThanOrEqual(1);
  });

  it('has grid aria-label', () => {
    render(<LibraryGrid books={sampleBooks} />);
    expect(screen.getByRole('list', { name: 'Book library grid' })).toBeInTheDocument();
  });

  it('renders empty when no books', () => {
    render(<LibraryGrid books={[]} />);
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('passes click handler to each card', async () => {
    const onBookClick = vi.fn();
    render(<LibraryGrid books={sampleBooks} onBookClick={onBookClick} />);

    await userEvent.setup().click(screen.getAllByRole('listitem')[0]);
    expect(onBookClick).toHaveBeenCalledWith(sampleBooks[0]);
  });
});

// ─── EmptyStates ─────────────────────────────────────────

describe('EmptyStates', () => {
  it('EmptyLibraryIllustration renders an SVG', () => {
    const { container } = render(<EmptyLibraryIllustration />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('NoResultsIllustration renders an SVG', () => {
    const { container } = render(<NoResultsIllustration />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('accepts className prop', () => {
    const { container } = render(<EmptyLibraryIllustration className="w-48" />);
    expect(container.querySelector('svg')).toHaveClass('w-48');
  });
});

// ─── Sidebar ─────────────────────────────────────────────

describe('Sidebar', () => {
  const counts = { all: 10, epub: 6, md: 4, reading: 3, finished: 2 };

  it('renders library filter items with counts', () => {
    render(<Sidebar isOpen={true} bookCounts={counts} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('renders format filter items', () => {
    render(<Sidebar isOpen={true} bookCounts={counts} />);
    expect(screen.getByText('EPUBs')).toBeInTheDocument();
    expect(screen.getByText('Markdown')).toBeInTheDocument();
  });

  it('calls onFilterChange when item is clicked', async () => {
    const onFilterChange = vi.fn();
    render(<Sidebar isOpen={true} bookCounts={counts} onFilterChange={onFilterChange} />);

    await userEvent.setup().click(screen.getByText('Finished'));
    expect(onFilterChange).toHaveBeenCalledWith('finished');
  });

  it('shows Admin login link in guest mode', () => {
    render(<Sidebar isOpen={true} bookCounts={counts} isAdmin={false} />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows Admin Mode badge and Sign Out when isAdmin', () => {
    render(<Sidebar isOpen={true} bookCounts={counts} isAdmin={true} />);
    expect(screen.getByText('Admin Mode')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('calls onLogout when Sign Out is clicked', async () => {
    const onLogout = vi.fn();
    render(<Sidebar isOpen={true} bookCounts={counts} isAdmin={true} onLogout={onLogout} />);
    await userEvent.setup().click(screen.getByText('Sign Out'));
    expect(onLogout).toHaveBeenCalled();
  });

  it('calls onAdminLogin when Admin link is clicked', async () => {
    const onAdminLogin = vi.fn();
    render(<Sidebar isOpen={true} bookCounts={counts} isAdmin={false} onAdminLogin={onAdminLogin} />);
    await userEvent.setup().click(screen.getByText('Admin'));
    expect(onAdminLogin).toHaveBeenCalled();
  });
});
