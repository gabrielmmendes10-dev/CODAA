import test from "node:test";
import assert from "node:assert/strict";

test("Tutor pesquisa metadados científicos e devolve referências verificáveis", async () => {
  process.env.NODE_ENV = "fixture";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    assert.match(String(url), /api\.crossref\.org\/v1\/works/);
    return new Response(JSON.stringify({ message: { items: [{
      title: ["Teaching programming with worked examples"],
      author: [{ given: "Ana", family: "Silva" }],
      published: { "date-parts": [[2025]] },
      "container-title": ["Journal of Computing Education"],
      DOI: "10.1234/coda.2025.1",
      abstract: "<jats:p>Worked examples and guided practice support novice programming students.</jats:p>",
      "is-referenced-by-count": 7
    }] } }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const { answerChat } = await import(`../chat-service.mjs?fixture=${Date.now()}`);
    const answer = await answerChat({ message: "Pesquise artigos científicos sobre ensino de programação", mode: "research", context: {}, sources: [], history: [] });
    assert.equal(answer.provider, "local-research");
    assert.equal(answer.sources.length, 1);
    assert.equal(answer.sources[0].doi, "10.1234/coda.2025.1");
    assert.match(answer.sources[0].url, /^https:\/\/doi\.org\//);
    assert.match(answer.text, /Crossref|artigos de periódico/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
