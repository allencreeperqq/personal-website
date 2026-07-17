(function () {
  function preloadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  async function init({ layerAId, layerBId, images, intervalMs = 20000 }) {
    const layerA = document.getElementById(layerAId);
    const layerB = document.getElementById(layerBId);
    if (!layerA || !layerB || !Array.isArray(images) || images.length === 0) return;

    let index = 0;
    let showingA = true;

    layerA.style.backgroundImage = `url("${images[0]}")`;
    layerA.classList.add("is-active");

    if (images.length < 2) return;

    async function rotate() {
      index = (index + 1) % images.length;
      const nextSrc = images[index];
      const ok = await preloadImage(nextSrc);
      if (!ok) return; // 圖片載入失敗就跳過這一輪，下次間隔再試下一張

      const incoming = showingA ? layerB : layerA;
      const outgoing = showingA ? layerA : layerB;
      incoming.style.backgroundImage = `url("${nextSrc}")`;
      incoming.classList.add("is-active");
      outgoing.classList.remove("is-active");
      showingA = !showingA;
    }

    setInterval(rotate, intervalMs);
  }

  window.BackgroundRotation = { init };
})();
