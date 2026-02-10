import {RestRequestBuilder} from "@dota/RequestBuilder.ts";

describe('RequestBuilder', () => {

  const createRequestBuilder = (): RestRequestBuilder<any> => {
    return new RestRequestBuilder({
      baseUri: 'https://api.example.com',
      method: 'GET',
      headers: {'Content-Type': 'application/json'},
      timeout: 5000,
    });
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should create a RequestBuilder without failing and have required properties', () => {
    const requestBuilder = createRequestBuilder();

    expect(requestBuilder).toBeDefined();
    expect(requestBuilder).toHaveProperty('_baseUri', 'https://api.example.com');
    expect(requestBuilder).toHaveProperty('method', 'GET');
    expect(requestBuilder).toHaveProperty('_defaultHeaders', {'Content-Type': 'application/json'});
    expect(requestBuilder).toHaveProperty('_timeout', 5000);
    expect(requestBuilder).toHaveProperty('_headers', {});
    expect(requestBuilder).toHaveProperty('_params', new URLSearchParams());
    expect(requestBuilder).toHaveProperty('_body', undefined);
    expect(requestBuilder).toHaveProperty('_handler', undefined);
  });

  it('should set baseURI correctly', () => {
    const requestBuilder = createRequestBuilder();
    expect(requestBuilder).toHaveProperty('_baseUri', 'https://api.example.com');

    requestBuilder.baseURI('https://api.newexample.com');
    expect(requestBuilder).toHaveProperty('_baseUri', 'https://api.newexample.com');
  });

  it('should set uri correctly', () => {
    const requestBuilder = createRequestBuilder();
    expect(requestBuilder).toHaveProperty('_uri', undefined);

    requestBuilder.uri('/endpoint');
    expect(requestBuilder).toHaveProperty('_uri', '/endpoint');
  });

  it('should set header correctly', () => {
    const requestBuilder = createRequestBuilder();
    expect(requestBuilder).toHaveProperty('_headers', {});

    requestBuilder.header('Authorization', 'Bearer token');
    expect(requestBuilder).toHaveProperty('_headers', {'Authorization': 'Bearer token'});
  });

  it('should set headers correctly', () => {
    const requestBuilder = createRequestBuilder();
    expect(requestBuilder).toHaveProperty('_headers', {});

    requestBuilder.headers({'Authorization': 'Bearer token'});
    expect(requestBuilder).toHaveProperty('_headers', {'Authorization': 'Bearer token'});
  });

  it('should set param correctly', () => {
    const requestBuilder = createRequestBuilder();
    expect(requestBuilder).toHaveProperty('_params', new URLSearchParams());

    requestBuilder.param('key', 'value');
    expect(requestBuilder.getParams().get('key')).toBe('value');
  });

  it('should set params correctly', () => {
    const requestBuilder = createRequestBuilder();
    expect(requestBuilder).toHaveProperty('_params', new URLSearchParams());

    const params = new URLSearchParams();
    params.append('key', 'value');

    requestBuilder.params(params);
    expect(requestBuilder.getParams().get('key')).toBe('value');
  });

  it('should set timeout correctly', () => {
    const requestBuilder = createRequestBuilder();
    expect(requestBuilder).toHaveProperty('_timeout', 5000);

    requestBuilder.timeout(10000);
    expect(requestBuilder).toHaveProperty('_timeout', 10000);
  });

  it('should set body correctly', () => {
    const requestBuilder = createRequestBuilder();
    expect(requestBuilder).toHaveProperty('_body', undefined);

    requestBuilder.body({key: 'value'});
    expect(requestBuilder).toHaveProperty('_body', {key: 'value'});
  });

  it('should return a configured ResponseResolver on calling retrieve', async () => {
    const requestBuilder = createRequestBuilder();
    expect(requestBuilder).toHaveProperty('_handler', undefined);

    const mockResponse = new Response(JSON.stringify({ key: 'value' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const responseResolver = requestBuilder.retrieve();
    expect(responseResolver).toBeDefined();

    const entity = await responseResolver.toEntity();
    expect(entity.data).toEqual({ key: 'value' });
  });

})