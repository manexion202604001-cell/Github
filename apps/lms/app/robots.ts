import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: ['/', '/faq', '/verify/', '/terms', '/privacy', '/login'], disallow: ['/dashboard', '/courses', '/qa', '/community', '/office-hours', '/ranking', '/badges', '/certificates', '/members', '/notifications', '/settings', '/admin', '/api'] }],
  }
}
