const TIME_CLASS_BY_SPEED = {
  ultraBullet: 'ultraBullet',
  bullet: 'bullet',
  blitz: 'blitz',
  rapid: 'rapid',
  classical: 'classical',
  correspondence: 'correspondence',
};

function splitPgnGames(pgnText) {
  return pgnText
    .split(/\n(?=\[Event )/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parsePgnHeaders(pgn) {
  const headers = {};
  const re = /\[(\w+)\s+"([^"]*)"\]/g;
  let m;
  while ((m = re.exec(pgn))) headers[m[1]] = m[2];
  return headers;
}

export async function fetchLichessGames(username, max = 20) {
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(username.trim())}?max=${max}&moves=true`;
  let res;
  try {
    res = await fetch(url, { headers: { Accept: 'application/x-chess-pgn' } });
  } catch {
    throw new Error('לא ניתן היה להתחבר ל-Lichess. בדוק את החיבור לאינטרנט ונסה שוב.');
  }
  if (!res.ok) {
    if (res.status === 404) throw new Error('שם המשתמש לא נמצא ב-Lichess.');
    throw new Error(`שגיאה בטעינת המשחקים מ-Lichess (שגיאה ${res.status}).`);
  }
  const text = await res.text();
  return splitPgnGames(text);
}

export function describeLichessGame(pgn, username) {
  const headers = parsePgnHeaders(pgn);
  const lower = username.trim().toLowerCase();
  const studentColor = (headers.White || '').toLowerCase() === lower ? 'w' : 'b';
  const endTime =
    headers.UTCDate && headers.UTCTime ? new Date(`${headers.UTCDate.replace(/\./g, '-')}T${headers.UTCTime}Z`) : null;
  return {
    url: headers.Site || '',
    pgn,
    timeClass: TIME_CLASS_BY_SPEED[headers.Speed] || headers.Speed || headers.Event || '',
    endTime,
    white: { username: headers.White, rating: Number(headers.WhiteElo) || null },
    black: { username: headers.Black, rating: Number(headers.BlackElo) || null },
    studentColor,
  };
}
