/**
 * Challan generation.
 *
 * steps.md: challans are "not stored [they are] generated which can be directly
 * share or download", the table shows "all the column that has value if any
 * column is empty or null it does not appear", the challan-no. column is
 * omitted because it is printed in the header, and there is no checkbox column.
 *
 * Layout follows the supplied reference: a boxed page with ISSUE/RECEIVE
 * CHALLAN over the company name, address and phone numbers, a rule, the party
 * block, another rule, the challan number (with the E-/H- trade letter) and
 * date, then the bordered table ending in a Total row, and the authorised
 * signature bottom right.
 */
import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { WORK_KINDS, serverAssetsDir } from '../config/constants.js';

const MARGIN = 34;
const SIGNATURE = path.join(serverAssetsDir, 'signature.png');

/**
 * Type scale for the printed challan, raised from the original 9-17pt set: it
 * read well on screen but came out small on paper in the hand. Every vertical
 * step below is sized against these, so spacing stays proportional if they move.
 */
const FONT = {
  heading: 16,
  company: 21,
  letterhead: 11.5,
  party: 12,
  table: 11,
  signature: 11,
};

const ROW_HEIGHT = 25;
const HEADER_HEIGHT = 36;

/** Gap from the Total rule down to the signature, and the signature block itself. */
const SIGN_GAP = 30;
const SIGN_BLOCK = 66;

/** What the Total row and everything under it needs, so the break can plan for it. */
const TAIL_HEIGHT = 4 + ROW_HEIGHT + SIGN_GAP + SIGN_BLOCK + 6;

