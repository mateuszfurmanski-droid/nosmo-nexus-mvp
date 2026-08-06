import { useId, type ReactNode, type SVGProps } from "react";

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

type FormatStyle = {
  label: string;
  primary: string;
  dark: string;
};

const FILE_FORMATS: Record<FileFormat, FormatStyle> = {
  pdf: { label: "PDF", primary: "#ef1717", dark: "#9d0808" },
  docx: { label: "DOCX", primary: "#1972d2", dark: "#0b3e86" },
  xlsx: { label: "XLSX", primary: "#2ca52f", dark: "#0d641d" },
  pptx: { label: "PPTX", primary: "#f06416", dark: "#b43a09" },
  gdoc: { label: "GDOC", primary: "#4285f4", dark: "#1c55aa" },
  gsheet: { label: "GSHEET", primary: "#24a853", dark: "#117437" },
  gslides: { label: "GSLIDES", primary: "#f4b400", dark: "#b57900" },
  onenote: { label: "ONENOTE", primary: "#843fba", dark: "#532477" },
  outlook: { label: "OUTLOOK", primary: "#1473e6", dark: "#084b9c" },
  vsdx: { label: "VSDX", primary: "#2868cb", dark: "#123f8d" },
  dwg: { label: "DWG", primary: "#e31d1d", dark: "#981010" },
  txt: { label: "TXT", primary: "#626b79", dark: "#343b47" },
  rtf: { label: "RTF", primary: "#626b79", dark: "#343b47" },
  mpp: { label: "MPP", primary: "#7139aa", dark: "#44206f" },
  zip: { label: "ZIP", primary: "#f2b313", dark: "#b57600" },
  rar: { label: "RAR", primary: "#2868c6", dark: "#143d82" },
  "7z": { label: "7Z", primary: "#ef6c00", dark: "#a83e00" },
  jpg: { label: "JPG", primary: "#e32323", dark: "#991010" },
  png: { label: "PNG", primary: "#43a938", dark: "#1f6f1b" },
  gif: { label: "GIF", primary: "#7a3db0", dark: "#4b2176" },
  mp4: { label: "MP4", primary: "#214d88", dark: "#102b52" },
  mov: { label: "MOV", primary: "#7442ad", dark: "#472271" },
  avi: { label: "AVI", primary: "#ef6a12", dark: "#a73d05" },
  mp3: { label: "MP3", primary: "#1f78d5", dark: "#0e488e" },
  wav: { label: "WAV", primary: "#d92727", dark: "#8f1212" },
  csv: { label: "CSV", primary: "#2a9d3e", dark: "#126524" },
  xml: { label: "XML", primary: "#2c78d3", dark: "#164788" },
  html: { label: "HTML", primary: "#525b68", dark: "#2d333c" },
  psd: { label: "PSD", primary: "#2176c7", dark: "#10447d" },
  file: { label: "FILE", primary: "#6f7784", dark: "#383f49" },
};

const FORMAT_ALIASES: Record<string, FileFormat> = {
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
  return value in FILE_FORMATS;
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
    const match = FORMAT_ALIASES[token];
    if (match) return match;
  }
  return "file";
}

export type FileIconProps = SVGProps<SVGSVGElement> & {
  format?: FileFormat | string;
  fileName?: string;
  mimeType?: string;
};

