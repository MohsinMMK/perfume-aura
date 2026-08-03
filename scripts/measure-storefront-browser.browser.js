(async () => {
  const webVitals = await new Promise((resolve) => {
    const result = {
      lcpMs: null,
      cls: 0,
      longTaskCount: 0,
      longestTaskMs: 0,
    };
    let pendingObservers = 3;
    const finishObserver = () => {
      pendingObservers -= 1;
      if (pendingObservers === 0) resolve(result);
    };

    for (const [type, key] of [
      ["largest-contentful-paint", "lcp"],
      ["layout-shift", "cls"],
      ["longtask", "longtask"],
    ]) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (key === "lcp") {
              result.lcpMs = entry.startTime;
            } else if (key === "cls" && !entry.hadRecentInput) {
              result.cls += entry.value;
            } else if (key === "longtask") {
              result.longTaskCount += 1;
              result.longestTaskMs = Math.max(
                result.longestTaskMs,
                entry.duration,
              );
            }
          }
        });
        observer.observe({ type, buffered: true });
        setTimeout(() => {
          observer.disconnect();
          finishObserver();
        }, 100);
      } catch {
        finishObserver();
      }
    }
  });

  const resources = performance.getEntriesByType("resource");
  const summarizeResources = (entries) => ({
    count: entries.length,
    encodedBytes: entries.reduce(
      (total, entry) => total + (entry.encodedBodySize || 0),
      0,
    ),
    decodedBytes: entries.reduce(
      (total, entry) => total + (entry.decodedBodySize || 0),
      0,
    ),
  });
  const fetches = resources.filter(
    (entry) =>
      entry.initiatorType === "fetch" ||
      entry.initiatorType === "xmlhttprequest",
  );
  const routePrefetches = fetches.filter(
    (entry) =>
      new URL(entry.name).origin === window.location.origin &&
      new URL(entry.name).searchParams.has("_rsc"),
  );
  const cartRequests = fetches.filter(
    (entry) => new URL(entry.name).pathname === "/api/cart",
  );
  const scripts = resources.filter((entry) => entry.initiatorType === "script");
  const images = resources.filter((entry) => entry.initiatorType === "img");
  const fonts = resources.filter((entry) => /\.woff2?(?:$|\?)/.test(entry.name));
  const styles = resources.filter(
    (entry) => entry.initiatorType === "link" && entry.name.includes(".css"),
  );

  const motion = Array.from(document.querySelectorAll("*")).map((element) => {
    const styles = getComputedStyle(element);
    return {
      animationDuration: styles.animationDuration,
      transitionDuration: styles.transitionDuration,
    };
  });
  const durationInMilliseconds = (value) => {
    const duration = Number.parseFloat(value);
    return value.includes("ms") ? duration : duration * 1000;
  };
  const maxDuration = (property) =>
    Math.max(
      0,
      ...motion.flatMap((entry) =>
        entry[property]
          .split(",")
          .map((value) => durationInMilliseconds(value.trim())),
      ),
    );

  const navigation = performance.getEntriesByType("navigation")[0];

  return {
    userAgent: navigator.userAgent,
    viewport: {
      width: innerWidth,
      height: innerHeight,
      devicePixelRatio,
    },
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    maxAnimationMs: maxDuration("animationDuration"),
    maxTransitionMs: maxDuration("transitionDuration"),
    navigation: navigation
      ? {
          responseStartMs: navigation.responseStart,
          domContentLoadedMs: navigation.domContentLoadedEventEnd,
          loadMs: navigation.loadEventEnd,
          encodedBytes: navigation.encodedBodySize,
          decodedBytes: navigation.decodedBodySize,
        }
      : null,
    scripts: summarizeResources(scripts),
    styles: summarizeResources(styles),
    images: summarizeResources(images),
    fonts: summarizeResources(fonts),
    fetches: summarizeResources(fetches),
    routePrefetches: summarizeResources(routePrefetches),
    cartRequests: summarizeResources(cartRequests),
    resources: summarizeResources(resources),
    ...webVitals,
  };
})()
