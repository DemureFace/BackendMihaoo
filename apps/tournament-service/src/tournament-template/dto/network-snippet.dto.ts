export interface NetworkSnippet<TParams> {
  type: 'network';
  params: TParams;
}

export interface BhSnippetParams {
  name: string;
  startDate: string;
  finishDate: string;
  bgImageSrc: string;
  pool: string;
  notShowForGeoIps: string[];
  link: string;
}

export interface SgSnippetParams {
  startTime: string;
  endTime: string;
  pool: string;
  name: string;
  bet: string;
  timerText: string;
  bgImageSrc: string;
  link: string;
  notShowForGeoIps: string[];
}

export interface MwSnippetParams {
  notShowForGeoIps: string[];
  name: string;
  ipPool: Record<string, string>;
  link: string;
  bgImageSrc: string;
}

export interface MwSnippet {
  startTime: string;
  endTime: string;
  params: MwSnippetParams;
  category: 'network';
}
