const ENGINE_URL = '/engine/stockfish-18-lite-single.js';

const MATE_SCORE = 100000;
// If the engine hasn't produced a "bestmove" by this point (e.g. a UCI option
// changed mid-search confused it, or a message got dropped), give up waiting
// instead of hanging this engine's entire command queue forever.
const ANALYZE_TIMEOUT_MS = 20000;

/**
 * Thin wrapper around the Stockfish WASM worker.
 * Serializes analysis requests since the engine can only handle one "go" at a time.
 */
export class StockfishEngine {
  constructor() {
    this.worker = new Worker(ENGINE_URL);
    this.readyPromise = null;
    this.chain = Promise.resolve();
    this.worker.onmessage = (e) => this._onMessage(e.data);
    this._pending = null;
    this._multiPv = 1;
  }

  _onMessage(line) {
    if (this._pending) this._pending(line);
  }

  send(cmd) {
    this.worker.postMessage(cmd);
  }

  init() {
    if (this.readyPromise) return this.readyPromise;
    this.readyPromise = new Promise((resolve) => {
      this._pending = (line) => {
        if (line === 'uciok') {
          this.send('setoption name Threads value 1');
          this.send('isready');
        } else if (line === 'readyok') {
          this._pending = null;
          resolve();
        }
      };
      this.send('uci');
    });
    return this.readyPromise;
  }

  /**
   * Configure playing strength for this engine instance.
   * - elo === null/undefined -> full strength, no limit.
   * - elo >= 1320 -> native Stockfish UCI_LimitStrength/UCI_Elo (Stockfish's own floor).
   * - elo < 1320 -> engine is floored at 1320 internally; callers should combine this
   *   with analyzeMultiPv + weighted random selection (see lib/difficulty.js) to
   *   simulate weaker play, since Stockfish itself can't go below 1320.
   */
  setStrength(elo) {
    // Queued onto the same chain as analyze() calls, so this never lands in the
    // middle of an in-flight search - changing UCI options mid-"go" can confuse
    // Stockfish into never emitting "bestmove", hanging the queue forever.
    this.chain = this.chain.then(() => {
      if (elo == null) {
        this.send('setoption name UCI_LimitStrength value false');
        this.send('setoption name Skill Level value 20');
      } else {
        const clamped = Math.max(1320, Math.min(3190, elo));
        this.send('setoption name UCI_LimitStrength value true');
        this.send('setoption name UCI_Elo value ' + clamped);
      }
    });
  }

  _setMultiPv(n) {
    if (this._multiPv !== n) {
      this.send('setoption name MultiPV value ' + n);
      this._multiPv = n;
    }
  }

  _analyzeRaw(fen, { depth = 12, multiPv = 1 } = {}) {
    this.chain = this.chain.then(
      () =>
        new Promise((resolveOuter) => {
          this._setMultiPv(multiPv);
          const lines = new Map();
          let settled = false;

          const rankedLines = () =>
            Array.from(lines.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([rank, e]) => ({
                rank,
                cp: e.mate != null ? (e.mate > 0 ? MATE_SCORE - e.mate : -MATE_SCORE - e.mate) : (e.cp ?? 0),
                mate: e.mate ?? null,
                moveUci: e.pv?.[0] ?? null,
                pv: e.pv ?? [],
              }));

          const finish = (bestMoveUci) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            this._pending = null;
            resolveOuter({ bestMoveUci, lines: rankedLines() });
          };

          const timeoutId = setTimeout(() => {
            // Fall back to the best line found so far (or no move at all) rather
            // than blocking every future analyze()/analyzeMultiPv() call on this
            // engine instance indefinitely.
            finish(lines.get(1)?.pv?.[0] ?? null);
          }, ANALYZE_TIMEOUT_MS);

          this._pending = (line) => {
            const multipvMatch = line.match(/multipv (\d+)/);
            const idx = multipvMatch ? parseInt(multipvMatch[1], 10) : 1;
            const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
            const pvMatch = line.match(/ pv (.+)$/);

            if (scoreMatch) {
              const entry = lines.get(idx) || {};
              if (scoreMatch[1] === 'cp') {
                entry.cp = parseInt(scoreMatch[2], 10);
                entry.mate = null;
              } else {
                entry.mate = parseInt(scoreMatch[2], 10);
                entry.cp = null;
              }
              if (pvMatch) entry.pv = pvMatch[1].trim().split(/\s+/);
              lines.set(idx, entry);
            }

            const bestMoveMatch = line.match(/^bestmove (\S+)/);
            if (bestMoveMatch) {
              finish(bestMoveMatch[1] === '(none)' ? null : bestMoveMatch[1]);
            }
          };

          this.send('position fen ' + fen);
          this.send(`go depth ${depth}`);
        })
    );
    return this.chain;
  }

  /**
   * Analyze a FEN and resolve with the score converted to White's perspective
   * (positive = good for White), plus the engine's principal variation (PV)
   * so callers can show/explain a concrete continuation.
   */
  async analyze(fen, opts = {}) {
    const turn = fen.split(' ')[1];
    const sign = turn === 'b' ? -1 : 1;
    const raw = await this._analyzeRaw(fen, { ...opts, multiPv: 1 });
    const top = raw.lines.find((l) => l.rank === 1) ?? raw.lines[0];
    return {
      evalCp: (top?.cp ?? 0) * sign,
      mate: top?.mate != null ? top.mate * sign : null,
      bestMoveUci: raw.bestMoveUci,
      pvUci: top?.pv ?? [],
    };
  }

  /**
   * Analyze a FEN and resolve with the top N candidate moves (best first),
   * each with its score in White's perspective. Used to simulate weaker play
   * by picking a randomized, sub-optimal candidate.
   */
  async analyzeMultiPv(fen, { depth = 8, multiPv = 5 } = {}) {
    const turn = fen.split(' ')[1];
    const sign = turn === 'b' ? -1 : 1;
    const raw = await this._analyzeRaw(fen, { depth, multiPv });
    return raw.lines
      .filter((l) => l.moveUci)
      .sort((a, b) => a.rank - b.rank)
      .map((l) => ({
        rank: l.rank,
        evalCp: l.cp * sign,
        mate: l.mate != null ? l.mate * sign : null,
        moveUci: l.moveUci,
        pv: l.pv,
      }));
  }

  newGame() {
    // Also queued, so starting a new game while the previous search is still
    // in flight doesn't inject "ucinewgame" mid-search.
    this.chain = this.chain.then(() => {
      this.send('ucinewgame');
    });
  }

  terminate() {
    this.worker.terminate();
  }
}

export function formatEval(evalCp, mate) {
  if (mate !== null && mate !== undefined) {
    return mate > 0 ? `מט ב-${mate}` : `מט בעוד ${Math.abs(mate)} (יריב)`;
  }
  const pawns = (evalCp / 100).toFixed(2);
  return evalCp >= 0 ? `+${pawns}` : pawns;
}
