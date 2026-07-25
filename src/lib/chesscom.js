import { Chess } from 'chess.js';

const BASE = 'https://api.chess.com/pub/player';

async function fetchJson(url, errorLabel) {
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new Error(`${errorLabel}: לא ניתן היה להתחבר ל-Chess.com. בדוק את החיבור לאינטרנט ונסה שוב.`);
  }
  if (!res.ok) {
    if (res.status === 404) throw new Error('שם המשתמש לא נמצא ב-Chess.com.');
    throw new Error(`${errorLabel} (שגיאה ${res.status}).`);
  }
  return res.json();
}

export async function fetchArchives(username) {
  const data = await fetchJson(
    `${BASE}/${encodeURIComponent(username.trim().toLowerCase())}/games/archives`,
    'שגיאה בטעינת רשימת הארכיונים'
  );
  return data.archives || [];
}

export async function fetchGamesFromArchive(archiveUrl) {
  const data = await fetchJson(archiveUrl, 'שגיאה בטעינת המשחקים');
  return data.games || [];
}

/**
 * Fetches the most recent `maxGames` games for a username, newest first,
 * walking backwards through monthly archives until enough games are collected.
 */
export async function fetchRecentGames(username, maxGames = 20) {
  const archives = await fetchArchives(username);
  if (!archives.length) return [];

  const games = [];
  for (let i = archives.length - 1; i >= 0 && games.length < maxGames; i--) {
    const monthGames = await fetchGamesFromArchive(archives[i]);
    games.push(...monthGames.slice().reverse());
  }
  return games.slice(0, maxGames);
}

export function pgnToSanMoves(pgn) {
  const chess = new Chess();
  chess.loadPgn(pgn, { strict: false });
  return chess.history();
}

/**
 * Normalizes a raw Chess.com game object into the shape the UI/review pipeline needs,
 * including which color the given username played.
 */
export function describeGame(game, username) {
  const lower = username.trim().toLowerCase();
  const studentColor = game.white?.username?.toLowerCase() === lower ? 'w' : 'b';
  return {
    url: game.url,
    pgn: game.pgn,
    timeClass: game.time_class,
    endTime: game.end_time ? new Date(game.end_time * 1000) : null,
    white: { username: game.white?.username, rating: game.white?.rating, result: game.white?.result },
    black: { username: game.black?.username, rating: game.black?.rating, result: game.black?.result },
    studentColor,
  };
}
