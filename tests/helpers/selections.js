// Selections the tests work from.
//
// The page itself opens with no job chosen, on an example salary (DEFAULT_SELECTION).
// Most tests were written around a lecturer, so they start from this instead: an
// untouched selection of Lecturer, point 5 (€89,894). It is the real default with a
// job, grade and point filled in, so anything added to the default is carried along.

import { DEFAULT_SELECTION } from '../../site/js/selection.js';

export const LECTURER_EXAMPLE = Object.freeze({ ...DEFAULT_SELECTION, sector: 'tu', gradeId: 'lect', pointIndex: 4, typed: null });
