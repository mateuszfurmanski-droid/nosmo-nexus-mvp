import type { SVGProps } from "react";

const SPRITE_PATH = "/assets/file-icons/nosmo-file-icons-sprite.png";

type FileIconProps = SVGProps<SVGSVGElement>;

type SpriteCell = {
  column: 0 | 1 | 2;
  row: 0 | 1 | 2;
  label: string;
};

function createFileIcon({ column, row, label }: SpriteCell) {
  return function FileIcon({ className, ...props }: FileIconProps) {
    return (
      <svg
        {...props}
        className={className}
        viewBox="0 0 64 64"
        role="img"
        aria-label={`${label} file`}
      >
        <image
          href={SPRITE_PATH}
          width="192"
          height="192"
          x={-column * 64}
          y={-row * 64}
          preserveAspectRatio="none"
        />
      </svg>
    );
  };
}

export const PdfFileIcon = createFileIcon({ column: 0, row: 0, label: "PDF" });
export const DocxFileIcon = createFileIcon({ column: 1, row: 0, label: "DOCX" });
export const XlsxFileIcon = createFileIcon({ column: 2, row: 0, label: "XLSX" });
export const PptxFileIcon = createFileIcon({ column: 0, row: 1, label: "PPTX" });
export const TxtFileIcon = createFileIcon({ column: 1, row: 1, label: "TXT" });
export const ZipFileIcon = createFileIcon({ column: 2, row: 1, label: "ZIP" });
export const ImageFileIcon = createFileIcon({ column: 0, row: 2, label: "Image" });
export const VideoFileIcon = createFileIcon({ column: 1, row: 2, label: "Video" });
export const CsvFileIcon = createFileIcon({ column: 2, row: 2, label: "CSV" });
