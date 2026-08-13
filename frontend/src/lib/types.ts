export type CtfEvent = {
  id: number;
  title: string;
  regionCode: string;
  regionName: string;
  city: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  format: string;
  participationMode: 'offline' | 'online' | 'hybrid';
  description: string;
  website: string;
  organizer: string;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: 'city' | 'region';
  geodataSource: string;
  geodataSourceUrl: string;
};

export type Region = {
  id: string;
  name: string;
  fragments: number;
  color: string;
};
