import { useEffect } from 'react';
import type { SeoRoute } from './SeoHead';

/**
 * JSON-LD Schema component for SEO and AI bot optimization
 * Injects structured data into the <head> of the document
 */
export const Schema = ({ route }: { route: SeoRoute }) => {
  useEffect(() => {
    // Remove existing schema if present
    const existingSchema = document.getElementById('tokenclub-schema');
    if (existingSchema) {
      existingSchema.remove();
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tokenclub.fun';
    const canonicalPath =
      route.kind === 'comparison'
        ? '/comparison'
        : route.kind === 'blog'
          ? `/blog/${route.slug}`
          : route.kind === 'app'
            ? route.tab === 'swap'
              ? '/swap'
              : route.tab === 'liquidity'
                ? '/liquidity'
                : route.tab === 'management'
                  ? '/security'
                  : route.tab === 'portfolio'
                    ? '/portfolio'
                    : route.tab === 'more'
                      ? '/more'
                      : '/'
            : '/';

    const canonicalUrl = `${origin}${canonicalPath}`;
    const logoUrl = `${origin}/logo.svg`;

    const organization = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'TokenClub',
      url: origin,
      logo: logoUrl,
      sameAs: ['https://t.me/tokenlab00'],
    };

    const website = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'TokenClub',
      url: origin,
    };

    const softwareApplication = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'TokenClub - Solana Token Creator',
      applicationCategory: 'FinanceApplication',
      applicationSubCategory: 'Cryptocurrency Tools',
      operatingSystem: 'Solana Blockchain',
      offers: {
        '@type': 'Offer',
        price: '0.1',
        priceCurrency: 'SOL',
        availability: 'https://schema.org/InStock',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '127',
        bestRating: '5',
        worstRating: '1',
      },
      description:
        'Create fully compliant SPL tokens on Solana with zero coding. Features include meme coin generation, authority revocation, liquidity pool management, and swap functionality.',
      url: canonicalUrl,
      featureList: ['Meme Coin Generator', 'Revoke Authority', 'OpenBook Market ID', 'Volume Bot'],
      screenshot: logoUrl,
      softwareVersion: '3.5',
      browserRequirements: 'Requires JavaScript. Requires Solana wallet extension.',
      permissions: 'Wallet connection for transaction signing',
    };

    const schemas: any[] = [organization, website, softwareApplication];

    if (route.kind === 'comparison') {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Smithii vs TokenClub: The Cheapest Solana Token Creator (2025)',
        description:
          'Comparison of TokenClub, Smithii, and Orion Tools pricing and features to identify the Economical Solana Token Launchpad.',
        url: canonicalUrl,
        author: { '@type': 'Organization', name: 'TokenClub' },
        publisher: { '@type': 'Organization', name: 'TokenClub', logo: { '@type': 'ImageObject', url: logoUrl } },
      });
    }

    if (route.kind === 'blog') {
      const post = route.post;
      if (post) {
        schemas.push({
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.metaDescription,
          url: canonicalUrl,
          author: { '@type': 'Organization', name: 'TokenClub' },
          publisher: { '@type': 'Organization', name: 'TokenClub', logo: { '@type': 'ImageObject', url: logoUrl } },
          image: `${origin}/og-image.png`,
          mainEntityOfPage: canonicalUrl,
        });
      }
    }

    // Create and inject script tag
    const script = document.createElement('script');
    script.id = 'tokenclub-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schemas, null, 2);
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      const schemaToRemove = document.getElementById('tokenclub-schema');
      if (schemaToRemove) {
        schemaToRemove.remove();
      }
    };
  }, [route]);

  return null; // This component doesn't render anything
};

