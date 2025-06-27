// Using a Map to store the file system.
// Files are stored with their content (string).
// Folders are stored with `null` as their value, and path ends with '/'.

const defaultJSCode = `// Welcome to AI Studio!
// You can write and execute JavaScript code.
// Use the AI tools in the panel on the right to boost your productivity.

function factorial(n) {
  if (n === 0) {
    return 1;
  }
  return n * factorial(n - 1);
}

const num = 5;
console.log(\`The factorial of \${num} is \${factorial(num)}\`);

// Try asking the AI to "create a new folder named 'utils'"
// or "delete the 'docs' folder".
`;

const fileStore = new Map<string, string | null>([
    ['script.js', defaultJSCode],
    ['docs/', null],
    ['docs/README.md', '# Documentation\n\nThis is a sample documentation file.'],
]);

function ensureDirectoryExists(path: string) {
    let currentPath = '';
    path.split('/').slice(0, -1).forEach(part => {
        if (part) {
            currentPath += part + '/';
            if (!fileStore.has(currentPath)) {
                fileStore.set(currentPath, null);
            }
        }
    });
}

export function saveFile(path: string, content: string): void {
  ensureDirectoryExists(path);
  fileStore.set(path, content);
}

export function readFile(path: string): string | undefined {
  const content = fileStore.get(path);
  return typeof content === 'string' ? content : undefined;
}

export function deleteFile(path: string): void {
  if (fileStore.has(path) && fileStore.get(path) !== null) {
      fileStore.delete(path);
  }
}

export function createFolder(path: string): void {
    const aPath = path.endsWith('/') ? path : `${path}/`;
    ensureDirectoryExists(aPath);
    if (!fileStore.has(aPath)) {
        fileStore.set(aPath, null);
    }
}

export function deleteFolder(path: string): void {
    const aPath = path.endsWith('/') ? path : `${path}/`;
    const keysToDelete = Array.from(fileStore.keys()).filter(key => key.startsWith(aPath));
    keysToDelete.forEach(key => fileStore.delete(key));
}

export function deletePath(path: string): void {
    if (fileStore.get(path) === null) { // It's a folder
        deleteFolder(path);
    } else { // It's a file
        deleteFile(path);
    }
}

export function listFiles(): string[] {
  return Array.from(fileStore.keys());
}

export function getAllFilesAsObject(): Record<string, string | null> {
    return Object.fromEntries(fileStore);
}

export function replaceFileSystem(files: Record<string, string | null>): void {
    fileStore.clear();
    for (const [path, content] of Object.entries(files)) {
        fileStore.set(path, content);
    }
}
