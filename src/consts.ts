// Central place for site-wide info. Edit these to make the site yours.
export const SITE = {
  name: 'Nana',
  brand: 'ANANA',
  fullName: 'Rokhana D. Rusdiati',
  title: 'Rokhana D. Rusdiati — AI/ML Engineer & Data Scientist',
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
  goatcounterCode: '',
  lyketApiKey: '',
};

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/blog', label: 'Blog' },
  { href: '/hobby', label: 'Hobby' },
  { href: '/about', label: 'About' },
];
