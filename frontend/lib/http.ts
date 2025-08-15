
export async function request(method: string, endpoint: string, body: object) {
  const url = `http://127.0.0.1:8080${endpoint}`;
  let payload: RequestInit =
    { method, headers: { "Content-Type": "application/json" } };
  if (body) payload.body = JSON.stringify(body);

  const response = await fetch(url, payload);
  const data = await response.json();

  if (!response.ok)
    throw new Error(data.detail ?? "Unknown error");
  return data;
}