function Glyph({ format, colour }: { format: FileFormat; colour: string }) {
  const text = (value: string, size = 18, x = 32, y = 31) => (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill={colour} fontSize={size} fontWeight="900" fontFamily="Arial, sans-serif">
      {value}
    </text>
  );

  if (["docx", "gdoc", "txt", "rtf"].includes(format)) {
    return (
      <g stroke={colour} strokeWidth="2.2" strokeLinecap="round">
        {format === "docx" && text("W", 17, 25, 29)}
        {format === "rtf" && text("RTF", 9, 31, 25)}
        {format === "gdoc" && <rect x="22" y="17" width="20" height="22" rx="3" fill={colour} opacity=".13" stroke={colour} />}
        <path d={format === "docx" ? "M36 22h9M36 28h9M36 34h7" : "M21 23h22M21 29h18M21 35h14"} />
      </g>
    );
  }

  if (["xlsx", "gsheet", "csv"].includes(format)) {
    return (
      <g stroke={colour} strokeWidth="1.5">
        <rect x="19" y="17" width="26" height="22" rx="2" fill={colour} opacity=".08" />
        <path d="M19 24h26M19 31h26M27 17v22M36 17v22" />
        {format === "xlsx" && text("X", 17, 38, 31)}
        {format === "csv" && <path d="M42 31v9m0 0-4-4m4 4 4-4" strokeWidth="2.4" />}
      </g>
    );
  }

  if (["pptx", "gslides"].includes(format)) {
    return (
      <g stroke={colour} strokeWidth="2">
        <rect x="19" y="17" width="26" height="22" rx="2.5" fill={colour} opacity=".08" />
        {format === "pptx" ? (
          <>
            {text("P", 18, 26, 29)}
            <circle cx="38" cy="27" r="5" fill="none" />
            <path d="M38 22v5h5" />
          </>
        ) : (
          <rect x="24" y="22" width="16" height="11" rx="1.5" fill="none" />
        )}
      </g>
    );
  }

  if (format === "pdf") {
    return <path d="M22 36c8-12 10-21 8-22-2-1-3 8 0 16 4 9 12 9 14 6 2-4-9-5-18 0-5 3-8 7-6 8 3 2 11-8 14-15" fill="none" stroke={colour} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />;
  }

  if (format === "onenote") return text("N", 22);
  if (format === "dwg") return text("A", 24);
  if (format === "psd") return text("Ps", 17);
  if (format === "7z") return text("7z", 18);
  if (format === "gif") return text("GIF", 12);

  if (format === "outlook") {
    return (
      <g stroke={colour} strokeWidth="2">
        <rect x="20" y="20" width="25" height="17" rx="2" fill="none" />
        <path d="m21 22 11 8 12-8" />
        {text("O", 15, 23, 28)}
      </g>
    );
  }

  if (format === "vsdx") {
    return (
      <g stroke={colour} strokeWidth="2" fill="none">
        <path d="M22 20h8v8h-8zM36 28h8v8h-8zM28 24h8M40 28v-5" />
        {text("V", 14, 27, 34)}
      </g>
    );
  }

  if (format === "mpp") {
    return <g fill={colour}><rect x="20" y="20" width="9" height="6" rx="1" /><rect x="35" y="20" width="9" height="6" rx="1" /><rect x="27" y="32" width="10" height="6" rx="1" /><path d="M29 23h6M32 23v9" stroke={colour} strokeWidth="2" /></g>;
  }

  if (format === "zip") {
    return <g fill={colour}><rect x="29" y="16" width="6" height="4" rx="1" /><rect x="32" y="20" width="6" height="4" rx="1" /><rect x="29" y="24" width="6" height="4" rx="1" /><rect x="32" y="28" width="6" height="4" rx="1" /><path d="M31 32h6v7h-6z" /></g>;
  }

  if (format === "rar") {
    return <g><rect x="20" y="18" width="24" height="7" rx="2" fill="#7652b8" /><rect x="20" y="25" width="24" height="7" rx="2" fill="#cf3f68" /><rect x="20" y="32" width="24" height="7" rx="2" fill="#35a56a" /><rect x="29" y="17" width="6" height="23" rx="1" fill="#d8b24b" /></g>;
  }

  if (["jpg", "png"].includes(format)) {
    return (
      <g stroke={colour} strokeWidth="2" fill="none">
        {format === "png" && <path d="M20 18h5v5h-5zM25 23h5v5h-5z" opacity=".35" />}
        <rect x="19" y="17" width="26" height="22" rx="2.5" />
        <circle cx="37" cy="23" r="2" fill={colour} />
        <path d="m21 36 7-8 5 5 4-4 6 7" />
      </g>
    );
  }

  if (["mp4", "mov", "avi"].includes(format)) {
    return (
      <g stroke={colour} strokeWidth="2" fill="none">
        {format === "avi" && <rect x="19" y="18" width="26" height="20" rx="2" />}
        {format === "avi" && <path d="M23 18v4M29 18v4M35 18v4M41 18v4M23 34v4M29 34v4M35 34v4M41 34v4" />}
        {format === "mov" && <circle cx="32" cy="28" r="11" />}
        <path d="m29 22 10 6-10 6z" fill={colour} stroke="none" />
      </g>
    );
  }

  if (format === "mp3") {
    return <g fill={colour}><path d="M30 18v15a5 5 0 1 1-3-4.6V21l15-3v12a5 5 0 1 1-3-4.6V16z" /></g>;
  }

  if (format === "wav") {
    return <g stroke={colour} strokeWidth="2.2" strokeLinecap="round"><path d="M19 28h3m2-6v12m3-17v22m3-15v8m3-12v16m3-20v24m3-15v10m3-7h3" /></g>;
  }

  if (["xml", "html"].includes(format)) {
    return <g stroke={colour} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"><path d="m26 21-7 7 7 7M38 21l7 7-7 7M35 18l-6 20" /></g>;
  }

  return <g stroke={colour} strokeWidth="2" strokeLinecap="round"><path d="M22 23h20M22 29h17M22 35h13" /></g>;
}