/** Columns in print order; `value` returns '' when there is nothing to show. */
const COLUMNS = [
  { key: 'lotNo', label: 'Lot no.', width: 74, value: (r) => r.lotNo },
  { key: 'design', label: 'Design', width: 86, value: (r) => r.design },
  { key: 'fabric', label: 'Fabric', width: 74, value: (r) => r.fabric },
  { key: 'retailChallanNo', label: 'Retail challan', width: 84, value: (r) => r.retailChallanNo },
  { key: 'dupatta', label: 'Dupatta', width: 74, value: (r) => labelCase(r.dupatta) },
  { key: 'dupQty', label: 'Dup. Qty', width: 68, value: (r) => num(r.dupQty), align: 'right' },
  { key: 'quantity', label: 'Quantity', width: 72, value: (r) => num(r.quantity), align: 'right' },
  { key: 'damageLoss', label: 'Damage/Loss', width: 82, value: (r) => num(r.damageLoss), align: 'right' },
  // steps.md ordering: rate second to last, amount last.
  { key: 'rate', label: 'Rate', width: 56, value: (r) => num(r.rate), align: 'right' },
  { key: 'amount', label: 'Amount', width: 84, value: (r) => num(r.amount), align: 'right' },
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
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, layout: 'landscape' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = MARGIN + 14;
    const right = doc.page.width - MARGIN - 14;
    const width = right - left;

    // --- outer page border --------------------------------------------------
    pageBorder(doc);

    let y = MARGIN + 24;

    // --- letterhead ---------------------------------------------------------
    const heading = meta.direction === 'receive' ? 'RECEIVE CHALLAN' : 'ISSUE CHALLAN';
    doc.font('Helvetica-Bold').fontSize(FONT.heading).fillColor('#000000');
    doc.text(heading, left, y, { width, align: 'center' });

    y += 26;
    doc.font('Helvetica-Bold').fontSize(FONT.company);
    doc.text(meta.companyName || 'NEXA', left, y, { width, align: 'center' });

    if (meta.companyAddress) {
      y += 29;
      doc.font('Helvetica').fontSize(FONT.letterhead);
      doc.text(meta.companyAddress, left, y, { width, align: 'center' });
    }
    if (meta.companyPhone) {
      y += 17;
      doc.font('Helvetica').fontSize(FONT.letterhead);
      doc.text(meta.companyPhone, left, y, { width, align: 'center' });
    }

    y += 30;
    rule(doc, left, right, y);

    // --- party --------------------------------------------------------------
    y += 19;
    doc.font('Helvetica').fontSize(FONT.party);
    // Width-bounded like the address below. Left unbounded, pdfkit wraps at the
    // page margin - which is where the box border is drawn - so a long name ran
    // into the rule instead of stopping inside it.
    doc.text(`Party Name - ${meta.masterHead || ''}`, left, y, { width });
    y = Math.max(y + 19, doc.y);

    // Address left, phone right, on one line. The address is width-bounded to
    // stop a long one running into the number; if it wraps, the block below
    // moves down with it.
    const phone = meta.masterPhone ? `Phone - ${meta.masterPhone}` : '';
    const phoneWidth = phone ? doc.widthOfString(phone) + 12 : 0;

    doc.text(`Party Address - ${meta.masterAddress || ''}`, left, y, {
      width: width - phoneWidth,
    });
    const addressBottom = doc.y;

    if (phone) doc.text(phone, right - phoneWidth, y, { width: phoneWidth, align: 'right' });

    y = Math.max(y + 19, addressBottom);
    y += 5;
    rule(doc, left, right, y);

    // --- challan identity ---------------------------------------------------
    y += 19;
    doc.text(`Challan No. - ${meta.challanNo} (${tradeLetter(meta.kind)})`, left, y, { width });
    y += 19;
    doc.text(`Challan Date - ${formatDate(meta.date)}`, left, y, { width });

    y += 28;

    // --- table --------------------------------------------------------------
    const columns = visibleColumns(rows);
    const total = columns.reduce((sum, column) => sum + column.width, 0);
    const scale = width / total;
    const widths = columns.map((column) => column.width * scale);
    // Ruled horizontally only - no column separators and no box per row. The
    // rules sit under the header and around the Total, so the numbers carry the
    // structure rather than a grid.
    //
    // Cells wrap inside their column and the row takes the height of its
    // tallest one. With a fixed row height a value longer than its column was
    // drawn straight over the row below - easy to hit now the type is larger,
    // and it lost the very content the challan exists to carry.
    const CELL_PADDING = 12;

    const rowHeightFor = (cells, bold, minimum) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(FONT.table);
      return Math.max(
        minimum,
        ...cells.map(
          (cell, index) =>
            doc.heightOfString(String(cell ?? ''), { width: widths[index] - 10 }) + CELL_PADDING,
        ),
      );
    };

    const drawRow = (cells, { bold = false, height } = {}) => {
      const step = height ?? rowHeightFor(cells, bold, ROW_HEIGHT);
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(FONT.table).fillColor('#000000');

      let x = left;
      cells.forEach((cell, index) => {
        doc.text(String(cell ?? ''), x + 5, y + 7, {
          width: widths[index] - 10,
          align: columns[index].align ?? 'left',
        });
        x += widths[index];
      });

      y += step;
    };

    // Header: a rule above and below, labels allowed to wrap onto a second line
    // so a narrow column keeps its full name.
    const drawHeader = () => {
      const labels = columns.map((column) => column.label);
      rule(doc, left, right, y, 0.8);
      drawRow(labels, { bold: true, height: rowHeightFor(labels, true, HEADER_HEIGHT) });
      rule(doc, left, right, y, 0.8);
      y += 4;
    };

    drawHeader();

    // Rows used to run straight off the foot of the page. At the old type size
    // that was rare enough to go unnoticed; at this one a long challan reaches
    // the bottom, and a row drawn past it is simply lost.
    //
    // Rows fill the page to the border. The Total and signature that follow are
    // checked separately rather than reserved on every page, so a long challan
    // does not give up a row per page for a block that only lands on the last.
    const pageBottom = doc.page.height - MARGIN;

    const nextPage = () => {
      doc.addPage();
      pageBorder(doc);
      y = MARGIN + 24;
      drawHeader();
    };

    rows.forEach((row) => {
      const cells = columns.map((column) => column.value(row));
      const step = rowHeightFor(cells, false, ROW_HEIGHT);
      if (y + step > pageBottom - 12) nextPage();
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

    if (y + TAIL_HEIGHT > pageBottom) nextPage();

    y += 4;
    rule(doc, left, right, y, 0.8);
    drawRow(totalCells, { bold: true });
    rule(doc, left, right, y, 0.8);

    // --- signature ----------------------------------------------------------
    const signTop = y + SIGN_GAP;
    if (fs.existsSync(SIGNATURE)) {
      try {
        doc.image(SIGNATURE, right - 130, signTop, { fit: [120, 46] });
      } catch {
        // A malformed image must not stop the challan from being produced.
      }
    }

    doc.font('Helvetica-Bold').fontSize(FONT.signature).fillColor('#000000');
    doc.text('Authorised Signatory', right - 150, signTop + SIGN_BLOCK - 14, {
      width: 150,
      align: 'right',
    });

    doc.end();
  });
}

function pageBorder(doc) {
  doc
    .rect(MARGIN, MARGIN, doc.page.width - MARGIN * 2, doc.page.height - MARGIN * 2)
    .lineWidth(1.2)
    .stroke('#000000');
}

function rule(doc, left, right, y, lineWidth = 1) {
  doc.moveTo(left, y).lineTo(right, y).lineWidth(lineWidth).stroke('#000000');
}
