export async function listCommentsForAdmin(env, pageKey) {
  const result = await env.DB.prepare(`
    SELECT id, page_key, nickname, content, created_at, visible
    FROM comments
    WHERE page_key = ?
    ORDER BY id DESC
    LIMIT 200
  `).bind(pageKey).all();

  return Array.isArray(result?.results) ? result.results : [];
}

export async function listCommentPageKeys(env) {
  const result = await env.DB.prepare(`
    SELECT DISTINCT page_key FROM comments ORDER BY page_key ASC LIMIT 200
  `).all();

  return Array.isArray(result?.results) ? result.results.map((row) => row.page_key) : [];
}

export async function setCommentVisibility(env, id, visible) {
  await env.DB.prepare(`
    UPDATE comments SET visible = ? WHERE id = ?
  `).bind(visible ? 1 : 0, id).run();
}
