import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

export function renderPageMarkdownToSafeHtml(markdown: string): string {
  const raw = md.render(markdown || '')
  return sanitizeHtml(raw, {
    allowedTags: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'blockquote',
      'ul',
      'ol',
      'li',
      'strong',
      'em',
      'code',
      'pre',
      'hr',
      'a',
      'img',
      'br',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'nofollow noopener noreferrer',
        target: '_blank',
      }),
    },
  })
}
