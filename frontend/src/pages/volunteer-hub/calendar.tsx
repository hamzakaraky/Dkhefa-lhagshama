import VolunteerGate from '@/components/volunteer-app/VolunteerGate'
import VolunteerCalendarPage from '@/screens/volunteer-app/VolunteerCalendarPage'

export default function VolunteerHubCalendar() {
  return (
    <VolunteerGate>
      <VolunteerCalendarPage />
    </VolunteerGate>
  )
}
