export function formatFileSize(size) {
  if (!size || size <= 0) {
    return "";
  }

  if (size >= 1024 * 1024) {
    return `${(
      size / ( 1024 * 1024 )
    ).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${(
      size /
      (1024)
    ).toFixed(1)} KB`;
  }
  return `${size} B`;
}