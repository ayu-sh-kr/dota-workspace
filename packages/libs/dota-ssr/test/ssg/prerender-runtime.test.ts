import {Window} from 'happy-dom';
import {closePrerenderWindow} from '@dota/ssg/prerender-runtime';

/** Builds a window whose custom element removes a body-level panel when it disconnects, like a popover. */
const createPortalWindow = (): Window => {
  const window = new Window();
  const {document} = window;
  window.customElements.define('portal-host', class extends window.HTMLElement {
    disconnectedCallback(): void {
      document.getElementById('portal-panel')?.remove();
    }
  });
  document.body.innerHTML = '<main><portal-host></portal-host></main><div id="portal-panel"></div><footer></footer>';
  return window;
};

describe('closePrerenderWindow', () => {
  it('closes a window whose disconnect callbacks remove other body nodes', async () => {
    const window = createPortalWindow();

    await expect(closePrerenderWindow(window)).resolves.toBeUndefined();
    expect(window.document.body.childNodes).toHaveLength(0);
  });

  it('reproduces the happy-dom teardown failure it works around', async () => {
    const window = createPortalWindow();

    await expect(Promise.resolve().then(() => window.happyDOM.close())).rejects.toThrow(TypeError);
  });
});
