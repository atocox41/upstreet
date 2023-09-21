const arrayEquals = (a, b) => {
  if (a.length !== b.length) {
    return false;
  } else {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }
};
const objectEquals = (a, b) => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  } else {
    for (const k of aKeys) {
      if (a[k] !== b[k]) {
        return false;
      }
    }
    return true;
  }
};

//

class Router extends EventTarget {
  constructor() {
    super();

    // this.currentTab = '';
    // this.currentKey = '';
    this.currentSlugs = [];

    // listen for history events
    const _update = () => {
      this.handleUrlUpdate(globalThis.location.href);
    };
    globalThis.addEventListener('popstate', _update);
    globalThis.addEventListener('load', _update, {
      once: true,
    });
  }
  pushUrl(u) {
    globalThis.history.pushState({}, '', u);
    this.handleUrlUpdate(u);
  }
  handleUrlUpdate(urlString) {
    const u = new URL(urlString);
    const pathname = u.pathname;
    const slugs = pathname.replace(/^\//, '').split('/');
    const query = Object.fromEntries(u.searchParams.entries());
    if (!arrayEquals(this.currentSlugs, slugs) || !objectEquals(this.currentQuery, query)) {
      this.currentSlugs = slugs;
      this.currentQuery = query;
      this.dispatchEvent(new MessageEvent('slugschange', {
        data: {
          slugs,
          query,
        },
      }));
    }
  }
}
const router = new Router();
export const useRouter = () => {
  return router;
};