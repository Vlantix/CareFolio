# 01 — Live on Vercel, with the CareFolio look

**What to build:** anyone who opens the live URL on a phone or a laptop
sees a CareFolio-branded page: the real logo, the brand fonts and the
brand colours. The shared UI building blocks are ready for every later
screen.

**Blocked by:** None

**Status:** todo

- [ ] The existing Vercel deploy is confirmed working and the live URL
      is at the top of the README
- [x] Brand fonts load: Schibsted Grotesk for headings, Figtree for body
      text
- [x] Colour tokens defined once and used everywhere: primary teal
      #0B6E69, ink #10292C, page background #F3F6F5, borders #D4DFDD,
      muted text #4B6164, orange accent #C2611A, dark-orange text
      #8A4209 on #FDF0E1, navy #0E293C
- [x] The logo uses the official image files from the design folder,
      never redrawn: the mark plus the word "carefolio" in lowercase
      live text, in a light and a dark (on navy) version
- [x] Favicon and app icon are made from the logo mark
- [x] Building blocks exist and match the design: Button, Input with
      label, Card, StatusChip, PageHeader with back button, BottomNav
      (mobile) and Sidebar (desktop)
- [x] Touch targets are at least 44px, real button and label elements
      are used, and text passes WCAG AA contrast
- [x] The page looks right at 360px, 390px and 1280px wide
- [ ] Works on the live URL
