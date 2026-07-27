// A small curated set of opening repertoire lines to drill move-by-move, split
// by which color they're meant for. Each `moves` array is the full SAN sequence
// from the starting position (both sides) - the student is only quizzed on
// their own color's moves; the other side's moves auto-play as scripted "book"
// replies so the drill stays focused on memorizing the student's own choices.
export const REPERTOIRE_LINES = [
  {
    id: 'italian',
    name: 'פתיחה איטלקית',
    studentColor: 'w',
    description: 'פיתוח מהיר וקלאסי עם תקיפה על f7.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3'],
  },
  {
    id: 'ruy-lopez',
    name: 'פתיחה ספרדית (רואי לופז)',
    studentColor: 'w',
    description: 'לחץ ארוך טווח על הפרש ב-c6 והמרכז השחור.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O'],
  },
  {
    id: 'qgd',
    name: 'גמביט המלכה מסורב',
    studentColor: 'w',
    description: 'מבנה מוצק עם שליטה במרכז דרך d4/c4.',
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3'],
  },
  {
    id: 'sicilian-najdorf',
    name: 'הגנה סיציליאנית (נג׳דורף)',
    studentColor: 'b',
    description: 'משחק חד ואגרסיבי נגד e4, עם משחק נגד במרכז ובכנף המלכה.',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
  },
  {
    id: 'french',
    name: 'הגנה צרפתית',
    studentColor: 'b',
    description: 'מבנה חיילים איתן, עם משחק נגד על כנף המלכה.',
    moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e5', 'Nfd7'],
  },
  {
    id: 'caro-kann',
    name: 'הגנת קארו-קאן',
    studentColor: 'b',
    description: 'הגנה מוצקה שמפתחת את הרץ הלבן-משבצות לפני e6.',
    moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6'],
  },
];
