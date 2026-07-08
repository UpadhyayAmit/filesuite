import type { MetadataRoute } from 'next';
import { ALL_TOOLS } from '@/components/tool-data';

const siteUrl = 'https://www.filesuite.dev';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/about`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/privacy`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${siteUrl}/terms-of-use`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
  ];

  const toolRoutes: MetadataRoute.Sitemap = ALL_TOOLS.filter((tool) => tool.status !== 'planned').map((tool) => ({
    url: `${siteUrl}/tools/${tool.slug}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: Math.max(0.5, Math.min(0.95, 1 - tool.priority / 100)),
  }));

  return [...staticRoutes, ...toolRoutes];
}
