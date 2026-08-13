import * as XLSX from 'xlsx';

/**
 * Reading a department's "Programs and Course Curriculum" spreadsheet.
 *
 * Shared by the import script and the admin screen, so a curriculum uploaded
 * through the panel is parsed exactly like one imported from the command line.
 * The alternative — two parsers — is two sets of quirks to keep in step, and
 * this file has quirks: see fillDown and MISSING_COURSES below.
 */

export type Course = {
  code: string;
  title: string;
  type: string;
  credits: number | null;
  prerequisite: string | null;
  remarks: string | null;
};

export type Semester = { name: string; courses: Course[] };

export type CreditRow = {
  semester: string;
  total: number | null;
  core: number | null;
  elective: number | null;
  lab: number | null;
  project: number | null;
  cumulative: number | null;
};

export type Curriculum = { semesters: Semester[]; creditRows: CreditRow[] };

export const COURSE_SHEET = 'Course_Structure';
export const CREDIT_SHEET = 'Credit_Distribution';

/**
 * Courses a department's sheet leaves out, keyed by degree code. Each is a row
 * the same workbook's credit distribution proves should be there — the two
 * sheets disagree, and this is which side wins.
 *
 * Corrections live in code rather than in the database so re-importing does not
 * silently undo them. Delete an entry once the department fixes its file.
 */
const MISSING_COURSES: Record<
  string,
  { semester: string; after: string; course: Course }[]
> = {
  'BSC-NAME': [
    {
      semester: '4th Year 1st Semester',
      after: 'NAME 4121',
      // Course_Structure sums this semester to 20 credits; Credit_Distribution
      // says 21.5 and reaches the programme's stated 161. Every other
      // four-credit theory course has a 1.5-credit sessional beside it;
      // Computational Fluid Dynamics was the only one without.
      course: {
        code: 'NAME 4122',
        title: 'Computational Fluid Dynamics Sessional',
        type: 'Core',
        credits: 1.5,
        prerequisite: null,
        remarks: 'Sessional',
      },
    },
  ],
};

/* Cells sometimes carry a hard line break from column-width wrapping in the
   spreadsheet ("Introduction to Fashion & Apparel\nIndustries") rather than
   an intentional paragraph break, so internal whitespace collapses to a
   single space alongside the trim. */
const text = (v: unknown): string => String(v ?? '').replace(/\s+/g, ' ').trim();

/**
 * Look up a column by prefix rather than an exact header string. Departments
 * word this column differently ("Course Type ", "Course Type (Core/Elective)",
 * trailing whitespace from a merged-cell copy/paste) and an exact-string miss
 * silently drops every course's type instead of failing loudly.
 */
function columnStartingWith(row: Record<string, unknown>, prefix: string): unknown {
  const key = Object.keys(row).find((k) => k.trim().toLowerCase().startsWith(prefix));
  return key ? row[key] : undefined;
}
const number = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/**
 * Some departments write the Semester column as a bare sequential number
 * ("1".."8"); others already spell it out ("4th Year 1st Semester" — the
 * established convention, a two-semesters-per-year programme). A bare
 * number is expanded to that same "Nth Year Mth Semester" form; anything
 * already wordy is left untouched.
 */
function normalizeSemesterName(value: string): string {
  if (!/^\d+$/.test(value)) return value;
  const n = Number(value);
  const year = Math.ceil(n / 2);
  const semInYear = n % 2 === 1 ? 1 : 2;
  return `${ordinal(year)} Year ${ordinal(semInYear)} Semester`;
}

function rowsOf(workbook: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(
      `The workbook has no "${sheetName}" sheet. It contains: ${workbook.SheetNames.join(', ')}.`,
    );
  }
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
}

/**
 * Carry a merged cell's value down the rows it spans.
 *
 * The semester name is written once per block and left empty beneath, which is
 * how a merged cell reads. Without this every course but the first in each
 * block lands under an empty semester.
 */
function fillDown(rows: Record<string, unknown>[], column: string): Record<string, unknown>[] {
  let last = '';
  for (const row of rows) {
    const value = text(row[column]);
    if (value) last = value;
    else row[column] = last;
  }
  return rows;
}

function buildSemesters(rows: Record<string, unknown>[]): Semester[] {
  const withSemester = fillDown(
    rows.filter((r) => text(r['Course Code'])),
    'Semester',
  );

  const order: string[] = [];
  const bySemester = new Map<string, Course[]>();

  for (const row of withSemester) {
    const name = normalizeSemesterName(text(row.Semester));
    if (!bySemester.has(name)) {
      bySemester.set(name, []);
      order.push(name);
    }
    bySemester.get(name)!.push({
      code: text(row['Course Code']),
      title: text(row['Course Title']),
      type: text(columnStartingWith(row, 'course type')),
      credits: number(row.Credits),
      prerequisite: text(row['Prerequisite (If any)']) || null,
      remarks: text(row.Remarks) || null,
    });
  }

  return order.map((name) => ({ name, courses: bySemester.get(name)! }));
}

function buildCreditRows(rows: Record<string, unknown>[]): CreditRow[] {
  return rows
    .filter((r) => text(r.Semester))
    .map((r) => ({
      semester: normalizeSemesterName(text(r.Semester)),
      total: number(r['Total Credits (Semester)']),
      core: number(r['Core Credits']),
      elective: number(r['Elective Credits']),
      lab: number(r['Lab Credits']),
      project: number(r['Project/Thesis Credits']),
      cumulative: number(r['Cumulative Credits']),
    }));
}

export function applyMissingCourses(semesters: Semester[], degreeCode: string): Semester[] {
  for (const { semester: name, after, course } of MISSING_COURSES[degreeCode.toUpperCase()] ?? []) {
    const semester = semesters.find((s) => s.name === name);
    if (!semester) continue;
    if (semester.courses.some((c) => c.code === course.code)) continue;

    const at = semester.courses.findIndex((c) => c.code === after);
    semester.courses.splice(at === -1 ? semester.courses.length : at + 1, 0, course);
  }
  return semesters;
}

/** Parse a curriculum workbook. Throws with a readable message on a bad file. */
export function parseCurriculumWorkbook(data: ArrayBuffer | Buffer, degreeCode: string): Curriculum {
  const workbook = XLSX.read(data, { type: 'buffer' });

  const semesters = applyMissingCourses(buildSemesters(rowsOf(workbook, COURSE_SHEET)), degreeCode);
  const creditRows = buildCreditRows(rowsOf(workbook, CREDIT_SHEET));

  if (semesters.length === 0) {
    throw new Error(`No courses found. The "${COURSE_SHEET}" sheet has no rows with a Course Code.`);
  }

  return { semesters, creditRows };
}

export function totalCourses(semesters: Semester[]): number {
  return semesters.reduce((n, s) => n + s.courses.length, 0);
}

export function totalCredits(semesters: Semester[]): number {
  return semesters.reduce(
    (n, s) => n + s.courses.reduce((m, c) => m + (c.credits ?? 0), 0),
    0,
  );
}
