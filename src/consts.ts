// Central place for site-wide info. Edit these to make the site yours.
export const SITE = {
  name: 'Nana',
  brand: 'ANANA',
  fullName: 'Rokhana D. Rusdiati',
  title: 'Nana',
  description:
    'AI/ML Engineer and Data Scientist specializing in NLP and human-centered AI. Founder & AI Researcher at Cognivia AI.',
  email: 'anausername@gmail.com',
  resumeUrl:
    'https://drive.google.com/file/d/1sx6Kdznpueta37EjDHJ7zYRlZiiPNvWs/view?usp=sharing',
  socials: {
    linkedin: 'https://www.linkedin.com/in/ana-rusdiati/',
    medium: 'https://medium.com/@anarusdiati',
    github: 'https://github.com/anarusdiati',
    tableau: 'https://public.tableau.com/app/profile/rokhana.diyah.rusdiati/vizzes',
    instagram: 'https://www.instagram.com/anarusdiati/',
  },
};

// ── Blog stats (views & likes) ──────────────────────────────────────────────
// These power the views/likes on blog posts. Both use FREE services.
// Leave them empty to show only the Share buttons. Fill them in after you sign up.
//
//   goatcounterCode: your GoatCounter site code. If your GoatCounter address is
//                    https://anarusdiati.goatcounter.com, then put 'anarusdiati'.
//                    (Sign up free at https://www.goatcounter.com, and turn ON
//                     Settings → "Allow adding visitor counts on your website".)
//
//   lyketApiKey:     your PUBLIC Lyket API key (safe to expose). Sign up free at
//                    https://lyket.dev, then restrict it to your domain in settings.
export const ANALYTICS = {
  goatcounterCode: 'anarusdiati',
  lyketApiKey: 'pt_27a79e2c61540008bc26f6d40f3953',
  // Set to true to show the view counts on posts. Data keeps collecting in
  // GoatCounter regardless — this only controls whether the number is visible.
  showViews: false,
};

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  // Blog is intentionally hidden from navigation for now — not deleted.
  // The page and its posts still exist at /blog and still build; just
  // uncomment the line below to bring it back into the menu.
  // { href: '/blog', label: 'Blog' },
  { href: '/leisure', label: 'Leisure' },
  { href: '/play', label: 'Play' },
  { href: '/about', label: 'About' },
];
