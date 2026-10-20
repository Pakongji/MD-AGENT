import { CalendarPage } from "@/features/calendar/calendar-page";
export default async function Page({ searchParams }: { searchParams: Promise<{ month?: string | string[] }> }) {
  const month = (await searchParams).month;
  return <CalendarPage initialMonth={Array.isArray(month) ? month[0] : month} />;
}
