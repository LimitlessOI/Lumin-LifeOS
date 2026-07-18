/**
 * SYNOPSIS: Shared Design Studio — curated, research-backed design systems
 * used by Site Builder and MarketingOS to keep every product output on-brand
 * and visually distinctive instead of generic Tailwind templates.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 *
 * Research inputs (2026-07-12):
 * - Agentic UX is the 2026 local-business standard: sites must act for the user
 *   with intent-driven components, quick actions, and conversational flows.
 * - High-converting small-business sites use a single clear CTA, strong above-the-fold
 *   trust, repeated CTA placement, real proof, and mobile-first thumb-sized decisions.
 * - Distinctive art direction (custom typography, color, motion, and motifs) beats
 *   generic purple/white templates.
 * - Fast-loading, accessible, semantic HTML with visible focus states and schema markup.
 */

export const DEFAULT_DESIGN_SYSTEM_ID = 'editorial-luxe';
export const FREE_DESIGN_SYSTEM_IDS = ['editorial-luxe', 'modern-clinical', 'organic-warm', 'bold-minimal'];

const DESIGN_SYSTEMS = [
  {
    id: 'editorial-luxe',
    name: 'Editorial Luxe',
    blurb: 'Magazine-grade serif display, generous whitespace, and a refined premium feel.',
    tier: 'free',
    audience: 'Premium service businesses that want to look established, calm, and trustworthy.',
    personality: ['refined', 'spacious', 'premium', 'trustworthy', 'calm'],
    tokens: {
      bg: '#F6F4EF',
      text: '#1A1A1A',
      muted: '#6B6B6B',
      line: '#E2E0D9',
      card: '#FFFFFF',
      overlay: 'rgba(0,0,0,0.04)',
      primary: '#1A1A1A',
      accent: '#C9A86A',
      buttonText: '#FFFFFF',
      radius: '20px',
      shadow: '0 24px 60px rgba(0,0,0,0.12)',
    },
    fonts: {
      display: '"Playfair Display", Georgia, "Times New Roman", serif',
      body: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      google: [
        { family: 'Playfair Display', weights: 'wght@400;600;700' },
        { family: 'Inter', weights: 'wght@400;500;600;700' },
      ],
    },
    layout: `Generous whitespace. Hero is a 2-column split: left text, right image or gradient panel. Max content width 1160px centered. Use hairline rules between major sections. Section padding py-20 md:py-28. Use an asymmetrical editorial grid for service cards (e.g. 2 large + 1 featured).`,
    components: `Buttons: large, rounded-full, with primary solid fill and subtle shadow. Use an accent underline on hover. Cards: white, rounded-2xl, soft shadow, with an accent thin rule at the top. Headings: display font, tight leading, mixed weights. Use a pull-quote style for the main value proposition.`,
    motifs: `Thin gold/amber accent rules, generous letter-spacing on small caps labels, a single large serif initial on the hero paragraph, and soft cream-to-white gradients.`,
    antiPatterns: `Do not use default purple-blue gradients. Do not use all-caps headings. Do not use all-caps body text. Do not use generic rounded avatars for testimonials unless real headshots are provided. Do not use a plain white background for every section; vary between cream and white.`,
    sections: `1. Sticky nav with logo and "Book Free Call" CTA. 2. Hero split with serif headline, proof bar, two CTAs. 3. Problem cards. 4. Solution process. 5. Services with editorial grid. 6. Testimonials with source. 7. Offer/packages. 8. About. 9. FAQ accordion. 10. Blog preview. 11. Video embeds. 12. Booking CTA. 13. Footer.`,
  },
  {
    id: 'modern-clinical',
    name: 'Modern Clinical',
    blurb: 'Crisp, trustworthy, and medical-grade — white space with a confident accent.',
    tier: 'free',
    audience: 'Healthcare, dental, medical, therapy, and any service where trust and clarity come first.',
    personality: ['clean', 'precise', 'trustworthy', 'calm', 'professional'],
    tokens: {
      bg: '#FFFFFF',
      text: '#0F172A',
      muted: '#64748B',
      line: '#E2E8F0',
      card: '#F8FAFC',
      overlay: 'rgba(15,23,42,0.03)',
      primary: '#0D9488',
      accent: '#0EA5E9',
      buttonText: '#FFFFFF',
      radius: '14px',
      shadow: '0 8px 24px rgba(15,23,42,0.06)',
    },
    fonts: {
      display: '"Space Grotesk", "Inter", system-ui, sans-serif',
      body: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      google: [
        { family: 'Space Grotesk', weights: 'wght@400;500;600;700' },
        { family: 'Inter', weights: 'wght@400;500;600;700' },
      ],
    },
    layout: `Clean horizontal rhythm. Hero is centered or 2-column with a clear information hierarchy. Max content width 1200px. Use generous white space and clear card groupings. Section padding py-16 md:py-24. Use a fixed header with a subtle border.`,
    components: `Buttons: rounded-xl, solid primary with a subtle hover lift. Cards: light card background, rounded-xl, thin border. Use icon badges in circles. Headings: space-grotesk, medium weight, tight leading. Use a subtle checkmark/pill for trust signals.`,
    motifs: `Soft teal-to-sky gradient accents, rounded pill badges, clean line separators, and a light-blue card surface. Use subtle medical-style icons (minimal).`,
    antiPatterns: `Do not use a dark background unless the brand explicitly demands it. Do not use playful rounded shapes. Do not use all-caps labels. Do not use generic wellness purple. Do not use fake medical credentials.`,
    sections: `1. Clean sticky nav with CTA. 2. Hero with headline + trust badges + booking CTA. 3. Problem cards (3 pain points). 4. Solution process. 5. Services with icon cards. 6. Testimonials. 7. Offer/packages. 8. About. 9. FAQ. 10. Blog preview. 11. Video. 12. Booking CTA. 13. Footer.`,
  },
  {
    id: 'organic-warm',
    name: 'Organic Warm',
    blurb: 'Earthy, botanical, and soft — for businesses that want to feel human and welcoming.',
    tier: 'free',
    audience: 'Wellness, holistic care, midwives, nutrition, coaches, and local community businesses.',
    personality: ['warm', 'earthy', 'welcoming', 'soft', 'human'],
    tokens: {
      bg: '#F9F7F3',
      text: '#3E3832',
      muted: '#7A726A',
      line: '#E9E4DC',
      card: '#FFFFFF',
      overlay: 'rgba(62,56,50,0.03)',
      primary: '#C06C50',
      accent: '#8A9A7B',
      buttonText: '#FFFFFF',
      radius: '24px',
      shadow: '0 12px 40px rgba(62,56,50,0.08)',
    },
    fonts: {
      display: '"Merriweather", Georgia, "Times New Roman", serif',
      body: '"Source Sans 3", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      google: [
        { family: 'Merriweather', weights: 'wght@400;700;900' },
        { family: 'Source Sans 3', weights: 'wght@400;500;600;700' },
      ],
    },
    layout: `Soft, rounded shapes. Hero is centered or split with a large, rounded image or a botanical gradient. Max content width 1120px. Use organic, asymmetrical spacing and rounded corners everywhere. Section padding py-16 md:py-24.`,
    components: `Buttons: rounded-full, primary color with a warm shadow. Cards: very rounded, soft shadow, with an earthy accent border. Headings: serif display, friendly, lower contrast. Use leaf/blob shapes as CSS backgrounds.`,
    motifs: `Soft terracotta and sage gradients, rounded blobs, hand-drawn-feeling icons, and natural textures. Use lots of rounded corners and gentle shadow.`,
    antiPatterns: `Do not use sharp corners. Do not use neon colors. Do not use a dark or clinical background. Do not use generic purple. Do not use rigid grid lines. Do not use all-caps headings.`,
    sections: `1. Soft nav with rounded CTA. 2. Hero with rounded image and warm copy. 3. Problem cards with organic shapes. 4. Solution steps. 5. Services with rounded cards. 6. Testimonials. 7. Offer. 8. About. 9. FAQ. 10. Blog preview. 11. Video. 12. Booking CTA. 13. Footer.`,
  },
  {
    id: 'bold-minimal',
    name: 'Bold Minimal',
    blurb: 'Near-monochrome, huge type, and a gallery-like focus on what matters.',
    tier: 'free',
    audience: 'Modern consultants, designers, agencies, and any business that wants to look sharp and direct.',
    personality: ['bold', 'direct', 'modern', 'confident', 'minimal'],
    tokens: {
      bg: '#FAFAFA',
      text: '#111111',
      muted: '#6B6B6B',
      line: '#E5E5E5',
      card: '#FFFFFF',
      overlay: 'rgba(0,0,0,0.03)',
      primary: '#111111',
      accent: '#F59E0B',
      buttonText: '#FFFFFF',
      radius: '4px',
      shadow: '0 4px 20px rgba(0,0,0,0.06)',
    },
    fonts: {
      display: '"Oswald", "Inter", system-ui, sans-serif',
      body: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      google: [
        { family: 'Oswald', weights: 'wght@400;500;700' },
        { family: 'Inter', weights: 'wght@400;500;600;700' },
      ],
    },
    layout: `Large typography and minimal UI. Hero is centered with a huge display headline and a single CTA. Max content width 1000px. Use a strict vertical rhythm with lots of whitespace. Section padding py-20 md:py-32. Use thin rules and a monochrome palette with one accent.`,
    components: `Buttons: rectangular, solid black or white inverse, with a small accent hover. Cards: white, thin border, no or minimal shadow. Headings: oswald, uppercase tracking, very large. Use a stark contrast between sections.`,
    motifs: `Huge condensed type, thin 1px rules, a single accent color (brand accent) for hover and highlights, and a grid-like layout.`,
    antiPatterns: `Do not use rounded corners. Do not use gradients. Do not use more than one accent color. Do not use playful shapes. Do not use generic purple or blue. Do not use small body text.`,
    sections: `1. Minimal nav with bold logo and CTA. 2. Huge hero headline + CTA. 3. Problem cards (black text on white). 4. Solution steps. 5. Services with thin-bordered cards. 6. Testimonials. 7. Offer. 8. About. 9. FAQ. 10. Blog preview. 11. Video. 12. Booking CTA. 13. Footer.`,
  },
  {
    id: 'dark-aura',
    name: 'Dark Aura',
    blurb: 'A dark canvas with neon glow and glass — premium, modern, and spa-tech.',
    tier: 'free',
    audience: 'High-end wellness, med-spas, tech-enabled services, and brands that want to feel premium and futuristic.',
    personality: ['premium', 'futuristic', 'moody', 'confident', 'sleek'],
    tokens: {
      bg: '#0A0A0F',
      text: '#F2F2F5',
      muted: '#8A8A9A',
      line: '#1F1F2E',
      card: '#13131A',
      overlay: 'rgba(242,242,245,0.03)',
      primary: '#5ECF8E',
      accent: '#60A5FA',
      buttonText: '#0A0A0F',
      radius: '18px',
      shadow: '0 0 40px rgba(94,207,142,0.12)',
    },
    fonts: {
      display: '"Outfit", "Inter", system-ui, sans-serif',
      body: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      google: [
        { family: 'Outfit', weights: 'wght@300;400;500;600;700' },
        { family: 'Inter', weights: 'wght@400;500;600;700' },
      ],
    },
    layout: `Dark mode first. Hero is a large headline with a subtle glow/gradient behind. Max content width 1200px. Use glassmorphism cards on dark. Section padding py-20 md:py-28. Use subtle glows and deep shadows.`,
    components: `Buttons: rounded-full, neon primary color, dark text, glow shadow. Cards: dark translucent card, thin border, rounded-2xl, glass blur. Headings: outfit, light weight, large. Use subtle gradient orbs behind key sections.`,
    motifs: `Neon glows, dark glass, radial gradient orbs, subtle grid lines, and a deep, immersive background. Use the accent for small highlights and primary for CTAs.`,
    antiPatterns: `Do not use a white background. Do not use black text. Do not use generic purple or pink. Do not use heavy drop shadows on dark cards. Do not use bright saturated colors for large backgrounds.`,
    sections: `1. Dark nav with neon CTA. 2. Hero with headline and glow. 3. Problem cards (dark). 4. Solution steps with glow icons. 5. Services with glass cards. 6. Testimonials. 7. Offer. 8. About. 9. FAQ. 10. Blog preview. 11. Video. 12. Booking CTA. 13. Footer.`,
  },
  {
    id: 'gradient-energy',
    name: 'Gradient Energy',
    blurb: 'Vibrant mesh gradients, glassmorphism, and bento-grid energy for modern brands.',
    tier: 'paid',
    audience: 'Fitness, creative agencies, tech-enabled local services, and brands that want to feel energetic and current.',
    personality: ['energetic', 'modern', 'vibrant', 'confident', 'playful'],
    tokens: {
      bg: '#F7F9FF',
      text: '#1A1A2E',
      muted: '#5B657A',
      line: '#E3E7FF',
      card: '#FFFFFF',
      overlay: 'rgba(71,80,255,0.06)',
      primary: '#4F46E5',
      accent: '#EC4899',
      buttonText: '#FFFFFF',
      radius: '22px',
      shadow: '0 24px 60px rgba(71,80,255,0.12)',
    },
    fonts: {
      display: '"Outfit", "Inter", system-ui, sans-serif',
      body: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      google: [
        { family: 'Outfit', weights: 'wght@400;500;600;700' },
        { family: 'Inter', weights: 'wght@400;500;600;700' },
      ],
    },
    layout: `Bento grid and bold color fields. Hero is a 2-column or bento grid with a gradient panel. Max content width 1240px. Use rounded-3xl cards and gradient mesh backgrounds. Section padding py-16 md:py-24.`,
    components: `Buttons: rounded-full, primary color, with a gradient hover. Cards: white, rounded-3xl, large shadow, with gradient accent borders. Headings: outfit, bold, large. Use gradient text for hero headline. Use bento-style service cards.`,
    motifs: `Mesh gradients, glass panels, rounded bento cards, large shadow, and a vibrant accent. Use gradient orbs and blurred colored shapes as background.`,
    antiPatterns: `Do not use flat white backgrounds. Do not use small body text. Do not use generic purple/blue gradients. Do not use all-caps. Do not use thin 1px rules. Do not use more than two accent colors.`,
    sections: `1. Nav with rounded CTA. 2. Bento hero with gradient panel. 3. Problem cards. 4. Solution steps. 5. Bento service cards. 6. Testimonials. 7. Offer. 8. About. 9. FAQ. 10. Blog preview. 11. Video. 12. Booking CTA. 13. Footer.`,
  },
  {
    id: 'retro-warm',
    name: 'Retro Warm',
    blurb: '70s revival with terracotta, mustard, and sage — playful, human, and memorable.',
    tier: 'paid',
    audience: 'Lifestyle brands, coaches, food, local shops, and any business that wants to feel approachable and memorable.',
    personality: ['warm', 'playful', 'vintage', 'friendly', 'bold'],
    tokens: {
      bg: '#FFF8F0',
      text: '#4B2E22',
      muted: '#8C7B6F',
      line: '#F0E2D3',
      card: '#FFFFFF',
      overlay: 'rgba(75,46,34,0.03)',
      primary: '#B85C3F',
      accent: '#D4A036',
      buttonText: '#FFFFFF',
      radius: '30px 0 30px 0',
      shadow: '0 16px 40px rgba(75,46,34,0.10)',
    },
    fonts: {
      display: '"Abril Fatface", Georgia, "Times New Roman", serif',
      body: '"Lato", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      google: [
        { family: 'Abril Fatface', weights: 'wght@400' },
        { family: 'Lato', weights: 'wght@400;700;900' },
      ],
    },
    layout: `Asymmetrical, warm, and slightly playful. Hero is a centered or split with a large display headline and a rounded, arch-shaped image. Max content width 1120px. Use generous rounded corners and warm shadows. Section padding py-16 md:py-24.`,
    components: `Buttons: rounded-full, primary color, with a warm shadow. Cards: white, asymmetric rounded corners, with an accent border. Headings: abril fatface, large, retro. Use arched shapes and decorative circles.`,
    motifs: `Terracotta, mustard, and sage palette; arched shapes; decorative circles; 70s-inspired typography; warm, uneven shadows.`,
    antiPatterns: `Do not use dark backgrounds. Do not use neon colors. Do not use thin, clinical lines. Do not use generic blue/purple. Do not use all-caps headings.`,
    sections: `1. Nav with rounded CTA. 2. Hero with arched image and retro headline. 3. Problem cards. 4. Solution steps. 5. Services with rounded cards. 6. Testimonials. 7. Offer. 8. About. 9. FAQ. 10. Blog preview. 11. Video. 12. Booking CTA. 13. Footer.`,
  },
  {
    id: 'soft-pastel',
    name: 'Soft Pastel',
    blurb: 'Calming pastel gradients, soft cards, and gentle rounded forms for a soothing feel.',
    tier: 'paid',
    audience: 'Therapists, counselors, wellness, self-care, and any business that wants to feel gentle and calming.',
    personality: ['calm', 'gentle', 'soothing', 'friendly', 'modern'],
    tokens: {
      bg: '#F3F0FF',
      text: '#2E2A3A',
      muted: '#7A7585',
      line: '#E6E0FF',
      card: '#FFFFFF',
      overlay: 'rgba(90,80,180,0.05)',
      primary: '#8B5CF6',
      accent: '#F472B6',
      buttonText: '#FFFFFF',
      radius: '28px',
      shadow: '0 20px 50px rgba(90,80,180,0.09)',
    },
    fonts: {
      display: '"Poppins", "Inter", system-ui, sans-serif',
      body: '"Nunito", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      google: [
        { family: 'Poppins', weights: 'wght@400;500;600;700' },
        { family: 'Nunito', weights: 'wght@400;500;600;700' },
      ],
    },
    layout: `Soft, rounded, and calming. Hero is centered or split with a large pastel gradient background. Max content width 1140px. Use very rounded corners and soft shadows. Section padding py-16 md:py-24.`,
    components: `Buttons: rounded-full, primary color, with a soft shadow. Cards: white, very rounded, with a pastel border. Headings: poppins, medium, rounded feel. Use pastel gradient blobs as backgrounds.`,
    motifs: `Pastel lavender, pink, and mint gradients; rounded everything; soft shadows; calming, blob-like shapes.`,
    antiPatterns: `Do not use dark backgrounds. Do not use harsh shadows. Do not use neon colors. Do not use generic purple/white without the pastel palette. Do not use sharp corners. Do not use all-caps headings.`,
    sections: `1. Soft nav with rounded CTA. 2. Hero with pastel gradient and calm copy. 3. Problem cards. 4. Solution steps. 5. Services with rounded cards. 6. Testimonials. 7. Offer. 8. About. 9. FAQ. 10. Blog preview. 11. Video. 12. Booking CTA. 13. Footer.`,
  },
  {
    id: 'swiss-grid',
    name: 'Swiss Grid',
    blurb: 'Strict grid, black/white, and one accent — international typographic style.',
    tier: 'paid',
    audience: 'Lawyers, architects, accountants, consultants, and any business that wants precision and authority.',
    personality: ['precise', 'authoritative', 'minimal', 'structured', 'clean'],
    tokens: {
      bg: '#FFFFFF',
      text: '#111111',
      muted: '#6B6B6B',
      line: '#E5E5E5',
      card: '#FFFFFF',
      overlay: 'rgba(0,0,0,0.03)',
      primary: '#111111',
      accent: '#DC2626',
      buttonText: '#FFFFFF',
      radius: '0px',
      shadow: 'none',
    },
    fonts: {
      display: '"Inter", "Helvetica Neue", Arial, sans-serif',
      body: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      google: [
        { family: 'Inter', weights: 'wght@400;500;600;700;800' },
      ],
    },
    layout: `Strict grid and left-aligned typography. Hero is a large left-aligned headline with a thin accent rule. Max content width 1200px. Use a clear 12-column grid. Section padding py-16 md:py-24. Use flat colors and no shadow.`,
    components: `Buttons: rectangular, solid primary, with a sharp hover. Cards: white, thick top border, no shadow. Headings: inter, bold, large, left-aligned. Use a single red accent for small highlights. Use a strong grid for service cards.`,
    motifs: `Black, white, and one red accent; thick rules; grid lines; uppercase small labels; no gradients; no shadows.`,
    antiPatterns: `Do not use rounded corners. Do not use gradients. Do not use shadows. Do not use multiple colors. Do not use centered hero text. Do not use playful shapes. Do not use generic purple.`,
    sections: `1. Minimal nav with CTA. 2. Left-aligned hero with accent rule. 3. Problem grid. 4. Solution steps. 5. Services in strict grid. 6. Testimonials. 7. Offer. 8. About. 9. FAQ. 10. Blog preview. 11. Video. 12. Booking CTA. 13. Footer.`,
  },
  {
    id: 'refined-brutalist',
    name: 'Refined Brutalist',
    blurb: 'Raw borders, high contrast, and offset shadows for a confident, memorable edge.',
    tier: 'paid',
    audience: 'Creative businesses, studios, bold local brands, and anyone that wants to stand out.',
    personality: ['bold', 'raw', 'confident', 'modern', 'unconventional'],
    tokens: {
      bg: '#F2F2F0',
      text: '#1A1A1A',
      muted: '#6B6B6B',
      line: '#1A1A1A',
      card: '#FFFFFF',
      overlay: 'rgba(0,0,0,0.04)',
      primary: '#1A1A1A',
      accent: '#F97316',
      buttonText: '#FFFFFF',
      radius: '0px',
      shadow: '8px 8px 0 #1A1A1A',
    },
    fonts: {
      display: '"Space Grotesk", "Inter", system-ui, sans-serif',
      body: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      google: [
        { family: 'Space Grotesk', weights: 'wght@400;500;600;700' },
        { family: 'Inter', weights: 'wght@400;500;600;700' },
      ],
    },
    layout: `Strong contrast and offset shadows. Hero is centered or split with a large display headline and an offset shadow image. Max content width 1100px. Use thick borders and bold spacing. Section padding py-16 md:py-24.`,
    components: `Buttons: rectangular, solid primary, with an offset shadow. Cards: white, thick black border, offset shadow, no rounded corners. Headings: space grotesk, bold, large. Use a single bright accent for highlights.`,
    motifs: `Thick black borders, offset shadows, monospace-style labels, high contrast, and a single orange accent.`,
    antiPatterns: `Do not use rounded corners. Do not use gradients. Do not use soft shadows. Do not use more than one accent. Do not use generic purple. Do not use thin rules. Do not use all-caps body text.`,
    sections: `1. Bold nav with CTA. 2. Hero with offset shadow image. 3. Problem cards with thick borders. 4. Solution steps. 5. Services with offset cards. 6. Testimonials. 7. Offer. 8. About. 9. FAQ. 10. Blog preview. 11. Video. 12. Booking CTA. 13. Footer.`,
  },
  {
    id: 'coastal-light',
    name: 'Coastal Light',
    blurb: 'Fresh, airy, and professional — sand, blue, and lots of white space.',
    tier: 'paid',
    audience: 'Professional services, coastal businesses, real estate, and anyone that wants clean confidence.',
    personality: ['fresh', 'airy', 'professional', 'calm', 'trustworthy'],
    tokens: {
      bg: '#FFFFFF',
      text: '#0F4C5C',
      muted: '#5A8A9A',
      line: '#E0F2F7',
      card: '#F5FCFF',
      overlay: 'rgba(15,76,92,0.03)',
      primary: '#0F4C5C',
      accent: '#D4A74B',
      buttonText: '#FFFFFF',
      radius: '16px',
      shadow: '0 12px 40px rgba(15,76,92,0.07)',
    },
    fonts: {
      display: '"Cormorant Garamond", Georgia, "Times New Roman", serif',
      body: '"Source Sans 3", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      google: [
        { family: 'Cormorant Garamond', weights: 'wght@400;500;600;700' },
        { family: 'Source Sans 3', weights: 'wght@400;500;600;700' },
      ],
    },
    layout: `Bright, open, and breathable. Hero is a 2-column split with a large, airy image and a refined serif headline. Max content width 1200px. Use lots of white space and a subtle blue-tinted card surface. Section padding py-16 md:py-24.`,
    components: `Buttons: rounded-xl, primary deep-sea blue, white text. Cards: light blue card surface, rounded-xl, soft shadow. Headings: cormorant garamond, elegant. Use a sandy gold accent for hover and small highlights.`,
    motifs: `Deep sea blue, sandy gold, white space, soft blue-tinted surfaces, and subtle wave-like shapes.`,
    antiPatterns: `Do not use dark backgrounds. Do not use neon colors. Do not use generic purple. Do not use all-caps headings. Do not use heavy shadows.`,
    sections: `1. Airy nav with CTA. 2. Hero with serif headline and image. 3. Problem cards. 4. Solution steps. 5. Services with blue cards. 6. Testimonials. 7. Offer. 8. About. 9. FAQ. 10. Blog preview. 11. Video. 12. Booking CTA. 13. Footer.`,
  },
  {
    id: 'urban-gold',
    name: 'Urban Gold',
    blurb: 'Deep navy, gold, and cream — premium, professional, and built for trust.',
    tier: 'paid',
    audience: 'Lawyers, financial advisors, insurance, premium consultancies, and established service businesses.',
    personality: ['premium', 'established', 'trustworthy', 'elegant', 'confident'],
    tokens: {
      bg: '#F9F7F0',
      text: '#1A2238',
      muted: '#6B7280',
      line: '#DAD7C9',
      card: '#FFFFFF',
      overlay: 'rgba(26,34,56,0.03)',
      primary: '#1A2238',
      accent: '#C5A059',
      buttonText: '#FFFFFF',
      radius: '12px',
      shadow: '0 16px 48px rgba(26,34,56,0.12)',
    },
    fonts: {
      display: '"Cinzel", Georgia, "Times New Roman", serif',
      body: '"Lato", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      google: [
        { family: 'Cinzel', weights: 'wght@400;500;600;700' },
        { family: 'Lato', weights: 'wght@400;700;900' },
      ],
    },
    layout: `Elegant and structured. Hero is a centered or split with a refined display headline and a gold accent. Max content width 1160px. Use generous cream backgrounds, white cards, and gold accents. Section padding py-16 md:py-24.`,
    components: `Buttons: rounded-xl, navy primary, white text, gold hover border. Cards: white, rounded-xl, with a subtle gold top border. Headings: cinzel, elegant, large. Use gold for small highlights and hover.`,
    motifs: `Deep navy, gold, cream, serif display type, elegant cards, and subtle gold rules.`,
    antiPatterns: `Do not use playful shapes. Do not use neon colors. Do not use generic purple/blue. Do not use all-caps headings. Do not use dark backgrounds for the main page.`,
    sections: `1. Elegant nav with CTA. 2. Hero with serif headline and gold accent. 3. Problem cards. 4. Solution steps. 5. Services with gold-topped cards. 6. Testimonials. 7. Offer. 8. About. 9. FAQ. 10. Blog preview. 11. Video. 12. Booking CTA. 13. Footer.`,
  },
  {
    id: 'agentic-conversational',
    name: 'Agentic Conversational',
    blurb: '2026-ready agentic UX: chat-like actions, quick answers, and a site that acts for the visitor.',
    tier: 'paid',
    audience: 'Any business that books appointments or answers repeat questions — dentists, lawyers, salons, clinics, contractors.',
    personality: ['helpful', 'modern', 'fast', 'conversational', 'trustworthy'],
    tokens: {
      bg: '#F9FAFB',
      text: '#111827',
      muted: '#6B7280',
      line: '#E5E7EB',
      card: '#FFFFFF',
      overlay: 'rgba(0,0,0,0.03)',
      primary: '#2563EB',
      accent: '#10B981',
      buttonText: '#FFFFFF',
      radius: '20px',
      shadow: '0 4px 20px rgba(0,0,0,0.04)',
    },
    fonts: {
      display: '"Inter", "Helvetica Neue", Arial, sans-serif',
      body: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      google: [
        { family: 'Inter', weights: 'wght@400;500;600;700;800' },
      ],
    },
    layout: `Conversational and action-first. Hero is a clear question/answer layout: "What do you need help with?" with quick-action chips. Max content width 1000px. Use chat-bubble-style cards, quick action buttons, and a sticky bottom action. Section padding py-12 md:py-20.`,
    components: `Buttons: rounded-full, primary, with an arrow. Use "pill" chips for common actions. Cards: white, rounded-2xl, with a subtle shadow. Use a chat-like layout for the FAQ and contact. Headings: inter, bold, direct. Use a green accent for "available" / "quick" signals.`,
    motifs: `Chat bubbles, quick-action chips, typing-dot style loaders, status badges, a sticky bottom action, and a clean, app-like feel.`,
    antiPatterns: `Do not use a static brochure layout. Do not hide the booking action. Do not use generic hero stock photos. Do not use long paragraphs before the action. Do not use more than two accent colors. Do not use a dark theme.`,
    sections: `1. Nav with CTA. 2. Hero with a question and quick-action chips. 3. Social proof bar. 4. Problem cards. 5. "How it works" steps. 6. Services with book chips. 7. Testimonials. 8. Offer. 9. About. 10. FAQ accordion. 11. Blog preview. 12. Video. 13. Sticky booking CTA. 14. Footer.`,
  },
  {
    id: 'local-trust',
    name: 'Local Trust',
    blurb: 'Conversion-first local business: phone, proof, and trust signals front and center.',
    tier: 'paid',
    audience: 'Contractors, dentists, lawyers, HVAC, plumbers, and any business that lives or dies by phone calls.',
    personality: ['direct', 'trustworthy', 'local', 'conversion-focused', 'confident'],
    tokens: {
      bg: '#F8F7F4',
      text: '#1F2937',
      muted: '#6B7280',
      line: '#E5E5E0',
      card: '#FFFFFF',
      overlay: 'rgba(0,0,0,0.03)',
      primary: '#1F2937',
      accent: '#F59E0B',
      buttonText: '#FFFFFF',
      radius: '12px',
      shadow: '0 8px 24px rgba(0,0,0,0.06)',
    },
    fonts: {
      display: '"Merriweather", Georgia, "Times New Roman", serif',
      body: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      google: [
        { family: 'Merriweather', weights: 'wght@400;700;900' },
        { family: 'Inter', weights: 'wght@400;500;600;700' },
      ],
    },
    layout: `Conversion-first and local. Hero is a centered or split with a large headline, phone number, and a "Call Now" CTA. Max content width 1160px. Use a strong proof bar (reviews, years, area served) right below the hero. Section padding py-14 md:py-20.`,
    components: `Buttons: large, rounded-xl, primary, with a phone icon. Use a sticky call bar on mobile. Cards: white, rounded-xl, shadow, with a check icon. Headings: merriweather, bold. Use a yellow accent for urgency and trust badges. Use a prominent "Call Now" and "Get a Quote" CTA.`,
    motifs: `Phone icons, trust badges, checkmarks, local map/area mentions, review stars, and a yellow accent for urgency.`,
    antiPatterns: `Do not hide the phone number. Do not use a generic hero image. Do not bury the CTA at the bottom. Do not use a dark theme. Do not use more than two accent colors. Do not use all-caps headings. Do not use fake awards.`,
    sections: `1. Nav with phone + CTA. 2. Hero with headline, phone, and CTA. 3. Proof bar (real reviews, area, response time). 4. Problem cards. 5. Services with quote CTAs. 6. Testimonials. 7. Offer. 8. About. 9. FAQ. 10. Blog preview. 11. Video. 12. Booking/Call CTA. 13. Footer.`,
  },
  {
    id: 'artisan-heritage',
    name: 'Artisan Heritage',
    blurb: 'Warm, editorial, and handcrafted — perfect for makers, food, boutiques, and heritage services.',
    tier: 'paid',
    audience: 'Artisan businesses, local food and drink, boutiques, farms, and heritage service brands that want a crafted, trustworthy feel.',
    personality: ['warm', 'craft', 'editorial', 'trustworthy', 'timeless'],
    tokens: {
      bg: '#F7F5F0',
      text: '#3D3D3D',
      muted: '#7A7670',
      line: '#E7E3DC',
      card: '#FFFFFF',
      overlay: 'rgba(0,0,0,0.03)',
      primary: '#6B4F4B',
      accent: '#C9A86A',
      buttonText: '#FFFFFF',
      radius: '8px',
      shadow: '0 12px 32px rgba(0,0,0,0.08)',
    },
    fonts: {
      display: '"Libre Baskerville", Georgia, "Times New Roman", serif',
      body: '"Karla", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      google: [
        { family: 'Libre Baskerville', weights: 'wght@400;700' },
        { family: 'Karla', weights: 'wght@400;500;600;700' },
      ],
    },
    layout: `Warm and editorial. Hero is a 2-column split with a large headline and a soft, earthy image. Max content width 1140px. Use subtle paper-like backgrounds and generous whitespace. Section padding py-16 md:py-24.`,
    components: `Buttons: rounded-rectangle, primary color, with subtle shadow. Cards: white, with a thin gold border and soft shadow. Headings: libre baskerville, elegant. Use a gold accent for small highlights and rule lines.`,
    motifs: `Warm cream, deep brown, gold foil accents, subtle paper texture, and craft-like iconography.`,
    antiPatterns: `Do not use neon colors. Do not use dark backgrounds. Do not use generic purple/blue. Do not use all-caps headings. Do not use sharp, cold corners.`,
    sections: `1. Nav with CTA. 2. Hero with editorial headline and image. 3. Problem cards. 4. Solution steps. 5. Services with craft-style cards. 6. Testimonials. 7. Offer. 8. About. 9. FAQ. 10. Blog preview. 11. Video. 12. Booking CTA. 13. Footer.`,
  },
];

