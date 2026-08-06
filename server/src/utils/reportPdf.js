/**
 * Report PDF: the five stacked sections from the Report page, each with its own
 * total row, rendered in the same boxed letterhead style as the challan.
 *
 * Like the challan it is generated on demand and never stored.
 */
import PDFDocument from 'pdfkit';

const MARGIN = 34;

const GREY_COLUMNS = [
  { key: 'lot_no', label: 'Lot no.', width: 70 },
  { key: 'date', label: 'Date', width: 64, format: 'date' },
  { key: 'master_head', label: 'Master Head', width: 96 },
  { key: 'fabric', label: 'Fabric', width: 72 },
  { key: 'chart', label: 'Chart', width: 72 },
  { key: 'cut', label: 'Cut', width: 50 },
  { key: 'quantity', label: 'Quantity', width: 70, align: 'right', total: true },
  { key: 'dupatta', label: 'Dupatta', width: 66 },
  { key: 'bottom', label: 'Bottom', width: 56 },
];

const CHALLAN_COLUMNS = [
  { key: 'date', label: 'Date', width: 64, format: 'date' },
  { key: 'lot_no', label: 'Lot no.', width: 66 },
  { key: 'challan_no', label: 'Challan no.', width: 72 },
  { key: 'master_head', label: 'Master Head', width: 96 },
  { key: 'fabric', label: 'Fabric', width: 72 },
  { key: 'design', label: 'Design', width: 78 },
  { key: 'quantity', label: 'Quantity', width: 66, align: 'right' },
  { key: 'rate', label: 'Rate', width: 54, align: 'right' },
  { key: 'amount', label: 'Amount', width: 78, align: 'right', total: true },
];

function formatDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${String(date.getFullYear()).slice(2)}`;
}

const money = (value) => Number(value || 0).toLocaleString('en-IN');

function cell(row, column) {
  const raw = row[column.key];
  if (raw === null || raw === undefined || raw === '') return '';
  if (column.format === 'date') return formatDate(raw);
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
  if (typeof raw === 'number') return raw.toLocaleString('en-IN');
  return String(raw);
}

/** Describes the filters in one human-readable line for the header. */
function describeFilters(filters = {}) {
  const parts = [];
  if (filters.lotNo) parts.push(`Lot ${filters.lotNo}`);
  if (filters.challanNo) parts.push(`Challan ${filters.challanNo}`);
  if (filters.masterHead) parts.push(`Master ${filters.masterHead}`);
  if (filters.fabric) parts.push(`Fabric ${filters.fabric}`);
  if (filters.dateFrom || filters.dateTo) {
    parts.push(`${formatDate(filters.dateFrom) || '…'} to ${formatDate(filters.dateTo) || '…'}`);
  }
  return parts.length ? parts.join('  ·  ') : 'All records';
}

export function renderReport({ report, meta }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, layout: 'landscape' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = MARGIN + 14;
    const right = doc.page.width - MARGIN - 14;
    const width = right - left;
    const bottomLimit = doc.page.height - MARGIN - 30;

    // --- letterhead ---------------------------------------------------------
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#000000');
    doc.text('REPORT', left, MARGIN + 18, { width, align: 'center' });

    doc.font('Helvetica-Bold').fontSize(16);
    doc.text(meta.companyName || 'GARG', left, MARGIN + 38, { width, align: 'center' });

    doc.font('Helvetica').fontSize(9);
    doc.text(describeFilters(meta.filters), left, MARGIN + 60, { width, align: 'center' });
    doc.text(`Generated ${formatDate(new Date())}`, left, MARGIN + 74, {
      width,
      align: 'center',
    });

    let y = MARGIN + 96;

    const newPage = () => {
      doc.addPage();
      y = MARGIN + 20;
    };

    for (const section of report.sections) {
      const columns = section.key === 'grey' ? GREY_COLUMNS : CHALLAN_COLUMNS;
      const total = columns.reduce((sum, column) => sum + column.width, 0);
      const scale = width / total;
      const widths = columns.map((column) => column.width * scale);
      const rowHeight = 20;

      if (y + rowHeight * 3 > bottomLimit) newPage();

      // section title
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
      doc.text(`${section.title}  (${section.rows.length})`, left, y);
      y += 18;

      const drawRow = (cells, { bold = false, fill = null } = {}) => {
        if (y + rowHeight > bottomLimit) newPage();
        if (fill) doc.rect(left, y, width, rowHeight).fill(fill);

        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor('#000000');

        let x = left;
        cells.forEach((text, index) => {
          doc.text(String(text ?? ''), x + 4, y + 6, {
            width: widths[index] - 8,
            align: columns[index].align ?? 'left',
            lineBreak: false,
          });
          if (index > 0) doc.moveTo(x, y).lineTo(x, y + rowHeight).lineWidth(0.5).stroke('#000000');
          x += widths[index];
        });

        doc.rect(left, y, width, rowHeight).lineWidth(0.5).stroke('#000000');
        y += rowHeight;
      };

      drawRow(columns.map((column) => column.label), { bold: true, fill: '#efefef' });

      if (section.rows.length === 0) {
        drawRow(columns.map((_, index) => (index === 0 ? 'No rows' : '')));
      } else {
        section.rows.forEach((row) => drawRow(columns.map((column) => cell(row, column))));
      }

      // "with a last row add as total- in each table"
      drawRow(
        columns.map((column, index) => {
          if (column.total) return money(section.total);
          if (index === 0) return 'Total';
          return '';
        }),
        { bold: true, fill: '#f6f6f6' },
      );

      y += 18;
    }

    if (y + 26 > bottomLimit) newPage();
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text(`Grand total  ${money(report.grandTotal)}`, left, y + 6, {
      width,
      align: 'right',
    });

    doc.end();
  });
}
