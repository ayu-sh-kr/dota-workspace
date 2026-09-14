// @vitest-environment node
import {readFile, stat} from 'node:fs/promises';
import {createPrerenderAssetReader} from '@dota/ssg/asset-reader';

vi.mock('node:fs/promises', () => ({readFile: vi.fn(), stat: vi.fn()}));

describe('createPrerenderAssetReader', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('propagates failed reads and retries without retaining the failure', async () => {
    const error = Object.assign(new Error('missing'), {code: 'ENOENT'});
    vi.mocked(readFile).mockRejectedValueOnce(error).mockResolvedValueOnce(Buffer.from('ready'));
    const read = createPrerenderAssetReader(new Set());

    await expect(read('/guide.md')).rejects.toBe(error);
    await expect(read('/guide.md')).resolves.toEqual({content: Buffer.from('ready'), size: 5});
    expect(readFile).toHaveBeenNthCalledWith(1, '/guide.md');
    expect(readFile).toHaveBeenCalledTimes(2);
  });

  it('propagates HEAD metadata errors without reading a body', async () => {
    const error = Object.assign(new Error('denied'), {code: 'EACCES'});
    vi.mocked(stat).mockRejectedValue(error);
    const read = createPrerenderAssetReader(new Set());

    await expect(read('/guide.md', true)).rejects.toBe(error);
    expect(stat).toHaveBeenCalledWith('/guide.md');
    expect(readFile).not.toHaveBeenCalled();
  });

  it('rejects directories as local files for HEAD requests', async () => {
    vi.mocked(stat).mockResolvedValue({isFile: () => false} as Awaited<ReturnType<typeof stat>>);
    const read = createPrerenderAssetReader(new Set());

    await expect(read('/documents', true)).rejects.toMatchObject({code: 'EISDIR'});
    expect(readFile).not.toHaveBeenCalled();
  });

  it('shares concurrent reads and reuses the result for later requests', async () => {
    let finishRead!: (content: Buffer) => void;
    vi.mocked(readFile).mockReturnValue(new Promise<Buffer>(resolve => {
      finishRead = resolve;
    }));
    const read = createPrerenderAssetReader(new Set());
    const first = read('/guide.md');
    const second = read('/guide.md');
    finishRead(Buffer.from('shared'));

    await expect(Promise.all([first, second])).resolves.toEqual([
      {content: Buffer.from('shared'), size: 6},
      {content: Buffer.from('shared'), size: 6}
    ]);
    await expect(read('/guide.md', true)).resolves.toEqual({content: null, size: 6});
    expect(readFile).toHaveBeenCalledExactlyOnceWith('/guide.md');
    expect(stat).not.toHaveBeenCalled();
  });

  it('reads HEAD metadata without reading or caching file bodies', async () => {
    vi.mocked(stat).mockResolvedValue({size: 123, isFile: () => true} as Awaited<ReturnType<typeof stat>>);
    const read = createPrerenderAssetReader(new Set());

    await expect(read('/large.md', true)).resolves.toEqual({content: null, size: 123});
    expect(stat).toHaveBeenCalledExactlyOnceWith('/large.md');
    expect(readFile).not.toHaveBeenCalled();
  });

  it('reads excluded generated output afresh after it changes', async () => {
    vi.mocked(readFile).mockResolvedValueOnce(Buffer.from('shell')).mockResolvedValueOnce(Buffer.from('page'));
    const read = createPrerenderAssetReader(new Set(['/index.html']));

    await expect(read('/index.html')).resolves.toEqual({content: Buffer.from('shell'), size: 5});
    await expect(read('/index.html')).resolves.toEqual({content: Buffer.from('page'), size: 4});
    expect(readFile).toHaveBeenCalledTimes(2);
  });

  it.each([0, 3])('does not retain a file larger than the %i-byte budget', async maxBytes => {
    vi.mocked(readFile).mockResolvedValue(Buffer.from('four'));
    const read = createPrerenderAssetReader(new Set(), maxBytes);

    await read('/guide.md');
    await expect(read('/guide.md')).resolves.toEqual({content: Buffer.from('four'), size: 4});
    expect(readFile).toHaveBeenCalledTimes(2);
  });

  it('retains files up to the exact total byte budget', async () => {
    vi.mocked(readFile).mockResolvedValue(Buffer.from('ab'));
    const read = createPrerenderAssetReader(new Set(), 4);

    await Promise.all([read('/first'), read('/second'), read('/third')]);
    await Promise.all([read('/first'), read('/second'), read('/third')]);

    expect(readFile).toHaveBeenCalledTimes(4);
    expect(readFile).toHaveBeenLastCalledWith('/third');
  });

  it('caps entries even when their bodies are empty', async () => {
    vi.mocked(readFile).mockResolvedValue(Buffer.alloc(0));
    const read = createPrerenderAssetReader(new Set());
    const files = Array.from({length: 257}, (_, index) => `/asset-${index}`);

    await Promise.all(files.map(file => read(file)));
    await read('/asset-0');
    await read('/asset-256');

    expect(readFile).toHaveBeenCalledTimes(258);
    expect(readFile).toHaveBeenLastCalledWith('/asset-256');
  });

  it('does not share cached bytes between builds', async () => {
    vi.mocked(readFile).mockResolvedValueOnce(Buffer.from('old')).mockResolvedValueOnce(Buffer.from('new'));
    await createPrerenderAssetReader(new Set())('/guide.md');

    await expect(createPrerenderAssetReader(new Set())('/guide.md')).resolves.toEqual({
      content: Buffer.from('new'), size: 3
    });
    expect(readFile).toHaveBeenCalledTimes(2);
  });
});