function getGoogleFontLink(fonts) {
  if (!fonts || !fonts.google || !fonts.google.length) return null;
  const parts = fonts.google.map((f) => {
    const name = f.family.replace(/\s+/g, '+');
    return `family=${name}:${f.weights}`;
  });
  return `https://fonts.googleapis.com/css2?${parts.join('&')}&display=swap`;
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex) || /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
  if (!m) return null;
  const r = m.length === 7 ? parseInt(m[1], 16) : parseInt(m[1] + m[1], 16);
  const g = m.length === 7 ? parseInt(m[2], 16) : parseInt(m[2] + m[2], 16);
  const b = m.length === 7 ? parseInt(m[3], 16) : parseInt(m[3] + m[3], 16);
  return { r, g, b };
}

function relativeLuminance({ r, g, b }) {
  const a = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function isLightColor(hex) {
  const rgb = hexToRgb(hex);
  return rgb ? relativeLuminance(rgb) > 0.5 : true;
}

function toHex(r, g, b) {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
}

function blendWithWhite(hex, ratio) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return toHex(rgb.r + (255 - rgb.r) * ratio, rgb.g + (255 - rgb.g) * ratio, rgb.b + (255 - rgb.b) * ratio);
}

export function deriveDarkTokens(tokens) {
  if (!tokens) return tokens;
  if (!isLightColor(tokens.bg)) return tokens;
  const primary = tokens.primary || '#000000';
  const accent = tokens.accent || '#CCCCCC';
  const darkPrimary = isLightColor(accent) ? accent : (isLightColor(primary) ? primary : blendWithWhite(accent, 0.5));
  return {
    ...tokens,
    primary: darkPrimary,
    accent: isLightColor(accent) ? blendWithWhite(accent, 0.25) : blendWithWhite(accent, 0.6),
    bg: '#0B0B0B',
    text: '#F5F5F0',
    muted: '#A8A8A0',
    line: '#2A2A2A',
    card: '#161616',
    overlay: 'rgba(255,255,255,0.05)',
    buttonText: '#0B0B0B',
    shadow: '0 24px 60px rgba(0,0,0,0.45)',
  };
}

