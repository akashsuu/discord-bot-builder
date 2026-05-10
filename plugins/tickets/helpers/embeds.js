'use strict';

function applyTemplate(str, vars = {}) {
  return String(str || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function parseColor(value, fallback = 0x5865F2) {
  const num = parseInt(String(value || '').replace('#', ''), 16);
  return Number.isNaN(num) ? fallback : num;
}

function applyCommonEmbedOptions(embed, data = {}, vars = {}) {
  const footer = applyTemplate(data.embedFooter || '', vars);
  const logoName = applyTemplate(data.logoName || '', vars);
  const logoUrl = data.logoUrl || '';
  const imageUrl = data.imageUrl || data.embedImage || '';
  const thumbUrl = data.embedThumbnail || '';

  if (logoName || logoUrl) {
    embed.setAuthor({
      name: logoName || ' ',
      iconURL: logoUrl || undefined,
    });
  }
  if (footer) embed.setFooter({ text: String(footer).slice(0, 2048) });
  if (thumbUrl) embed.setThumbnail(String(thumbUrl));
  if (imageUrl) embed.setImage(String(imageUrl));
  return embed;
}

module.exports = {
  applyCommonEmbedOptions,
  applyTemplate,
  parseColor,
};
