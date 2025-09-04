
export async function request(method: string, endpoint: string, body?: object, jwt?: string) {
  let headers: HeadersInit = { "Content-Type": "application/json" };
  if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
  let payload: RequestInit = { method, headers };
  if (body) payload.body = JSON.stringify(body);

  const url = `${process.env.EXPO_PUBLIC_API_URL}:8080${endpoint}`;
  const response = await fetch(url, payload);
  const data = await response.json();

  if (!response.ok) throw new Error(data.error ?? "Unknown error");
  return data;
}

export function formatDate(date: Date, length: "string") {
  const opts = { year: "numeric", month: length, day: "numeric" };
  return new Intl.DateTimeFormat("en-US", opts).format(date);
}

export function weekIndex(date: Date): number {
  let target = new Date(date.valueOf());
  let dayInWeek = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayInWeek + 3);

  let firstThursday = target.valueOf();

  target.setMonth(0, 1);
  if (target.getDay() != 4)
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);

  return 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
}
