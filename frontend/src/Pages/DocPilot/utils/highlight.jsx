const KEYWORDS = new Set([
  'def', 'class', 'return', 'if', 'else', 'elif', 'for', 'in', 'import', 'from', 'raise',
  'None', 'True', 'False', 'with', 'as', 'not', 'and', 'or', 'try', 'except', 'finally',
  'is', 'while', 'lambda', 'yield', 'pass', 'continue', 'break', 'self',
]);

const TOKEN =
  /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([A-Za-z_][A-Za-z0-9_]*)|(\d+(?:\.\d+)?)/g;

/** Tiny Python highlighter. Returns an array of React nodes. */
export function highlight(line) {
  const re = new RegExp(TOKEN.source, 'g');
  const out = [];
  let last = 0;
  let key = 0;
  let m;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    last = re.lastIndex;
    if (m[1]) out.push(<span key={key++} className="tk-cm">{m[1]}</span>);
    else if (m[2]) out.push(<span key={key++} className="tk-str">{m[2]}</span>);
    else if (m[3]) {
      if (KEYWORDS.has(m[3])) out.push(<span key={key++} className="tk-kw">{m[3]}</span>);
      else if (/\b(def|class)\s+$/.test(line.slice(0, m.index)))
        out.push(<span key={key++} className="tk-fn">{m[3]}</span>);
      else out.push(m[3]);
    } else out.push(<span key={key++} className="tk-num">{m[4]}</span>);
  }
  if (last < line.length) out.push(line.slice(last));
  return out.length ? out : ' ';
}
