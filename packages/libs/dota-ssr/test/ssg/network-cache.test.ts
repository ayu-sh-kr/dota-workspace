// @vitest-environment node
import {Window} from 'happy-dom';
import {createPrerenderNetworkCache} from '@dota/ssg/network-cache';

describe('createPrerenderNetworkCache', () => {
  let window: Window;
  let otherWindow: Window;

  beforeEach(() => {
    window = new Window({url: 'http://dota.ssg/a'});
    otherWindow = new Window({url: 'http://dota.ssg/b'});
  });

  afterEach(async () => {
    await window.happyDOM.close();
    await otherWindow.happyDOM.close();
  });

  it('fetches a remote asset once and gives each route window its own response', async () => {
    const networkFetch = vi.fn<Window['fetch']>().mockResolvedValue(new window.Response('<svg/>', {
      status: 200,
      headers: {'content-type': 'image/svg+xml'}
    }));
    const fetchNetwork = createPrerenderNetworkCache();

    const [first, concurrent] = await Promise.all([
      fetchNetwork(window, networkFetch, 'https://api.iconify.design/mdi:github.svg'),
      fetchNetwork(window, networkFetch, new URL('https://api.iconify.design/mdi:github.svg'))
    ]);
    const later = await fetchNetwork(otherWindow, networkFetch, 'https://api.iconify.design/mdi:github.svg');

    expect(networkFetch).toHaveBeenCalledOnce();
    expect(later).toBeInstanceOf(otherWindow.Response);
    expect(later.headers.get('content-type')).toBe('image/svg+xml');
    await expect(first.text()).resolves.toBe('<svg/>');
    await expect(concurrent.text()).resolves.toBe('<svg/>');
    await expect(later.text()).resolves.toBe('<svg/>');
  });

  it('replays an error status so every page of the build sees the same answer', async () => {
    const networkFetch = vi.fn<Window['fetch']>().mockResolvedValue(new window.Response('busy', {status: 429, statusText: 'Too Many Requests'}));
    const fetchNetwork = createPrerenderNetworkCache();

    await fetchNetwork(window, networkFetch, 'https://api.example.com/data');
    const replayed = await fetchNetwork(otherWindow, networkFetch, 'https://api.example.com/data');

    expect(networkFetch).toHaveBeenCalledOnce();
    expect(replayed.status).toBe(429);
    expect(replayed.statusText).toBe('Too Many Requests');
  });

  it('retries a request that failed without a response', async () => {
    const networkFetch = vi.fn<Window['fetch']>()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(new window.Response('ok'));
    const fetchNetwork = createPrerenderNetworkCache();

    await expect(fetchNetwork(window, networkFetch, 'https://api.example.com/data')).rejects.toThrow('offline');
    const retried = await fetchNetwork(otherWindow, networkFetch, 'https://api.example.com/data');

    expect(networkFetch).toHaveBeenCalledTimes(2);
    await expect(retried.text()).resolves.toBe('ok');
  });

  it.each([
    ['a POST request', {method: 'POST', body: '{}'}],
    ['a request with headers', {headers: {authorization: 'Bearer token'}}]
  ])('sends %s to the network every time', async (_, init) => {
    const networkFetch = vi.fn<Window['fetch']>().mockImplementation(async () => new window.Response('fresh'));
    const fetchNetwork = createPrerenderNetworkCache();

    await fetchNetwork(window, networkFetch, 'https://api.example.com/data', init);
    await fetchNetwork(window, networkFetch, 'https://api.example.com/data', init);

    expect(networkFetch).toHaveBeenCalledTimes(2);
    expect(networkFetch).toHaveBeenCalledWith('https://api.example.com/data', init);
  });

  it('sends Request objects to the network every time', async () => {
    const networkFetch = vi.fn<Window['fetch']>().mockImplementation(async () => new window.Response('fresh'));
    const fetchNetwork = createPrerenderNetworkCache();
    const request = new window.Request('https://api.example.com/data');

    await fetchNetwork(window, networkFetch, request);
    await fetchNetwork(window, networkFetch, request);

    expect(networkFetch).toHaveBeenCalledTimes(2);
  });

  it('does not retain responses when caching is disabled', async () => {
    const networkFetch = vi.fn<Window['fetch']>().mockImplementation(async () => new window.Response('fresh'));
    const fetchNetwork = createPrerenderNetworkCache(0);

    await fetchNetwork(window, networkFetch, 'https://api.example.com/data');
    await fetchNetwork(window, networkFetch, 'https://api.example.com/data');

    expect(networkFetch).toHaveBeenCalledTimes(2);
  });
});
