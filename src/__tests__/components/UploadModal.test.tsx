import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Mocks ───────────────────────────────────────────────

const { mockUploadBook, mockUploadMultiple, mockParseEpub } = vi.hoisted(() => ({
  mockUploadBook: vi.fn(),
  mockUploadMultiple: vi.fn(),
  mockParseEpub: vi.fn(),
}));

vi.mock('@/lib/api/books', () => ({
  uploadBook: mockUploadBook,
  uploadMultipleBooks: mockUploadMultiple,
  uploadBookWithChapters: vi.fn(),
}));

vi.mock('@/lib/utils/epub-utils', () => ({
  parseEpub: mockParseEpub,
}));

// Mock framer-motion to remove animation delays
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: {
      div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
      button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
    },
  };
});

import { UploadModal } from '@/components/upload/UploadModal';

// ─── Helpers ─────────────────────────────────────────────

const onClose = vi.fn();
const onComplete = vi.fn();

function renderModal() {
  return render(<UploadModal onClose={onClose} onUploadComplete={onComplete} />);
}

function createFile(name: string, content = 'data', type = 'application/epub+zip'): File {
  return new File([content], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockParseEpub.mockResolvedValue({
    metadata: { title: 'Parsed Title', author: 'Parsed Author', description: '' },
    coverUrl: null,
    chapters: [],
  });
});

// ─── Idle state ──────────────────────────────────────────

describe('UploadModal — idle state', () => {
  it('renders the modal title', () => {
    renderModal();
    expect(screen.getByText('Upload Book')).toBeInTheDocument();
  });

  it('renders a drop zone with instructions', () => {
    renderModal();
    expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
  });

  it('shows Cancel and Upload buttons', () => {
    renderModal();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
  });

  it('Upload button is disabled when no file is selected', () => {
    renderModal();
    expect(screen.getByText('Upload')).toBeDisabled();
  });
});

// ─── File selection ──────────────────────────────────────

describe('UploadModal — file selection', () => {
  it('displays selected epub file and parses metadata', async () => {
    renderModal();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createFile('book.epub');

    await userEvent.setup().upload(input!,  file);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Parsed Title')).toBeInTheDocument();
    });
    expect(mockParseEpub).toHaveBeenCalledWith(file);
  });

  it('uses filename as title for non-epub files', async () => {
    renderModal();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createFile('notes.md', '# Hello', 'text/markdown');

    await userEvent.setup().upload(input!, file);

    await waitFor(() => {
      expect(screen.getByDisplayValue('notes')).toBeInTheDocument();
    });
  });

  it('shows file size in KB', async () => {
    renderModal();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createFile('book.epub', 'x'.repeat(2048));

    await userEvent.setup().upload(input!, file);

    await waitFor(() => {
      expect(screen.getByText(/KB/)).toBeInTheDocument();
    });
  });

  it('handles EPUB parse failure gracefully', async () => {
    mockParseEpub.mockRejectedValueOnce(new Error('corrupt'));

    renderModal();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createFile('bad.epub');

    await userEvent.setup().upload(input!, file);

    await waitFor(() => {
      // Falls back to filename as title
      expect(screen.getByDisplayValue('bad')).toBeInTheDocument();
    });
    // Shows error status message
    expect(screen.getByText(/failed to extract metadata/i)).toBeInTheDocument();
  });
});

// ─── Upload flow ─────────────────────────────────────────

describe('UploadModal — single file upload', () => {
  it('calls uploadBook and shows success state', async () => {
    mockUploadBook.mockImplementation(
      async (_f: File, _c: Blob | null, _m: unknown, _u: string | undefined, onProgress: (p: number) => void) => {
        onProgress(10);
        onProgress(50);
        onProgress(80);
        onProgress(100);
        return { book: { id: 'b1', title: 'Parsed Title' }, error: null };
      },
    );

    renderModal();

    // Select file
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.setup().upload(input!, createFile('book.epub'));

    // Wait for metadata parsing
    await waitFor(() => {
      expect(screen.getByDisplayValue('Parsed Title')).toBeInTheDocument();
    });

    // Click Upload
    await userEvent.setup().click(screen.getByText('Upload'));

    // Should show success
    await waitFor(() => {
      expect(screen.getByText('Upload Complete!')).toBeInTheDocument();
    });

    expect(mockUploadBook).toHaveBeenCalledWith(
      expect.any(File),
      null,
      expect.objectContaining({ title: 'Parsed Title' }),
      undefined,
      expect.any(Function),
    );
  });

  it('shows error state when upload fails', async () => {
    mockUploadBook.mockResolvedValueOnce({ book: null, error: new Error('quota exceeded') });

    renderModal();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.setup().upload(input!, createFile('book.epub'));

    await waitFor(() => expect(screen.getByDisplayValue('Parsed Title')).toBeInTheDocument());
    await userEvent.setup().click(screen.getByText('Upload'));

    await waitFor(() => {
      expect(screen.getByText('quota exceeded')).toBeInTheDocument();
    });
  });

  it('disables Upload when title is empty', async () => {
    mockParseEpub.mockResolvedValueOnce({
      metadata: { title: '', author: '', description: '' },
      coverUrl: null,
      chapters: [],
    });

    renderModal();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.setup().upload(input!, createFile('book.epub'));

    await waitFor(() => {
      expect(screen.getByText('Upload')).toBeDisabled();
    });
  });
});

// ─── Multi-file upload ──────────────────────────────────

describe('UploadModal — multi-file upload', () => {
  it('shows batch title when multiple files selected', async () => {
    renderModal();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [createFile('a.epub'), createFile('b.epub')];

    await userEvent.setup().upload(input!, files);

    await waitFor(() => {
      expect(screen.getByText('Upload 2 Books')).toBeInTheDocument();
    });
  });

  it('shows file count badge', async () => {
    renderModal();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.setup().upload(input!, [createFile('a.epub'), createFile('b.epub'), createFile('c.md')]);

    await waitFor(() => {
      expect(screen.getByText('3 files selected')).toBeInTheDocument();
    });
  });
});

// ─── File validation helpers ────────────────────────────

describe('UploadModal — format detection', () => {
  it('accepts .epub, .md, .markdown, .pdf via accept attribute', () => {
    renderModal();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input?.accept).toBe('.epub,.md,.markdown,.pdf');
  });
});

// ─── Close / Cancel ─────────────────────────────────────

describe('UploadModal — close', () => {
  it('calls onClose when Cancel is clicked', async () => {
    renderModal();
    await userEvent.setup().click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when X button is clicked', async () => {
    renderModal();
    // The X close button in the header
    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find(b => b.querySelector('svg'));
    if (xButton) {
      await userEvent.setup().click(xButton);
      expect(onClose).toHaveBeenCalled();
    }
  });
});
