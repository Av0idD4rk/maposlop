import type { CtfEvent } from './types';

function getCookie(name: string): string {
  return (
    document.cookie
      .split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? ''
  );
}

export async function fetchEvents(): Promise<CtfEvent[]> {
  const response = await fetch('/api/v1/events/');
  if (!response.ok) throw new Error('Events unavailable');
  const data = await response.json();
  return data.events as CtfEvent[];
}

export type SubmissionPayload = {
  title: string;
  regionCode: string;
  city: string;
  startsAt: string;
  endsAt?: string;
  website: string;
  details: string;
  contactName: string;
  contactEmail: string;
  company?: string;
};

export async function submitEvent(payload: SubmissionPayload): Promise<string> {
  const response = await fetch('/api/v1/submissions/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': decodeURIComponent(getCookie('csrftoken')),
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(Object.values(data.errors ?? {}).flat().join(' ') || 'Не удалось отправить форму');
  }
  return data.message as string;
}