export function getDesignSystemCss(system, brandPrimary, brandAccent) {
  const primary = brandPrimary || system.tokens.primary;
  const accent = brandAccent || system.tokens.accent;
  const effectiveTokens = { ...system.tokens, primary, accent };
  const darkTokens = deriveDarkTokens(effectiveTokens);
  const darkBlock = darkTokens === effectiveTokens ? '' : `
body[data-lumin-ds][data-theme="dark"] {
  --primary: ${darkTokens.primary};
  --accent: ${darkTokens.accent};
  --bg: ${darkTokens.bg};
  --text: ${darkTokens.text};
  --muted: ${darkTokens.muted};
  --line: ${darkTokens.line};
  --card: ${darkTokens.card};
  --overlay: ${darkTokens.overlay};
  --button-text: ${darkTokens.buttonText};
  --shadow: ${darkTokens.shadow};
  background-color: var(--bg) !important;
  color: var(--text) !important;
}`;
  return `:root {
  --primary: ${primary};
  --accent: ${accent};
  --bg: ${system.tokens.bg};
  --text: ${system.tokens.text};
  --muted: ${system.tokens.muted};
  --line: ${system.tokens.line};
  --card: ${system.tokens.card};
  --overlay: ${system.tokens.overlay};
  --button-text: ${system.tokens.buttonText};
  --radius: ${system.tokens.radius};
  --shadow: ${system.tokens.shadow};
  --font-display: ${system.fonts.display};
  --font-body: ${system.fonts.body};
}
body[data-lumin-ds] { font-family: var(--font-body) !important; background-color: var(--bg) !important; color: var(--text) !important; }
body[data-lumin-ds] h1, body[data-lumin-ds] h2, body[data-lumin-ds] h3, body[data-lumin-ds] h4, body[data-lumin-ds] h5, body[data-lumin-ds] h6 { font-family: var(--font-display) !important; color: var(--text) !important; }
body[data-lumin-ds] .btn, body[data-lumin-ds] button, body[data-lumin-ds] a.btn { border-radius: var(--radius); background-color: var(--primary); color: var(--button-text); box-shadow: var(--shadow); }
body[data-lumin-ds] .card { border-radius: var(--radius); box-shadow: var(--shadow); background-color: var(--card); color: var(--text); }
body[data-lumin-ds] .bg-white { background-color: var(--card) !important; }
body[data-lumin-ds] .bg-gray-50, body[data-lumin-ds] .bg-gray-100, body[data-lumin-ds] .bg-gray-200,
body[data-lumin-ds] .bg-stone-50, body[data-lumin-ds] .bg-stone-100, body[data-lumin-ds] .bg-stone-200,
body[data-lumin-ds] .bg-slate-50, body[data-lumin-ds] .bg-slate-100, body[data-lumin-ds] .bg-slate-200,
body[data-lumin-ds] .bg-neutral-50, body[data-lumin-ds] .bg-neutral-100 { background-color: var(--bg) !important; }
body[data-lumin-ds] .text-gray-500, body[data-lumin-ds] .text-gray-600, body[data-lumin-ds] .text-muted,
body[data-lumin-ds] .text-stone-500, body[data-lumin-ds] .text-stone-600,
body[data-lumin-ds] .text-slate-500, body[data-lumin-ds] .text-slate-600 { color: var(--muted) !important; }
body[data-lumin-ds] .text-gray-700, body[data-lumin-ds] .text-gray-800, body[data-lumin-ds] .text-gray-900, body[data-lumin-ds] .text-black,
body[data-lumin-ds] .text-stone-700, body[data-lumin-ds] .text-stone-800, body[data-lumin-ds] .text-stone-900,
body[data-lumin-ds] .text-slate-700, body[data-lumin-ds] .text-slate-800, body[data-lumin-ds] .text-slate-900 { color: var(--text) !important; }
body[data-lumin-ds] section, body[data-lumin-ds] .card, body[data-lumin-ds] article { color: var(--text); }${darkBlock}`;
}

