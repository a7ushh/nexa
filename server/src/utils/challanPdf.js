/**
 * Challan generation.
 *
 * steps.md: challans are "not stored [they are] generated which can be directly
 * share or download", the table shows "all the column that has value if any
 * column is empty or null it does not appear", the challan-no. column is
 * omitted because it is printed in the header, and there is no checkbox column.
 *
 * Layout follows the supplied reference: a boxed challan with ISSUE/RECEIVE
 * CHALLAN over the company name, address and phone numbers, a rule, the party
 * and the challan number (with the E-/H- trade letter) and date, another rule,
 * then the table ending in a Total row, and the authorised signature bottom
 * right.
 */
import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { WORK_KINDS, serverAssetsDir } from '../config/constants.js';

const SIGNATURE = path.join(serverAssetsDir, 'signature.png');

/**
 * Half-page challan on an A4 portrait sheet.
 *
 * The page is A4 *portrait* because that is the paper in the printer, so the
 * browser's print dialog prints it at 100%. The earlier A4 landscape page was
 * shrunk to about 70% to fit that same portrait paper, which is why its type
 * came out small on paper however large it was set.
 *
 * The challan takes one half of the sheet - a "slot". It starts in the top half;
 * rows that run on continue in the bottom half, then the top of a new sheet. A
 * dashed line across the middle marks where to cut.
 */
const SLOT_INSET = 20; // sheet edge, or the cut line, to the challan's border
const PAD = 12; // border to content

const FONT = {
  heading: 14,
  company: 19,
  letterhead: 11,
  party: 12,
  table: 12,
  signature: 11,
};

const ROW_HEIGHT = 23;
const HEADER_HEIGHT = 26;
const CELL_TOP = 6; // row top to the text baseline box
const CELL_PAD = 11; // total vertical padding a wrapped cell adds to its text

const SIGN_IMAGE = [96, 32];
/** The gap under the Total row, the signature image, and its caption line. */
const SIGN_BLOCK = 8 + SIGN_IMAGE[1] + 16;
/** The Total row and everything under it, so a slot break can plan for it. */
const TAIL_HEIGHT = 4 + ROW_HEIGHT + SIGN_BLOCK;

/** Columns in print order; `value` returns '' when there is nothing to show. */
const COLUMNS = [
  { key: 'lotNo', label: 'Lot no.', width: 60, value: (r) => r.lotNo },
  { key: 'design', label: 'Design', width: 72, value: (r) => r.design },
  { key: 'fabric', label: 'Fabric', width: 70, value: (r) => r.fabric },
  { key: 'chart', label: 'Chart', width: 60, value: (r) => r.chart },
  { key: 'retailChallanNo', label: 'Retail challan', width: 70, value: (r) => r.retailChallanNo },
  { key: 'dupatta', label: 'Dupatta', width: 62, value: (r) => labelCase(r.dupatta) },
  { key: 'dupQty', label: 'Dup. Qty', width: 58, value: (r) => num(r.dupQty), align: 'right' },
  { key: 'quantity', label: 'Quantity', width: 64, value: (r) => num(r.quantity), align: 'right' },
  { key: 'damageLoss', label: 'Damage/ Loss', width: 62, value: (r) => num(r.damageLoss), align: 'right' },
  // steps.md ordering: rate second to last, amount last.
  { key: 'rate', label: 'Rate', width: 50, value: (r) => num(r.rate), align: 'right' },
  { key: 'amount', label: 'Amount', width: 78, value: (r) => num(r.amount), align: 'right' },
];

