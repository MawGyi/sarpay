/**
 * Natural Sort Utilities
 * 
 * Functions for sorting filenames naturally (e.g., Law 1, Law 2, ... Law 10, Law 11)
 * instead of lexicographically (Law 1, Law 10, Law 11, Law 2)
 */

/**
 * Extract numbers from a string for natural sorting
 */
function extractNumbers(str: string): (string | number)[] {
    const parts: (string | number)[] = [];
    const regex = /(\d+)|(\D+)/g;
    let match;

    while ((match = regex.exec(str)) !== null) {
        if (match[1]) {
            // It's a number
            parts.push(parseInt(match[1], 10));
        } else if (match[2]) {
            // It's a string
            parts.push(match[2]);
        }
    }

    return parts;
}

/**
 * Natural sort comparison function
 * Sorts strings with embedded numbers naturally
 * 
 * Examples:
 * - "Law 1.md", "Law 2.md", "Law 10.md" sorts correctly
 * - "Chapter 1", "Chapter 2", "Chapter 10" sorts correctly
 * - Handles mixed alphanumeric content
 * 
 * @param a First string to compare
 * @param b Second string to compare
 * @returns -1 if a < b, 1 if a > b, 0 if equal
 */
export function naturalSort(a: string, b: string): number {
    const aParts = extractNumbers(a.toLowerCase());
    const bParts = extractNumbers(b.toLowerCase());

    for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        const aPart = aParts[i];
        const bPart = bParts[i];

        if (typeof aPart === 'number' && typeof bPart === 'number') {
            if (aPart !== bPart) {
                return aPart - bPart;
            }
        } else if (typeof aPart === 'string' && typeof bPart === 'string') {
            if (aPart !== bPart) {
                return aPart.localeCompare(bPart);
            }
        } else {
            // Numbers come before strings
            return typeof aPart === 'number' ? -1 : 1;
        }
    }

    return aParts.length - bParts.length;
}

/**
 * Sort an array of files by their names using natural sort
 * @param files Array of File objects to sort
 * @returns Sorted array of files
 */
export function sortFilesByName(files: File[]): File[] {
    return [...files].sort((a, b) => naturalSort(a.name, b.name));
}
