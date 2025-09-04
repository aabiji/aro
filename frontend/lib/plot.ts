export type Vec2 = { x: number; y: number };
export type ToVec2 = (v: any) => Vec2;

export interface PlotPoint {
  date: Date;
  weight?: number;
  averageReps?: number;
  distance?: number;
  duration?: number;
}

export interface MonthInterval {
  index: number; // Index inside the array of plot points marking the new month
  elapsed: number; // Number of months between this interval and the next interval
}

// Get the perpendicular distance from a point (p0), to a line segment (p1 to p2)
// Taken from [here](https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line)
export function perpendicularDistance(p0: Vec2, p1: Vec2, p2: Vec2) {
  const num = (p2.y - p1.y) * p0.x - (p2.x - p1.x) * p0.y + p2.x * p1.y - p2.y * p1.x;
  const den = (p2.y - p1.y) * (p2.y - p1.y) + (p2.x - p1.x) * (p2.x - p1.x);
  return Math.abs(num) / Math.sqrt(den);
}

// Algorithm to simplify a curve by removing points
// Taken from [here](https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm)
function ramerDouglasPeuker(points: any[], epsilon: number, toVec2: (v: any) => Vec2): any[] {
  // find the point with the max distance to the current line segment
  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(
      toVec2(points[i]),
      toVec2(points[0]),
      toVec2(points[points.length - 1]),
    );
    if (d > maxDistance) {
      maxDistance = d;
      index = i;
    }
  }

  // this works because as we recurse more and more, we're
  // selectively *ignoring* points, which simplifies the plot
  let resultingPoints: any[] = [];
  if (maxDistance > epsilon) {
    const left = ramerDouglasPeuker(points.slice(0, index), epsilon, toVec2);
    const right = ramerDouglasPeuker(points.slice(index), epsilon, toVec2);
    resultingPoints = [...left.slice(-1), ...right];
  } else {
    resultingPoints = [points[0], points[points.length - 1]];
  }

  return resultingPoints;
}

export function simplifyGraph(points: any[], targetLength: number, toVec2: ToVec2): Promise<any[]> {
  if (points.length <= targetLength) return Promise.resolve(points);

  const epsilon = Math.floor(points.length / targetLength / 2);
  return Promise.resolve(ramerDouglasPeuker(points, epsilon, toVec2));
}

export function monthDiff(earliest: Date, latest: Date): number {
  const years = latest.getFullYear() - earliest.getFullYear();
  return Math.abs(latest.getMonth() - earliest.getMonth() + 12 * years);
}

// get the index of the plot point that's n months in the past
export function getMonthIndex(monthIntervals: MonthInterval[], n: number): number {
  let count = 0;
  let start = 0;

  for (let i = monthIntervals.length - 1; i >= 0; i--) {
    const m = monthIntervals[i];
    count += m.elapsed;
    if (count >= n) {
      start = m.index;
      break;
    }
  }

  return start;
}

export function processData(data: PlotPoint[]) {
  let copy = [...data];

  // sort earliest to latest
  copy.sort((a, b) => a.date.getTime() - b.date.getTime());

  // get the month intervals
  let monthIntervals = [{ elapsed: 1, index: 0 }];
  for (let index = 1; index < copy.length; index++) {
    const date = copy[index].date;
    const prev = copy[index - 1].date;
    if (date.getMonth() !== prev.getMonth())
      monthIntervals.push({ elapsed: monthDiff(prev, date), index });
  }

  return { sortedData: copy, monthIntervals };
}
