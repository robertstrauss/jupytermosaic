import { letSelectionsPassOutputControls } from '../transpose';

// Only the icons come from here, and the package's ESM dependencies do not load
// under jest.
jest.mock('@jupyterlab/ui-components', () => ({
  moveDownIcon: {},
  moveUpIcon: {}
}));

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
