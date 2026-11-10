// Page numbers with gaps: 1 … 4 5 6 … 12. Always shows first, last and the pages around the current one.
function pageList(page, pages) {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...keep].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(`gap-${n}`);
    out.push(n);
  });
  return out;
}

export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pages">
      <button className="pager-btn pager-step" onClick={() => onChange(page - 1)} disabled={page === 1}>
        <span aria-hidden="true">←</span> Previous
      </button>
      <ol className="pager-list">
        {pageList(page, pages).map((n) =>
          typeof n === 'string' ? (
            <li key={n} className="pager-gap" aria-hidden="true">…</li>
          ) : (
            <li key={n}>
              <button
                className={`pager-btn pager-num ${n === page ? 'is-on' : ''}`}
                aria-current={n === page ? 'page' : undefined}
                aria-label={`Page ${n}`}
                onClick={() => onChange(n)}
              >
                {n}
              </button>
            </li>
          )
        )}
      </ol>
      <button className="pager-btn pager-step" onClick={() => onChange(page + 1)} disabled={page === pages}>
        Next <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}
