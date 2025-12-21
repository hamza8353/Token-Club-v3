import { useEffect } from 'react';
import type { BlogPostContent } from '../content/blog';

type TabId = 'create' | 'swap' | 'liquidity' | 'management' | 'remove' | 'portfolio' | 'more';

export type SeoRoute =
  | { kind: 'app'; tab: TabId }
  | { kind: 'comparison' }
  | { kind: 'blog'; post: BlogPostContent | null; slug: string };

const OG_IMAGE_PATH = '/og-image.png';

function upsertMetaByName(name: string, content: string) {
  let el = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertMetaByProperty(property: string, content: string) {
  let el = document.head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLinkCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function getTabSeo(tab: TabId) {
  switch (tab) {
    case 'swap':
      return {
        title: 'TokenClub Swap — TokenClub',
        description:
          'Swap tokens on Solana with TokenClub Swap. Fast routing, transparent fees, and a clean interface built for Solana traders.',
        path: '/swap',
      };
    case 'liquidity':
      return {
        title: 'Liquidity Manager — TokenClub',
        description:
          'Create, add, remove, lock, and claim fees on Solana liquidity pools with TokenClub Liquidity Manager.',
        path: '/liquidity',
      };
    case 'management':
      return {
        title: 'Security & Burn — TokenClub',
        description:
          'Revoke authorities, clean up wallet accounts, and manage security operations on Solana with TokenClub.',
        path: '/security',
      };
    case 'portfolio':
      return {
        title: 'My Portfolio — TokenClub',
        description: 'View balances and holdings across Solana tokens with TokenClub Portfolio.',
        path: '/portfolio',
      };
    case 'more':
      return {
        title: 'More Tools — TokenClub',
        description:
          'Explore additional Solana tools by TokenClub including volume and promotion utilities (and more coming soon).',
        path: '/more',
      };
    case 'remove':
      return {
        title: 'Remove/Burn — TokenClub',
        description: 'Burn tokens and perform cleanup operations on Solana with TokenClub.',
        path: '/remove',
      };
    case 'create':
    default:
      return {
        title: 'TokenClub — Solana Token Creator (0.1 SOL)',
        description:
          'Create fully compliant SPL tokens on Solana for just 0.1 SOL. Fast, economical, and packed with launch tools.',
        path: '/',
      };
  }
}

export function SeoHead({ route }: { route: SeoRoute }) {
  useEffect(() => {
    const origin = window.location.origin;

    let title = 'TokenClub — Solana Token Creator (0.1 SOL)';
    let description =
      'Create fully compliant SPL tokens on Solana for just 0.1 SOL. Fast, economical, and packed with launch tools.';
    let path = '/';

    if (route.kind === 'comparison') {
      title = 'Smithii vs TokenClub: The Cheapest Solana Token Creator (2025)';
      description =
        'Compare TokenClub vs Smithii vs Orion Tools and see why TokenClub is the Economical Solana Token Launchpad for 2025.';
      path = '/comparison';
    } else if (route.kind === 'blog') {
      const post = route.post;
      title = post?.title ? `${post.title} — TokenClub Blog` : 'TokenClub Blog — Post';
      description =
        post?.metaDescription ||
        'TokenClub blog: step-by-step launch guides and troubleshooting for Solana token creators.';
      path = `/blog/${route.slug}`;
    } else {
      const s = getTabSeo(route.tab);
      title = s.title;
      description = s.description;
      path = s.path;
    }

    const canonical = `${origin}${path}`;
    const ogImage = `${origin}${OG_IMAGE_PATH}`;

    document.title = title;
    upsertMetaByName('description', description);

    // Indexability hints for modern crawlers
    upsertMetaByName(
      'robots',
      'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1'
    );
    upsertLinkCanonical(canonical);

    // OG
    upsertMetaByProperty('og:type', 'website');
    upsertMetaByProperty('og:site_name', 'TokenClub');
    upsertMetaByProperty('og:url', canonical);
    upsertMetaByProperty('og:title', title);
    upsertMetaByProperty('og:description', description);
    upsertMetaByProperty('og:image', ogImage);
    upsertMetaByProperty('og:image:width', '1200');
    upsertMetaByProperty('og:image:height', '630');
    upsertMetaByProperty('og:image:alt', 'TokenClub — Solana Token Creator');

    // Twitter
    upsertMetaByName('twitter:card', 'summary_large_image');
    upsertMetaByName('twitter:url', canonical);
    upsertMetaByName('twitter:title', title);
    upsertMetaByName('twitter:description', description);
    upsertMetaByName('twitter:image', ogImage);
    upsertMetaByName('twitter:image:alt', 'TokenClub — Solana Token Creator');
  }, [route]);

  return null;
}


