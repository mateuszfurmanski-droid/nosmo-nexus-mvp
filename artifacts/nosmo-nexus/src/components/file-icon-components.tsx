import type { SVGProps } from "react";

export type FileFormat =
  | "pdf" | "docx" | "xlsx" | "pptx" | "gdoc" | "gsheet" | "gslides"
  | "onenote" | "outlook" | "vsdx" | "dwg" | "txt" | "rtf" | "mpp"
  | "zip" | "rar" | "7z" | "jpg" | "png" | "gif" | "mp4" | "mov"
  | "avi" | "mp3" | "wav" | "csv" | "xml" | "html" | "psd" | "file";

const LABELS: Record<FileFormat, string> = {
  pdf: "PDF", docx: "DOCX", xlsx: "XLSX", pptx: "PPTX",
  gdoc: "Google Docs", gsheet: "Google Sheets", gslides: "Google Slides",
  onenote: "OneNote", outlook: "Outlook", vsdx: "Visio", dwg: "DWG",
  txt: "TXT", rtf: "RTF", mpp: "Microsoft Project", zip: "ZIP", rar: "RAR",
  "7z": "7Z", jpg: "JPG", png: "PNG", gif: "GIF", mp4: "MP4", mov: "MOV",
  avi: "AVI", mp3: "MP3", wav: "WAV", csv: "CSV", xml: "XML", html: "HTML",
  psd: "PSD", file: "File",
};

const ALIASES: Record<string, FileFormat> = {
  pdf: "pdf", doc: "docx", docx: "docx", word: "docx",
  xls: "xlsx", xlsx: "xlsx", excel: "xlsx",
  ppt: "pptx", pptx: "pptx", powerpoint: "pptx",
  gdoc: "gdoc", googledoc: "gdoc", googledocs: "gdoc",
  gsheet: "gsheet", gsheets: "gsheet", googlesheet: "gsheet", googlesheets: "gsheet",
  gslides: "gslides", googleslides: "gslides",
  one: "onenote", onenote: "onenote", msg: "outlook", eml: "outlook", outlook: "outlook",
  vsd: "vsdx", vsdx: "vsdx", visio: "vsdx", dwg: "dwg", dxf: "dwg", autocad: "dwg",
  txt: "txt", text: "txt", rtf: "rtf", mpp: "mpp", project: "mpp",
  zip: "zip", rar: "rar", "7z": "7z", jpg: "jpg", jpeg: "jpg", png: "png", gif: "gif",
  mp4: "mp4", mov: "mov", quicktime: "mov", avi: "avi", mp3: "mp3", wav: "wav",
  csv: "csv", xml: "xml", html: "html", htm: "html", psd: "psd", photoshop: "psd", file: "file",
};

const MIME_FORMATS: Array<[string, FileFormat]> = [
  ["application/pdf", "pdf"], ["wordprocessingml", "docx"], ["msword", "docx"],
  ["spreadsheetml", "xlsx"], ["ms-excel", "xlsx"],
  ["presentationml", "pptx"], ["ms-powerpoint", "pptx"],
  ["text/csv", "csv"], ["text/rtf", "rtf"], ["text/plain", "txt"],
  ["text/html", "html"], ["application/xml", "xml"], ["text/xml", "xml"],
  ["application/zip", "zip"], ["application/x-rar", "rar"], ["application/x-7z", "7z"],
  ["image/jpeg", "jpg"], ["image/png", "png"], ["image/gif", "gif"],
  ["image/vnd.adobe.photoshop", "psd"], ["video/mp4", "mp4"],
  ["video/quicktime", "mov"], ["video/x-msvideo", "avi"],
  ["audio/mpeg", "mp3"], ["audio/wav", "wav"],
];

const NODE_ICON_CSS = `
  [data-node] svg[data-nosmo-file-icon] {
    width: 64px !important;
    height: 64px !important;
    min-width: 64px !important;
    min-height: 64px !important;
    display: block !important;
    overflow: visible !important;
    filter: drop-shadow(0 8px 12px rgba(0,0,0,.48));
  }

  [data-node] span.h-28 svg[data-nosmo-file-icon] {
    width: 90px !important;
    height: 90px !important;
    min-width: 90px !important;
    min-height: 90px !important;
    filter: drop-shadow(0 11px 16px rgba(0,0,0,.52));
  }
`;

