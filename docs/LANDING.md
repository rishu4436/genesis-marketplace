# Genesis cinematic landing

Immersive single-page home for the BNB Chain **Build the Era** marketplace.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack (landing)

| Library | Role |
|---------|------|
| **Next.js** (App Router) | Page at `/` → `LandingPage` |
| **Tailwind CSS v4** | Layout, glass panels, responsive |
| **Framer Motion** | Scroll-linked hero scale/fade, `whileInView` reveals |
| **Lenis** | Smooth scrolling (disabled when `prefers-reduced-motion`) |
| **Canvas** | Ambient particles + soft nebula (in `LandingBackground`) |

## Structure

1. Hero — kinetic headline, 200k+ agents story, CTAs  
2. Problem — fragmentation  
3. Solution — Genesis front door  
4. Four categories — equal depth cards  
5. Specialists strip  
6. How it works — 4 steps  
7. Why Genesis  
8. Final CTA  

## Files

- `src/components/landing/LandingPage.tsx`
- `src/components/landing/LandingBackground.tsx`
- `src/app/page.tsx`

## Accessibility

- `useReducedMotion()` skips Lenis and heavy transforms  
- Canvas particle motion reduced under `prefers-reduced-motion`
