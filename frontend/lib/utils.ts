export async function request(
  method: string,
  endpoint: string,
  body?: object,
  jwt?: string,
) {
  let headers: HeadersInit = { "Content-Type": "application/json" };
  if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
  let payload: RequestInit = { method, headers };
  if (body) payload.body = JSON.stringify(body);

  const url = `http://127.0.0.1:8080${endpoint}`;
  const response = await fetch(url, payload);
  const data = await response.json();

  if (!response.ok) throw new Error(data.detail ?? "Unknown error");
  return data;
}

export function formatDate(date: Date, onlyMonth?: boolean) {
  const opts =
    onlyMonth !== undefined
      ? { month: "long" }
      : { year: "numeric", month: "long", day: "numeric" };
  return new Intl.DateTimeFormat("en-US", opts).format(date);
}