export function getDesignSystemFontLinks(system) {
  const link = getGoogleFontLink(system.fonts);
  return link ? [`<link rel="preconnect" href="https://fonts.googleapis.com">`, `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`, `<link href="${link}" rel="stylesheet">`] : [];
}

export function buildDesignSystemPrompt(system, { brandPrimary, brandAccent, businessName, industry } = {}) {
  const primary = brandPrimary || system.tokens.primary;
  const accent = brandAccent || system.tokens.accent;
  const css = getDesignSystemCss(system, primary, accent);
  const fontLinks = getDesignSystemFontLinks(system).join('\n');
  return `=== DESIGN SYSTEM: ${system.name} ===

AESTHETIC & AUDIENCE:
${system.audience} Personality: ${system.personality.join(', ')}.

COLOR DIRECTION (adapt to the business brand):
- Primary: ${primary} — use for primary CTAs, key borders, active/focus states, and major highlights.
- Accent: ${accent} — use for gradients, hover moments, small accents, and pull-quotes.
- Background: ${system.tokens.bg}
- Text: ${system.tokens.text}
- Muted text: ${system.tokens.muted}
- Card/surface: ${system.tokens.card}
- Line/divider: ${system.tokens.line}
- Button text: ${system.tokens.buttonText}
- Radius: ${system.tokens.radius}
- Shadow: ${system.tokens.shadow}
- Font display: ${system.fonts.display}
- Font body: ${system.fonts.body}

GOOGLE FONTS (include in <head>):
${fontLinks || '(none)'}

MANDATORY CSS STYLE BLOCK (include this exact <style> block in <head> so the above tokens work):
<style>
${css}
</style>

BODY TAG: Add data-lumin-ds="1" to the <body> tag so the design-token CSS above applies. Use <body data-lumin-ds="1">.

LAYOUT:
${system.layout}

COMPONENTS:
${system.components}

VISUAL MOTIFS:
${system.motifs}

SECTION BLUEPRINT (use this order; adapt content to ${businessName || 'this business'} in ${industry || 'its industry'}):
${system.sections}

ANTI-PATTERNS (NEVER do these):
${system.antiPatterns}

RESEARCH: This design system is built from 2026 conversion-UX research: agentic UX, mobile-first, trust above the fold, a single clear CTA, repeated CTA placement, fast load, and distinctive art direction. Avoid generic purple/white templates and invented facts.`;
}

