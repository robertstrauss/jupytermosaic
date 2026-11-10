import {
  drawOverlayIconsOnHover,
  letSelectionsPassOutputControls
} from '../transpose';

// Only the icons come from here, and the package's ESM dependencies do not load
// under jest.
jest.mock('@jupyterlab/ui-components', () => {
  const icon = (name: string) => ({
    element: ({ container }: { container: HTMLElement }) => {
      const svg = document.createElement('svg');
      svg.dataset.icon = name;
      container.replaceChildren(svg);
      return svg;
    }
  });
  return {
    collapseIcon: icon('collapse'),
    expandIcon: icon('expand'),
    moveDownIcon: {},
    moveUpIcon: {}
  };
});

const PRESS_OUTSIDE = 'mosaic-press-outside';

const held = () => document.body.classList.contains(PRESS_OUTSIDE);

const fire = (type: string, target: EventTarget) =>
  target.dispatchEvent(new Event(type, { bubbles: true }));

describe('letSelectionsPassOutputControls', () => {
  let text: HTMLElement;
  let overlay: HTMLElement;
  let icon: HTMLElement;
  let transpose: HTMLElement;

  beforeAll(() => {
    letSelectionsPassOutputControls();
  });

  beforeEach(() => {
    document.body.className = '';
    document.body.innerHTML = `
      <pre id="text">output</pre>
      <div class="jp-OutputArea-promptOverlay"><span id="icon"></span></div>
      <button class="mosaic-transposeOverlay"></button>`;
    text = document.getElementById('text')!;
    icon = document.getElementById('icon')!;
    overlay = icon.parentElement!;
    transpose = document.querySelector('.mosaic-transposeOverlay')!;
  });

  it('passes a press that began off the controls, until its release', () => {
    fire('pointerdown', text);
    expect(held()).toBe(true);
    fire('pointerup', overlay);
    expect(held()).toBe(false);
  });

  it('leaves the controls live for a press that began on them', () => {
    for (const target of [overlay, icon, transpose]) {
      fire('pointerdown', target);
      expect(held()).toBe(false);
      fire('pointerup', target);
    }
  });

  it('recovers when the release never arrives', () => {
    fire('pointerdown', text);
    fire('pointercancel', text);
    expect(held()).toBe(false);

    fire('pointerdown', text);
    window.dispatchEvent(new Event('blur'));
    expect(held()).toBe(false);
  });

  it('corrects itself on the next press after a lost release', () => {
    fire('pointerdown', text);
    fire('pointerdown', overlay);
    expect(held()).toBe(false);
  });
});

describe('drawOverlayIconsOnHover', () => {
  beforeAll(() => {
    drawOverlayIconsOnHover();
  });

  const overlayIn = (cellClass: string, height: number) => {
    document.body.innerHTML = `
      <div class="jp-CodeCell ${cellClass}">
        <div class="jp-OutputArea-promptOverlay"></div>
      </div>`;
    const overlay = document.querySelector(
      '.jp-OutputArea-promptOverlay'
    ) as HTMLElement;
    // jsdom does no layout.
    Object.defineProperty(overlay, 'clientHeight', { value: height });
    return overlay;
  };
  const hover = (el: Element) =>
    el.dispatchEvent(new Event('pointerover', { bubbles: true }));
  const drawn = (el: Element) =>
    (el.firstElementChild as HTMLElement | null)?.dataset.icon;

  it('draws the icon matching the scroll state when hovered', () => {
    const plain = overlayIn('', 300);
    hover(plain);
    expect(drawn(plain)).toBe('collapse');
    expect(plain.title).toBe('Collapse Output');

    const scrolled = overlayIn('jp-mod-outputsScrolled', 300);
    hover(scrolled);
    expect(drawn(scrolled)).toBe('expand');
    expect(scrolled.title).toBe('Expand Output');
  });

  it('leaves an overlay too short for the icon empty', () => {
    const short = overlayIn('', 24);
    hover(short);
    expect(short.childElementCount).toBe(0);
  });

  it('keeps an icon JupyterLab already drew', () => {
    const overlay = overlayIn('', 300);
    const existing = document.createElement('svg');
    overlay.appendChild(existing);
    hover(overlay);
    expect(overlay.firstElementChild).toBe(existing);
  });
});
