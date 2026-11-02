// loads the sentiment model only when it's actually needed (it's ~330 KB)
let promise;
export function getScorer() {
  if (!promise) {
    promise = Promise.all([import("../../shared/sentiment.js"), import("../../shared/sentiment-model.js")]).then(([s, m]) => ({
      ...s.createScorer(m.default),
      info: m.default.info,
    }));
  }
  return promise;
}
