import { ref } from 'vue';

const showNavs = ref(true);
let initialized = false;

export const useNavLayout = () => {
  if (!initialized && typeof window !== 'undefined') {
    let lastScrollY = 0;
    let lastScrollTarget: EventTarget | null = null;
    let ticking = false;

    const handleGlobalScroll = (e: Event) => {
      // Ignore input/slider scrolls
      if (e.target instanceof HTMLInputElement) return;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const target = e.target as HTMLElement | Document;
          const currentScrollY = target === document ? window.scrollY : (target as HTMLElement).scrollTop;
          
          let isAtBottom = false;

          if (target !== document) {
              const el = target as HTMLElement;
              // Ignore non-vertical scrolls or elements that aren't significantly scrollable
              if (!el.scrollHeight || !el.clientHeight || el.scrollHeight <= el.clientHeight + 10) {
                  ticking = false;
                  return;
              }
              isAtBottom = Math.abs(el.scrollHeight - el.clientHeight - currentScrollY) < 20;
          } else {
              const el = document.documentElement;
              isAtBottom = Math.abs(el.scrollHeight - el.clientHeight - currentScrollY) < 20;
          }

          // If jumping between different scrolling containers, reset tracker to prevent jumping
          if (lastScrollTarget !== target) {
              lastScrollY = currentScrollY;
              lastScrollTarget = target;
              ticking = false;
              return;
          }

          // Physics for hiding and showing navs
          if (currentScrollY < 50 || isAtBottom) {
             showNavs.value = true;
          } else if (currentScrollY > lastScrollY && currentScrollY - lastScrollY > 15) {
             showNavs.value = false; // Scroll Down -> Hide
          } else if (currentScrollY < lastScrollY && lastScrollY - currentScrollY > 15) {
             showNavs.value = true;  // Scroll Up -> Show
          }
          
          lastScrollY = Math.max(0, currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    // Use capture phase to intercept scroll from ANY child element (like deep lists or AcademyTree)
    window.addEventListener('scroll', handleGlobalScroll, { capture: true, passive: true });
    initialized = true;
  }

  return { showNavs };
};
