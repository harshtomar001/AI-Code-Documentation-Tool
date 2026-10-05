import JSZip from "jszip";

/**
 * Clean and normalize a browser-provided relative path for ZIP inclusion.
 *
 * Removes absolute path components, normalizes slashes,
 * and rejects path traversal sequences (like "..").
 */
export function normalizeZipEntryPath(rawPath) {
  if (!rawPath || typeof rawPath !== "string") {
    return "";
  }

  // Normalize backslashes to forward slashes
  let path = rawPath.replace(/\\/g, "/");

  // Remove leading slashes and drive letters (e.g. C:/)
  path = path.replace(/^[a-zA-Z]:[\\/]+/, "");
  path = path.replace(/^\/+/, "");

  // Split into segments and filter out unsafe segments
  const parts = path.split("/").filter((part) => part && part !== ".");

  if (parts.some((part) => part === "..")) {
    throw new Error(`Unsafe path traversal detected in file: ${rawPath}`);
  }

  return parts.join("/");
}

/**
 * Convert a FileList or array of browser File objects into a ZIP File.
 *
 * Preserves relative directory structure using webkitRelativePath.
 *
 * @param {File[]|FileList} files - Browser File objects
 * @param {string} repositoryName - Name of the repository archive
 * @param {(percent: number) => void} [onProgress] - Optional progress callback
 * @returns {Promise<File>} - Resolves with a standard ZIP File object
 */
export async function createRepositoryZip(
  files,
  repositoryName = "repository",
  onProgress = null
) {
  const fileArray = Array.from(files || []);

  if (!fileArray.length) {
    throw new Error("No files selected or folder is empty.");
  }

  const zip = new JSZip();
  let validFileCount = 0;

  for (const file of fileArray) {
    const rawPath = file.webkitRelativePath || file.name;
    const entryPath = normalizeZipEntryPath(rawPath);

    if (!entryPath) {
      continue;
    }

    // JSZip handles File and Blob objects directly
    zip.file(entryPath, file);
    validFileCount++;
  }

  if (validFileCount === 0) {
    throw new Error("No valid files found to include in repository archive.");
  }

  const zipBlob = await zip.generateAsync(
    {
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (typeof onProgress === "function") {
        onProgress(Math.round(metadata.percent));
      }
    }
  );

  const cleanName = (repositoryName || "repository")
    .trim()
    .replace(/[^\w.-]/g, "_");

  return new File([zipBlob], `${cleanName}.zip`, {
    type: "application/zip",
  });
}
