function stripMetaContentSecurityPolicy(html) {
  return html.replace(
    /\s*<meta\s+http-equiv=["']Content-Security-Policy["'][\s\S]*?>/i,
    '',
  );
}

module.exports = { stripMetaContentSecurityPolicy };
