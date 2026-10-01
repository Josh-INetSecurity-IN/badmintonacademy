import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { getWeeklyTimetable, getGuestBookings } from '@/services/courts';
import { getCourts } from '@/services/courts';
import type { Court } from '@/types';
import { formatDate } from '@/utils/format';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const TYPE_COLORS: Record<string, string> = {
  batch: 'bg-blue-100 border-blue-400 text-blue-800',
  coaching: 'bg-blue-100 border-blue-400 text-blue-800',
  regular: 'bg-green-100 border-green-400 text-green-800',
  guest: 'bg-amber-100 border-amber-400 text-amber-800',
  maintenance: 'bg-red-100 border-red-400 text-red-800',
};

function getSlotClass(type: string): string {
  return TYPE_COLORS[type.toLowerCase()] ?? 'bg-gray-50 border-gray-300 text-gray-700';
}

export default function CourtSchedulePage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: timetableData, isLoading: timetableLoading } = useQuery({
    queryKey: ['weekly-timetable'],
    queryFn: getWeeklyTimetable,
  });

  const { data: courtsData } = useQuery({
    queryKey: ['courts-for-schedule'],
    queryFn: () => getCourts({ limit: 100 }),
  });
  const courts: Court[] = courtsData?.items ?? [];

  const { data: guestBookingsData } = useQuery({
    queryKey: ['guest-bookings-daily', selectedDate],
    queryFn: () => getGuestBookings({ date: selectedDate, limit: 100 }),
  });
  const guestBookings = guestBookingsData?.items ?? [];

  const timetable: Record<string, any> = timetableData ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Court Schedule"
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        }
      />

      {timetableLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : courts.length === 0 ? (
        <EmptyState title="No courts found" description="Add courts to view the schedule." />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[900px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-muted-foreground w-[150px]">Court</th>
                    {DAYS.map((d) => (
                      <th key={d} className="p-3 font-medium text-center text-muted-foreground">{d.slice(0, 3)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {courts.map((court) => (
                    <tr key={court.id} className="border-b last:border-b-0">
                      <td className="p-3 font-medium">{court.name}</td>
                      {DAY_KEYS.map((day) => {
                        const courtSchedule =
                          timetable[String(court.id)]?.[day] ??
                          timetable[court.name]?.[day] ??
                          [];
                        const slots = Array.isArray(courtSchedule) ? courtSchedule : [];
                        return (
                          <td key={day} className="p-1 align-top">
                            <div className="space-y-1">
                              {slots.length === 0 ? (
                                <div className="text-xs text-muted-foreground text-center py-2">-</div>
                              ) : (
                                slots.map((slot: any, i: number) => (
                                  <div
                                    key={i}
                                    className={`text-xs p-1.5 rounded border ${getSlotClass(slot.type)}`}
                                  >
                                    <div className="font-medium">{slot.startTime} - {slot.endTime}</div>
                                    <div className="truncate">{slot.name ?? slot.batchName ?? ''}</div>
                                    {slot.coach && <div className="text-[10px]">{slot.coach}</div>}
                                  </div>
                                ))
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <span className="font-medium">Legend:</span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-blue-100 border border-blue-400" /> Coaching Batch
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-green-100 border border-green-400" /> Regular Play
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-amber-100 border border-amber-400" /> Guest
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-red-100 border border-red-400" /> Maintenance
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-4">
            Guest Bookings
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {guestBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No guest bookings for this date.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Court</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guestBookings.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.phone}</TableCell>
                    <TableCell>{b.court?.name ?? '-'}</TableCell>
                    <TableCell>{b.startTime} - {b.endTime}</TableCell>
                    <TableCell>{b.numberOfPlayers}</TableCell>
                    <TableCell>{b.amount}</TableCell>
                    <TableCell>{b.paymentStatus}</TableCell>
                    <TableCell>{b.bookingStatus}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
