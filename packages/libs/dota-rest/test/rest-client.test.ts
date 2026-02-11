import {RestClient} from "@dota/index.ts";

describe('RestClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should create a RestClient with the correct baseUrl, headers, and timeout', () => {
    const client = RestClient.builder()
      .baseUrl('https://api.example.com')
      .defaultHeaders({'Authorization': 'Bearer token'})
      .timeout(5000)
      .build();

    expect(client).toHaveProperty("config")
    expect(client).toMatchObject({
      "config": {"baseUrl": "https://api.example.com", "headers": {"Authorization": "Bearer token"}, "timout": 5000}
    })
  });

  it('should make a GET request and return the response entity', async () => {
    const mockResponse = new Response(JSON.stringify({key: 'value'}), {
      status: 200,
      headers: {'Content-Type': 'application/json'}
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const client = RestClient.builder()
      .baseUrl('https://api.example.com')
      .defaultHeaders({'Authorization': 'Bearer token'})
      .timeout(5000)
      .build();

    const response = await client.get<{ key: string }>()
      .uri('/test')
      .retrieve()
      .toEntity();

    expect(response.status).toBe(200);
    expect(response.data).toEqual({key: 'value'});
  });

  it('should create a RestRequestMaker with method GET, header, baseUrl and timeout', () => {
    const client = RestClient.builder()
      .baseUrl('https://api.example.com')
      .timeout(5000)
      .build();

    const requestBuilder = client.get<{ key: string }>()

    expect(requestBuilder).toHaveProperty("method", 'GET');
    expect(requestBuilder).toHaveProperty("_baseUri", 'https://api.example.com');
    expect(requestBuilder).toHaveProperty("_timeout", 5000);
  });


  it('should create a RestRequestMaker with method PATCH, header, baseUrl and timeout', () => {
    const client = RestClient.builder()
      .baseUrl('https://api.example.com')
      .timeout(5000)
      .build();

    const requestBuilder = client.patch<{ key: string }>();

    expect(requestBuilder).toHaveProperty("method", 'PATCH');
    expect(requestBuilder).toHaveProperty("_baseUri", 'https://api.example.com');
    expect(requestBuilder).toHaveProperty("_timeout", 5000);
    expect(requestBuilder).toHaveProperty("_defaultHeaders", {"Content-type": "application/json"});
  });

  it('should create a RestRequestMaker with method POST, header, baseUrl and timeout', () => {
    const client = RestClient.builder()
      .baseUrl('https://api.example.com')
      .timeout(5000)
      .build();

    const requestBuilder = client.post();

    expect(requestBuilder).toHaveProperty("method", 'POST')
    expect(requestBuilder).toHaveProperty("_baseUri", 'https://api.example.com')
    expect(requestBuilder).toHaveProperty("_timeout", 5000);
    expect(requestBuilder).toHaveProperty("_defaultHeaders", {"Content-type": "application/json"})
  });

  it('should create a RestRequestMaker with method PUT, header, baseUrl and timeout', () => {
    const client = RestClient.builder()
      .baseUrl('https://api.example.com')
      .timeout(5000)
      .build();

    const requestBuilder = client.put<{ key: string }>();

    expect(requestBuilder).toHaveProperty("method", 'PUT')
    expect(requestBuilder).toHaveProperty("_baseUri", 'https://api.example.com')
    expect(requestBuilder).toHaveProperty("_timeout", 5000);
    expect(requestBuilder).toHaveProperty("_defaultHeaders", {"Content-type": "application/json"})
  });

  it('should create a RestRequestMaker with method DELETE, header, baseUrl and timeout', () => {
    const client = RestClient.builder()
      .baseUrl('https://api.example.com')
      .timeout(5000)
      .build();

    const requestBuilder = client.delete<{ key: string }>();

    expect(requestBuilder).toHaveProperty("method", 'DELETE')
    expect(requestBuilder).toHaveProperty("_baseUri", 'https://api.example.com')
    expect(requestBuilder).toHaveProperty("_timeout", 5000);
    expect(requestBuilder).toHaveProperty("_defaultHeaders", {})
  });

  it('should call the API and resolve response to an entity', async () => {
    const restClient = RestClient.builder()
      .baseUrl('https://api.example.com')
      .defaultHeaders({
        'Content-Type': 'application/json',
      })
      .build();

    const mockResponse = new Response(JSON.stringify({key: 'value'}), {
      status: 200,
      headers: {'Content-Type': 'application/json'}
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const response = await restClient.get<{ key: string }>()
      .uri('/test')
      .retrieve()
      .handler((response) => {
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('application/json');
      })
      .converter((data:any) => {
        expect(data).toEqual({key: 'value'});
        return {
          key: data.key,
        }
      })
      .toEntity();

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.data).toEqual({key: 'value'});
  });
});