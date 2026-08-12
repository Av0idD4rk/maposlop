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
  description: string;
  website: string;
  organizer: string;
};

export type Region = {
  id: string;
  name: string;
  fragments: number;
  color: string;
};
