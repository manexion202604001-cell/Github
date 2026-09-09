import { describe, expect, it } from 'vitest'
import { extractYouTubeId, youtubeEmbedUrl } from '@/lib/youtube'

describe('extractYouTubeId', () => {
  const id = 'dQw4w9WgXcQ'
  it('各種 URL 形式', () => {
    expect(extractYouTubeId(`https://www.youtube.com/watch?v=${id}`)).toBe(id)
    expect(extractYouTubeId(`https://youtube.com/watch?v=${id}&t=30s`)).toBe(id)
    expect(extractYouTubeId(`https://youtu.be/${id}?si=abc`)).toBe(id)
    expect(extractYouTubeId(`https://www.youtube.com/embed/${id}`)).toBe(id)
    expect(extractYouTubeId(`https://www.youtube.com/live/${id}?feature=share`)).toBe(id)
    expect(extractYouTubeId(`https://m.youtube.com/shorts/${id}`)).toBe(id)
    expect(extractYouTubeId(`https://www.youtube-nocookie.com/embed/${id}`)).toBe(id)
    expect(extractYouTubeId(`youtu.be/${id}`)).toBe(id)
  })
  it('生の ID', () => {
    expect(extractYouTubeId(id)).toBe(id)
    expect(extractYouTubeId(`  ${id}  `)).toBe(id)
  })
  it('無効な入力は null', () => {
    expect(extractYouTubeId(null)).toBeNull()
    expect(extractYouTubeId('')).toBeNull()
    expect(extractYouTubeId('https://example.com/watch?v=' + id)).toBeNull()
    expect(extractYouTubeId('https://www.youtube.com/watch?v=short')).toBeNull()
    expect(extractYouTubeId('https://zoom.us/j/123456')).toBeNull()
    expect(extractYouTubeId('not a url')).toBeNull()
  })
  it('youtubeEmbedUrl は nocookie ドメイン', () => {
    expect(youtubeEmbedUrl(id)).toBe(`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`)
  })
})