export function getDesignSystem(id) {
  return DESIGN_SYSTEMS.find((d) => d.id === id) || null;
}

export function getDesignSystemForBrand(brandInfo = {}, { preferredId } = {}) {
  if (preferredId) return getDesignSystem(preferredId) || getDesignSystem(DEFAULT_DESIGN_SYSTEM_ID);
  if (brandInfo.designSystemId) return getDesignSystem(brandInfo.designSystemId) || getDesignSystem(DEFAULT_DESIGN_SYSTEM_ID);
  const industry = String(brandInfo.industry || '').toLowerCase();
  const tone = String(brandInfo.tone || '').toLowerCase();
  if (tone.includes('clinical') || industry.includes('dental') || industry.includes('medical') || industry.includes('doctor') || industry.includes('therapy')) return getDesignSystem('modern-clinical');
  if (tone.includes('warm') || tone.includes('organic') || industry.includes('midwife') || industry.includes('wellness') || industry.includes('coach') || industry.includes('holistic')) return getDesignSystem('organic-warm');
  if (tone.includes('bold') || tone.includes('minimal') || industry.includes('consult') || industry.includes('agency') || industry.includes('design')) return getDesignSystem('bold-minimal');
  if (tone.includes('premium') || tone.includes('luxury') || industry.includes('law') || industry.includes('financial') || industry.includes('advisor')) return getDesignSystem('editorial-luxe');
  if (tone.includes('playful') || tone.includes('retro') || industry.includes('food') || industry.includes('shop')) return getDesignSystem('retro-warm');
  if (tone.includes('modern') || tone.includes('tech') || industry.includes('fitness') || industry.includes('salon')) return getDesignSystem('gradient-energy');
  if (tone.includes('conversational') || tone.includes('agentic')) return getDesignSystem('agentic-conversational');
  if (tone.includes('local') || industry.includes('contractor') || industry.includes('plumb') || industry.includes('hvac') || industry.includes('roof')) return getDesignSystem('local-trust');
  return getDesignSystem(DEFAULT_DESIGN_SYSTEM_ID);
}

export function pickDesignSystems(count = 3, preferredIds = []) {
  const preferred = preferredIds.map((id) => getDesignSystem(id)).filter(Boolean);
  const rest = DESIGN_SYSTEMS.filter((d) => !preferred.find((p) => p.id === d.id));
  const picked = [...preferred];
  for (const ds of rest) {
    if (picked.length >= count) break;
    if (!picked.find((p) => p.id === ds.id)) picked.push(ds);
  }
  return picked;
}

export function pickFreeDesignSystems(count = 4) {
  return DESIGN_SYSTEMS.filter((d) => d.tier === 'free').slice(0, count);
}

export function pickPaidDesignSystems(count = 10) {
  return DESIGN_SYSTEMS.filter((d) => d.tier === 'paid').slice(0, count);
}

export { DESIGN_SYSTEMS };
