import { ref, watch, onMounted, onUnmounted } from 'vue';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'imgcompress.theme';

function detectInitial(): Theme {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  }
  if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function useTheme() {
  const theme = ref<Theme>(detectInitial());

  const apply = (t: Theme) => {
    document.documentElement.dataset.theme = t;
  };

  apply(theme.value);

  watch(theme, (t) => {
    apply(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* storage may be disabled */
    }
  });

  let mql: MediaQueryList | null = null;
  const onSystemChange = (e: MediaQueryListEvent) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      theme.value = e.matches ? 'dark' : 'light';
    }
  };

  onMounted(() => {
    if (typeof matchMedia !== 'undefined') {
      mql = matchMedia('(prefers-color-scheme: dark)');
      mql.addEventListener('change', onSystemChange);
    }
  });
  onUnmounted(() => {
    mql?.removeEventListener('change', onSystemChange);
  });

  const toggle = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  };

  return { theme, toggle };
}
