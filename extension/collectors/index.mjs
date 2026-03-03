import { xiaohongshuAdapter } from "./xiaohongshu.mjs";

const COLLECTOR_LIST = [xiaohongshuAdapter];

export function getCollectorByUrl(url) {
  return COLLECTOR_LIST.find((collector) => collector.match(url)) || null;
}

export function getCollectorById(id) {
  return COLLECTOR_LIST.find((collector) => collector.id === id) || null;
}

export function listCollectors() {
  return [...COLLECTOR_LIST];
}
