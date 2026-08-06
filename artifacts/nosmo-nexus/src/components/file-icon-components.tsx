import type { SVGProps } from "react";
import { FILE_ICON_SPRITE_DATA_URL } from "./file-icon-sprite-data";

export type FileFormat =
  | "pdf"
  | "docx"
  | "xlsx"
  | "pptx"
  | "gdoc"
  | "gsheet"
  | "gslides"
  | "onenote"
  | "outlook"
  | "vsdx"
  | "dwg"
  | "txt"
  | "rtf"
  | "mpp"
  | "zip"
  | "rar"
  | "7z"
  | "jpg"
  | "png"
  | "gif"
  | "mp4"
  | "mov"
  | "avi"
  | "mp3"
  | "wav"
  | "csv"
  | "xml"
  | "html"
  | "psd"
  | "file";

type SpriteCell = {
  column: 0 | 1 | 2 | 3 | 4 | 5;
  row: 0 | 1 | 2 | 3 | 4;
  label: string;
};

const CELLS: Record<FileFormat, SpriteCell> = {
  pdf: { column: 0, row: 0, label: "PDF" },
  docx: { column: 1, row: 0, label: "DOCX" },
  xlsx: { column: 2, row: 0, label: "XLSX" },
  pptx: { column: 3, row: 0, label: "PPTX" },
  gdoc: { column: 4, row: 0, label: "Google Docs" },
  gsheet: { column: 5, row: 0, label: "Google Sheets" },
  gslides: { column: 0, row: 1, label: "Google Slides" },
  onenote: { column: 1, row: 1, label: "OneNote" },
  outlook: { column: 2, row: 1, label: "Outlook" },
  vsdx: { column: 3, row: 1, label: "Visio" },
  dwg: { column: 4, row: 1, label: "DWG" },
  txt: { column: 5, row: 1, label: "TXT" },
  rtf: { column: 0, row: 2, label: "RTF" },
  mpp: { column: 1, row: 2, label: "Microsoft Project" },
  zip: { column: 2, row: 2, label: "ZIP" },
  rar: { column: 3, row: 2, label: "RAR" },
  "7z": { column: 4, row: 2, label: "7Z" },
  jpg: { column: 5, row: 2, label: "JPG" },
  png: { column: 0, row: 3, label: "PNG" },
  gif: { column: 1, row: 3, label: "GIF" },
  mp4: { column: 2, row: 3, label: "MP4" },
  mov: { column: 3, row: 3, label: "MOV" },
  avi: { column: 4, row: 3, label: "AVI" },
  mp3: { column: 5, row: 3, label: "MP3" },
  wav: { column: 0, row: 4, label: "WAV" },
  csv: { column: 1, row: 4, label: "CSV" },
  xml: { column: 2, row: 4, label: "XML" },
  html: { column: 3, row: 4, label: "HTML" },
  psd: { column: 4, row: 4, label: "PSD" },
  file: { column: 5, row: 4, label: "File" },
};

const ALIASES: Record<string, FileFormat> = {
  pdf: "pdf",
  doc: "docx",
  docx: "docx",
  word: "docx",
  xls: "xlsx",
  xlsx: "xlsx",
  excel: "xlsx",
  ppt: "pptx",
  pptx: "pptx",
  powerpoint: "pptx",
  gdoc: "gdoc",
  googledoc: "gdoc",
  googledocs: "gdoc",
  gsheet: "gsheet",
  gsheets: "gsheet",
  googlesheet: "gsheet",
  googlesheets: "gsheet",
  gslides: "gslides",
  googleslides: "gslides",
  one: "onenote",
  onenote: "onenote",
  msg: "outlook",
  eml: "outlook",
  outlook: "outlook",
  vsd: "vsdx",
  vsdx: "vsdx",
  visio: "vsdx",
  dwg: "dwg",
  dxf: "dwg",
  autocad: "dwg",
  txt: "txt",
  text: "txt",
  rtf: "rtf",
  mpp: "mpp",
  project: "mpp",
  zip: "zip",
  rar: "rar",
  "7z": "7z",
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  gif: "gif",
  mp4: "mp4",
  mov: "mov",
  quicktime: "mov",
  avi: "avi",
  mp3: "mp3",
  wav: "wav",
  csv: "csv",
  xml: "xml",
  html: "html",
  htm: "html",
  psd: "psd",
  photoshop: "psd",
  file: "file",
};