function labelCase(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function num(value) {
  if (value === null || value === undefined || value === '' || Number(value) === 0) return '';
  return Number(value).toLocaleString('en-IN');
}

function formatDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).slice(2)}`;
}

const money = (value) => Number(value || 0).toLocaleString('en-IN');

/** `(E)` for embroidery, `(H)` for handwork. */
export const tradeLetter = (kind) => (kind === WORK_KINDS.HANDWORK ? 'H' : 'E');

/** Filename stem, e.g. `E-10`. */
export const challanLabel = (kind, challanNo) => `${tradeLetter(kind)}-${challanNo}`;

/** Drops every column that is empty across all rows. */
const visibleColumns = (rows) =>
  COLUMNS.filter((column) => rows.some((row) => String(column.value(row) ?? '').length > 0));

export function renderChallan({ rows, meta }) {
  return new Promise((resolve, reject) => {
    // margin 0: every position below is explicit. With a margin, pdfkit would
    // add pages of its own accord at *its* bottom edge rather than at a slot's.
    const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 0 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const half = doc.page.height / 2;
    const left = SLOT_INSET + PAD;
    const right = pageWidth - SLOT_INSET - PAD;
    const width = right - left;

    const heading = meta.direction === 'receive' ? 'RECEIVE CHALLAN' : 'ISSUE CHALLAN';
    const challanRef = `${meta.challanNo} (${tradeLetter(meta.kind)})`;

    // --- slots --------------------------------------------------------------
    let slot;
    let y;

    const openSlot = (index) => {
      const top = index === 0 ? SLOT_INSET : half + SLOT_INSET;
      const bottom = index === 0 ? half - SLOT_INSET : doc.page.height - SLOT_INSET;
      slot = { index, bottom };
      doc
        .rect(SLOT_INSET, top, pageWidth - SLOT_INSET * 2, bottom - top)
        .lineWidth(1.2)
        .stroke('#000000');
      y = top + PAD;
    };

    const startSheet = () => {
      cutLine(doc, half, pageWidth);
      openSlot(0);
    };

    startSheet();

    // --- letterhead ---------------------------------------------------------
    doc.font('Helvetica-Bold').fontSize(FONT.heading).fillColor('#000000');
    doc.text(heading, left, y, { width, align: 'center' });

    y += 18;
    doc.font('Helvetica-Bold').fontSize(FONT.company);
    doc.text(meta.companyName || 'NEXA', left, y, { width, align: 'center' });
    y = doc.y + 2;

    doc.font('Helvetica').fontSize(FONT.letterhead);
    if (meta.companyAddress) {
      doc.text(meta.companyAddress, left, y, { width, align: 'center' });
      y = doc.y + 1;
    }
    if (meta.companyPhone) {
      doc.text(meta.companyPhone, left, y, { width, align: 'center' });
      y = doc.y + 1;
    }

    y += 5;
    rule(doc, left, right, y);

    // --- party (left) beside the challan identity (right) --------------------
    // Side by side rather than stacked: half a page has no height to spare, and
    // the challan number reads naturally at the top right. Each line is
    // width-bounded and the next starts where the last one ended, so a long
    // name or address wraps inside its column instead of running into the rule.
    const identityWidth = 150;
    const partyWidth = width - identityWidth - 14;
    const blockTop = y + 7;

    doc.font('Helvetica').fontSize(FONT.party);

    let partyY = blockTop;
    const partyLines = [
      `Party Name - ${meta.masterHead || ''}`,
      `Party Address - ${meta.masterAddress || ''}`,
      ...(meta.masterPhone ? [`Phone - ${meta.masterPhone}`] : []),
    ];
    for (const line of partyLines) {
      doc.text(line, left, partyY, { width: partyWidth });
      partyY = doc.y + 2;
    }

    const identityX = right - identityWidth;
    doc.text(`Challan No. - ${challanRef}`, identityX, blockTop, {
      width: identityWidth,
      align: 'right',
    });
    doc.text(`Date - ${formatDate(meta.date)}`, identityX, doc.y + 2, {
      width: identityWidth,
      align: 'right',
    });
    const identityY = doc.y + 2;

    y = Math.max(partyY, identityY) + 3;
    rule(doc, left, right, y);
    y += 6;

    // --- table --------------------------------------------------------------
    const columns = visibleColumns(rows);
    const total = columns.reduce((sum, column) => sum + column.width, 0);
    const scale = width / total;
    const widths = columns.map((column) => column.width * scale);

    // Ruled horizontally only - no column separators and no box per row. Cells
    // wrap inside their column and the row takes its tallest cell's height, so a
    // long value never overlaps the row below.
    const rowHeightFor = (cells, bold, minimum) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(FONT.table);
      return Math.max(
        minimum,
        ...cells.map(
          (cell, index) =>
            doc.heightOfString(String(cell ?? ''), { width: widths[index] - 8 }) + CELL_PAD,
        ),
      );
    };

    const drawRow = (cells, { bold = false, height } = {}) => {
      const step = height ?? rowHeightFor(cells, bold, ROW_HEIGHT);
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(FONT.table).fillColor('#000000');

      let x = left;
      cells.forEach((cell, index) => {
        doc.text(String(cell ?? ''), x + 4, y + CELL_TOP, {
          width: widths[index] - 8,
          align: columns[index].align ?? 'left',
        });
        x += widths[index];
      });

      y += step;
    };

    const drawHeader = () => {
      const labels = columns.map((column) => column.label);
      rule(doc, left, right, y, 0.8);
      drawRow(labels, { bold: true, height: rowHeightFor(labels, true, HEADER_HEIGHT) });
      rule(doc, left, right, y, 0.8);
      y += 4;
    };

    const limit = () => slot.bottom - PAD;

    // Top half, then bottom half, then a fresh sheet. A continuation repeats the
    // challan number so the half can still be matched up once the sheet is cut.
    const nextSlot = () => {
      if (slot.index === 0) {
        openSlot(1);
      } else {
        doc.addPage();
        startSheet();
      }
      doc.font('Helvetica-Bold').fontSize(FONT.party).fillColor('#000000');
      doc.text(`${heading} (continued) - Challan No. ${challanRef}`, left, y, { width });
      y = doc.y + 6;
      drawHeader();
    };

    drawHeader();

    rows.forEach((row) => {
      const cells = columns.map((column) => column.value(row));
      const step = rowHeightFor(cells, false, ROW_HEIGHT);
      if (y + step > limit()) nextSlot();
      drawRow(cells, { height: step });
    });

    // Totals for every numeric column that is on the page.
    const sum = (key) => rows.reduce((acc, row) => acc + Number(row[key] || 0), 0);
    const totalCells = columns.map((column, index) => {
      if (index === 0) return 'Total';
      if (['quantity', 'dupQty', 'amount', 'damageLoss'].includes(column.key)) {
        const value = sum(column.key);
        return value === 0 ? '' : money(value);
      }
      return '';
    });

    if (y + TAIL_HEIGHT > limit()) nextSlot();

    y += 3;
    rule(doc, left, right, y, 0.8);
    drawRow(totalCells, { bold: true });
    rule(doc, left, right, y, 0.8);

    // --- signature ----------------------------------------------------------
    const signTop = y + 8;
    if (fs.existsSync(SIGNATURE)) {
      try {
        doc.image(SIGNATURE, right - SIGN_IMAGE[0], signTop, { fit: SIGN_IMAGE, align: 'right' });
      } catch {
        // A malformed image must not stop the challan from being produced.
      }
    }

    doc.font('Helvetica-Bold').fontSize(FONT.signature).fillColor('#000000');
    doc.text('Authorised Signatory', right - 160, signTop + SIGN_IMAGE[1] + 2, {
      width: 160,
      align: 'right',
    });

    doc.end();
  });
}

/** A dashed line across the middle of the sheet, where the two halves are cut. */
function cutLine(doc, y, pageWidth) {
  doc
    .save()
    .moveTo(8, y)
    .lineTo(pageWidth - 8, y)
    .lineWidth(0.6)
    .dash(4, { space: 4 })
    .stroke('#9a9a9a')
    .undash()
    .restore();
}

function rule(doc, left, right, y, lineWidth = 1) {
  doc.moveTo(left, y).lineTo(right, y).lineWidth(lineWidth).stroke('#000000');
}
