export function cleanMdContent(md = '') {
  return md
    .replace(/---[\s\S]*?---/g, '')                  // 1. Frontmatter
    .replace(/^\s*(import|export)\s+.*$/gm, '')      // 2. MDX import/export
    .replace(/<!--[\s\S]*?-->/g, '')                 // 3. HTML 注释
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')            // 4. JSX/MDX 注释
    .replace(/```[\s\S]*?```/g, '')                  // 5. 代码块
    .replace(/<[^>]+>/g, '')                         // 6. HTML/JSX 标签
    .replace(/`([^`]+)`/g, '$1')                     // 7. 行内代码
    .replace(/!\[.*?\]\(.*?\)/g, '')                 // 8. 图片
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')              // 9. 链接文本
    .replace(/[#*`_~>-]/g, ' ')                      // 10. Markdown 样式符
    .replace(/\s+/g, ' ')                            // 11. 压缩多余空格
    .trim();
}

export function buildSearchIndex() {
  let searchIndex = [];
  try {
    const rawMdModules = import.meta.glob(['/src/pages/**/*.{md,mdx}', '/src/content/**/*.{md,mdx}'], {
      query: '?raw',
      import: 'default',
      eager: true
    });

    const parsedMdModules = import.meta.glob(['/src/pages/**/*.{md,mdx}', '/src/content/**/*.{md,mdx}'], {
      eager: true
    });

    Object.keys(rawMdModules).forEach((filePath) => {
      if (
        filePath.includes('/albums/') ||
        filePath.includes('/friends') ||
        filePath.includes('/links')
      ) return;

      const rawContent = rawMdModules[filePath] || '';
      const parsedModule = parsedMdModules[filePath] || {};
      const fm = parsedModule.frontmatter || {};

      let collection = 'posts';
      let slug = '';

      if (filePath.includes('/src/content/')) {
        const relative = filePath.split('/src/content/')[1].replace(/\.(md|mdx)$/, '');
        const parts = relative.split('/');
        collection = parts[0];
        slug = fm.slug || parts.slice(1).join('/');
      } else if (filePath.includes('/src/pages/')) {
        const relative = filePath.split('/src/pages/')[1].replace(/\.(md|mdx)$/, '');
        const parts = relative.split('/');
        collection = parts[0];
        slug = parts.slice(1).join('/');
      }

      if (slug.endsWith('/index')) slug = slug.slice(0, -6);
      const cleanSlug = slug.replace(/^(music|moments)\//, '');

      const filename = filePath.split('/').pop()?.replace(/\.(md|mdx)$/, '') || '文档';
      const title = fm.title || fm.songTitle || filename;

      if (
        title === '友情链接' ||
        title === 'Friends' ||
        title === 'Links' ||
        fm.type === 'friends' ||
        collection === 'friends'
      ) return;

      let url = fm.permalink || fm.url || fm.link;

      if (!url) {
        if (collection === 'posts') {
          url = `/posts/${cleanSlug}`;
        } else if (collection === 'moments' || filePath.includes('/moments')) {
          url = cleanSlug ? `/moments#${cleanSlug}` : '/moments';
        } else if (collection === 'music' || filePath.includes('/music')) {
          url = cleanSlug ? `/music#${cleanSlug}` : '/music';
        } else {
          url = `/${collection}/${cleanSlug}`.replace(/\/+/g, '/');
        }
      }

      if (url && !url.startsWith('/')) url = '/' + url;

      let type = fm.type;
      if (!type) {
        if (filePath.includes('/music') || collection === 'music') type = '音乐';
        else if (filePath.includes('/moments') || collection === 'moments') type = '时刻';
        else if (filePath.includes('/notes') || collection === 'notes') type = '语阁';
        else type = '文章';
      }

      const extraSearchableText = [
        fm.artist || '',
        fm.album || '',
        fm.subtitle || '',
        fm.description || '',
        fm.excerpt || ''
      ].filter(Boolean).join(' ');

      searchIndex.push({
        title,
        url,
        type,
        tags: Array.isArray(fm.tags) ? fm.tags : [],
        content: cleanMdContent(rawContent) + ' ' + extraSearchableText,
        description: fm.description || fm.subtitle || fm.artist || '',
        rawId: cleanSlug || title
      });
    });
  } catch (e) {
    console.error('构建全文搜索索引失败:', e);
  }
  return searchIndex;
}
