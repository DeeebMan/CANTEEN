export async function exportToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const html2pdf = (await import("html2pdf.js")).default;

  // Collect computed styles from original DOM (colors resolved to rgb())
  function inlineComputedStyles(origEl: Element, clonedEl: Element) {
    const computed = window.getComputedStyle(origEl);
    const htmlEl = clonedEl as HTMLElement;
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      try {
        htmlEl.style.setProperty(prop, computed.getPropertyValue(prop));
      } catch {
        // skip unsettable properties
      }
    }
    for (let i = 0; i < origEl.children.length && i < clonedEl.children.length; i++) {
      inlineComputedStyles(origEl.children[i], clonedEl.children[i]);
    }
  }

  const opt = {
    margin: 5,
    filename,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      scrollY: 0,
      onclone: (clonedDoc: Document) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          inlineComputedStyles(element, clonedElement);
        }
        // Remove all stylesheets to prevent lab/oklch parsing errors
        clonedDoc
          .querySelectorAll('link[rel="stylesheet"], style')
          .forEach((el) => el.remove());
      },
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
  };

  html2pdf().set(opt).from(element).save();
}