function isFileFormat(value: string): value is FileFormat {
  return value in LABELS;
}

export function resolveFileFormat(value = "", mimeType = ""): FileFormat {
  const mime = mimeType.toLowerCase();
  for (const [fragment, format] of MIME_FORMATS) if (mime.includes(fragment)) return format;

  const source = value.toLowerCase().replace(/[?#].*$/, "");
  const phrases: Array<[RegExp, FileFormat]> = [
    [/google\s*docs?/, "gdoc"], [/google\s*sheets?/, "gsheet"],
    [/google\s*slides?/, "gslides"], [/power\s*point/, "pptx"],
    [/one\s*note/, "onenote"], [/microsof?t\s*project/, "mpp"],
  ];
  for (const [pattern, format] of phrases) if (pattern.test(source)) return format;
  for (const token of source.split(/[^a-z0-9]+/).filter(Boolean).reverse()) {
    const match = ALIASES[token];
    if (match) return match;
  }
  return "file";
}

export type FileIconProps = Omit<SVGProps<SVGSVGElement>, "children" | "format"> & {
  format?: FileFormat | string;
  fileName?: string;
  mimeType?: string;
};

const ASSET_BASE = `${import.meta.env.BASE_URL}assets/file-icons/`;
const ICON_SHEET_URL = `${ASSET_BASE}approved-file-icons.webp`;
const DIRECT_FORMATS = new Set<FileFormat>(["pdf", "xlsx"]);

const CELLS: Record<FileFormat, readonly [number, number]> = {
  pdf: [0, 0], docx: [1, 0], xlsx: [2, 0], pptx: [3, 0], gdoc: [4, 0], gsheet: [5, 0],
  gslides: [0, 1], onenote: [1, 1], outlook: [2, 1], vsdx: [3, 1], dwg: [4, 1], txt: [5, 1],
  rtf: [0, 2], mpp: [1, 2], zip: [2, 2], rar: [3, 2], "7z": [4, 2], jpg: [5, 2],
  png: [0, 3], gif: [1, 3], mp4: [2, 3], mov: [3, 3], avi: [4, 3], mp3: [5, 3],
  wav: [0, 4], csv: [1, 4], xml: [2, 4], html: [3, 4], psd: [4, 4], file: [5, 4],
};

function AssetFileIcon({ format, className, ...props }: Omit<SVGProps<SVGSVGElement>, "format"> & { format: FileFormat }) {
  const [column, row] = CELLS[format];
  const direct = DIRECT_FORMATS.has(format);
  return (
    <>
      <style>{NODE_ICON_CSS}</style>
      <svg
        {...props}
        data-nosmo-file-icon={format}
        className={className}
        viewBox="0 0 96 96"
        role="img"
        aria-label={`${LABELS[format]} file`}
        preserveAspectRatio="xMidYMid meet"
      >
        {direct ? (
          <image href={`${ASSET_BASE}${format}.webp`} width="96" height="96" preserveAspectRatio="xMidYMid meet" />
        ) : (
          <image
            href={ICON_SHEET_URL}
            width="576"
            height="480"
            x={-column * 96}
            y={-row * 96}
            preserveAspectRatio="none"
          />
        )}
      </svg>
    </>
  );
}

export function FileIcon({ format, fileName, mimeType, ...props }: FileIconProps) {
  const explicit = typeof format === "string" && isFileFormat(format) ? format : undefined;
  return <AssetFileIcon format={explicit ?? resolveFileFormat(format || fileName || "", mimeType)} {...props} />;
}

function createFileIcon(format: FileFormat) {
  return function SpecificFileIcon(props: Omit<SVGProps<SVGSVGElement>, "format">) {
    return <AssetFileIcon format={format} {...props} />;
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
export const ImageFileIcon = JpgFileIcon;
export const VideoFileIcon = Mp4FileIcon;
