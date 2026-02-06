import { useQuery, gql } from "@apollo/client";
import { SchedulesList } from "@/components/schedules-list";
import { AddScheduleDialog } from "@/components/add-schedule-dialog";

export const GET_SCHEDULES = gql`
  query GetSchedules {
    schedules {
      id
      name
      year
      quarter
      createdAt
    }
  }
`;

export default function Schedules() {
  const { loading, error, data } = useQuery(GET_SCHEDULES);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Schedules</h1>
        <AddScheduleDialog />
      </div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && <SchedulesList schedules={data.schedules} />}
    </>
  );
}
