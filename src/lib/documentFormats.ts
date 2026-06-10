// Multi-format upload support: helpers shared by the New Document wizard and tests.
// Non-PDF Office formats are converted to PDF by the `convert-to-pdf` edge function
// (Gotenberg/LibreOffice backend) before entering the existing PDF signing pipeline.

export const ACCEPTED_OFFICE_FORMATS = [
  ".docx", ".doc", ".odt", ".rtf",
  ".xlsx", ".xls", ".ods",
  ".pptx", ".ppt", ".odp",
  ".txt", ".csv",
];

export const OFFICE_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
  "application/vnd.oasis.opendocument.text", // .odt
  "application/rtf", "text/rtf", // .rtf
  "text/plain", // .txt
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "application/vnd.oasis.opendocument.spreadsheet", // .ods
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.oasis.opendocument.presentation", // .odp
  "text/csv", // .csv
];

const OFFICE_EXTS = ["docx", "doc", "odt", "rtf", "xlsx", "xls", "ods", "pptx", "ppt", "odp", "txt", "csv"];

/**
 * Returns the lowercase extension (without dot) if the file is a supported
 * non-PDF Office format, or null otherwise (PDF or unsupported).
 */
export function getOriginalFormat(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return OFFICE_EXTS.includes(ext) ? ext : null;
}
