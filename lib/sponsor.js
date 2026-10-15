export function sponsorConfig() {
  const name = process.env.SPONSOR_NAME?.trim();
  const title = process.env.SPONSOR_TITLE?.trim();
  const text = process.env.SPONSOR_TEXT?.trim();
  let href;
  try {
    const url = new URL(process.env.SPONSOR_URL);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    href = url.href;
  } catch { return null; }
  if (!name || !title || !text) return null;
  return { name: name.slice(0, 80), title: title.slice(0, 120), text: text.slice(0, 300), href };
}