export function FileIcon({ format, fileName, mimeType, className, ...props }: FileIconProps) {
  const requested = typeof format === "string" ? format.toLowerCase() : "";
  const resolved = requested && isFileFormat(requested)
    ? requested
    : resolveFileFormat(fileName || requested, mimeType);
  const style = FILE_FORMATS[resolved];
  const rawId = useId().replace(/:/g, "");
  const pageGradient = `file-page-${rawId}`;
  const ribbonGradient = `file-ribbon-${rawId}`;
  const shadow = `file-shadow-${rawId}`;
  const labelSize = style.label.length > 6 ? 5.2 : style.label.length > 4 ? 6.2 : 7.5;

  return (
    <svg
      {...props}
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`${style.label} file`}
    >
      <defs>
        <linearGradient id={pageGradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={style.primary} />
          <stop offset=".58" stopColor={style.primary} />
          <stop offset="1" stopColor={style.dark} />
        </linearGradient>
        <linearGradient id={ribbonGradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={style.primary} />
          <stop offset="1" stopColor={style.dark} />
        </linearGradient>
        <filter id={shadow} x="-30%" y="-25%" width="160%" height="170%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.2" floodColor="#000" floodOpacity=".48" />
        </filter>
      </defs>

      <g filter={`url(#${shadow})`}>
        <path d="M10 5h34l10 10v37H10z" fill={`url(#${pageGradient})`} stroke={style.dark} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M15 10h26l8 8v27H15z" fill="#f9fbfd" stroke="#ffffff" strokeWidth=".8" />
        <path d="M41 10v10h9" fill={style.primary} stroke={style.dark} strokeWidth="1" strokeLinejoin="round" />
        <path d="M11 6h31l-3 3H14v32h-3z" fill="#fff" opacity=".19" />
        <Glyph format={resolved} colour={style.dark} />
        <path d="M7 42h50v15H7z" fill={`url(#${ribbonGradient})`} stroke={style.dark} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M8 43h48v3H8z" fill="#fff" opacity=".13" />
      </g>
      <text
        x="32"
        y="52.2"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={labelSize}
        fontWeight="900"
        fontFamily="Arial, sans-serif"
        letterSpacing="-.15"
        stroke="#000"
        strokeOpacity=".25"
        strokeWidth=".65"
        paintOrder="stroke"
      >
        {style.label}
      </text>
    </svg>
  );
}

type StaticFileIconProps = SVGProps<SVGSVGElement>;

function createFileIcon(format: FileFormat) {
  return function StaticFileIcon(props: StaticFileIconProps) {
    return <FileIcon {...props} format={format} />;
  };
}

export const PdfFileIcon = createFileIcon("pdf");
export const DocxFileIcon = createFileIcon("docx");
export const XlsxFileIcon = createFileIcon("xlsx");
export const PptxFileIcon = createFileIcon("pptx");
export const GdocFileIcon = createFileIcon("gdoc");
export const GsheetFileIcon = createFileIcon("gsheet");
export const GslidesFileIcon = createFileIcon("gslides");
export const OnenoteFileIcon = createFileIcon("onenote");
export const OutlookFileIcon = createFileIcon("outlook");
export const VsdxFileIcon = createFileIcon("vsdx");
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

// Compatibility aliases used by older Nexus components.
export const ImageFileIcon = JpgFileIcon;
export const VideoFileIcon = Mp4FileIcon;