const MIME_FORMATS: Array<[string, FileFormat]> = [
  ["application/pdf", "pdf"],
  ["wordprocessingml", "docx"],
  ["msword", "docx"],
  ["spreadsheetml", "xlsx"],
  ["ms-excel", "xlsx"],
  ["presentationml", "pptx"],
  ["ms-powerpoint", "pptx"],
  ["text/csv", "csv"],
  ["text/rtf", "rtf"],
  ["text/plain", "txt"],
  ["text/html", "html"],
  ["application/xml", "xml"],
  ["text/xml", "xml"],
  ["application/zip", "zip"],
  ["application/x-rar", "rar"],
  ["application/x-7z", "7z"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/gif", "gif"],
  ["image/vnd.adobe.photoshop", "psd"],
  ["video/mp4", "mp4"],
  ["video/quicktime", "mov"],
  ["video/x-msvideo", "avi"],
  ["audio/mpeg", "mp3"],
  ["audio/wav", "wav"],
];

function isFileFormat(value: string): value is FileFormat {
  return value in CELLS;
}

export function resolveFileFormat(value = "", mimeType = ""): FileFormat {
  const mime = mimeType.toLowerCase();
  for (const [fragment, format] of MIME_FORMATS) {
    if (mime.includes(fragment)) return format;
  }

  const source = value.toLowerCase().replace(/[?#].*$/, "");
  const phrases: Array<[RegExp, FileFormat]> = [
    [/google\s*docs?/, "gdoc"],
    [/google\s*sheets?/, "gsheet"],
    [/google\s*slides?/, "gslides"],
    [/power\s*point/, "pptx"],
    [/one\s*note/, "onenote"],
    [/microsof?t\s*project/, "mpp"],
  ];
  for (const [pattern, format] of phrases) {
    if (pattern.test(source)) return format;
  }

  const tokens = source.split(/[^a-z0-9]+/).filter(Boolean).reverse();
  for (const token of tokens) {
    const match = ALIASES[token];
    if (match) return match;
  }
  return "file";
}

export type FileIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  format?: FileFormat | string;
  fileName?: string;
  mimeType?: string;
};

function SpriteFileIcon({ format, className, ...props }: SVGProps<SVGSVGElement> & { format: FileFormat }) {
  const cell = CELLS[format];
  return (
    <svg
      {...props}
      className={className}
      viewBox="0 0 60 60"
      role="img"
      aria-label={`${cell.label} file`}
      preserveAspectRatio="xMidYMid meet"
    >
      <image
        href={FILE_ICON_SPRITE_DATA_URL}
        width="360"
        height="300"
        x={-cell.column * 60}
        y={-cell.row * 60}
        preserveAspectRatio="none"
      />
    </svg>
  );
}

export function FileIcon({ format, fileName, mimeType, ...props }: FileIconProps) {
  const explicit = typeof format === "string" && isFileFormat(format) ? format : undefined;
  const resolved = explicit ?? resolveFileFormat(format || fileName || "", mimeType);
  return <SpriteFileIcon format={resolved} {...props} />;
}

function createFileIcon(format: FileFormat) {
  return function SpecificFileIcon(props: SVGProps<SVGSVGElement>) {
    return <SpriteFileIcon format={format} {...props} />;
  };
}

export const PdfFileIcon = createFileIcon("pdf");
export const DocxFileIcon = createFileIcon("docx");
export const XlsxFileIcon = createFileIcon("xlsx");
export const PptxFileIcon = createFileIcon("pptx");
export const GoogleDocsFileIcon = createFileIcon("gdoc");
export const GoogleSheetsFileIcon = createFileIcon("gsheet");
export const GoogleSlidesFileIcon = createFileIcon("gslides");
export const OneNoteFileIcon = createFileIcon("onenote");
export const OutlookFileIcon = createFileIcon("outlook");
export const VisioFileIcon = createFileIcon("vsdx");
export const DwgFileIcon = createFileIcon("dwg");
export const TxtFileIcon = createFileIcon("txt");
export const RtfFileIcon = createFileIcon("rtf");
export const MppFileIcon = createFileIcon("mpp");
export const ZipFileIcon = createFileIcon("zip");
export const RarFileIcon = createFileIcon("rar");
export const SevenZipFileIcon = createFileIcon("7z");
export const JpgFileIcon = createFileIcon("jpg");
export const PngFileIcon = createFileIcon("png");
export const GifFileIcon = createFileIcon("gif");
export const Mp4FileIcon = createFileIcon("mp4");
export const MovFileIcon = createFileIcon("mov");
export const AviFileIcon = createFileIcon("avi");
export const Mp3FileIcon = createFileIcon("mp3");
export const WavFileIcon = createFileIcon("wav");
export const CsvFileIcon = createFileIcon("csv");
export const XmlFileIcon = createFileIcon("xml");
export const HtmlFileIcon = createFileIcon("html");
export const PsdFileIcon = createFileIcon("psd");
export const GenericFileIcon = createFileIcon("file");

// Compatibility aliases used by older Nexus screens.
export const ImageFileIcon = JpgFileIcon;
export const VideoFileIcon = Mp4FileIcon;
