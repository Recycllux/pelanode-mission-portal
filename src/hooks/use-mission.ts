import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ReplayCommand, type ReviewRequest } from "@/api";

export const MISSION_ID = "HACK-001";
export const NODE_ID = "PN-MVP-001";

export function useReplay() {
  return useQuery({
    queryKey: ["replay", MISSION_ID],
    queryFn: () => api().getReplay(MISSION_ID),
    refetchInterval: (q) => (q.state.data?.state === "running" ? 1000 : false),
  });
}

/** Current mission time (ISO). All data reads are filtered with until=missionTime. */
export function useMissionTime() {
  return useReplay().data?.mission_time;
}

export function useMission() {
  const until = useMissionTime();
  return useQuery({
    queryKey: ["mission", MISSION_ID, until],
    queryFn: () => api().getMission(MISSION_ID),
    enabled: !!until,
    placeholderData: keepPreviousData,
  });
}

export function useTrack() {
  const until = useMissionTime();
  return useQuery({
    queryKey: ["track", MISSION_ID, until],
    queryFn: () => api().getTrack(MISSION_ID, until!),
    enabled: !!until,
    placeholderData: keepPreviousData,
  });
}

export function useEvents() {
  const until = useMissionTime();
  return useQuery({
    queryKey: ["events", MISSION_ID, until],
    queryFn: () => api().listEvents(MISSION_ID, until!),
    enabled: !!until,
    placeholderData: keepPreviousData,
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: () => api().getEvent(id!),
    enabled: !!id,
  });
}

export function useMissionContext() {
  return useQuery({ queryKey: ["context", MISSION_ID], queryFn: () => api().getContext(MISSION_ID) });
}

export function useNodeStatus() {
  const until = useMissionTime();
  return useQuery({
    queryKey: ["node-status", NODE_ID, until],
    queryFn: () => api().getNodeStatus(NODE_ID, MISSION_ID),
    enabled: !!until,
    placeholderData: keepPreviousData,
  });
}

export function useReport() {
  const until = useMissionTime();
  return useQuery({
    queryKey: ["report", MISSION_ID, until],
    queryFn: () => api().getReport(MISSION_ID),
    enabled: !!until,
    placeholderData: keepPreviousData,
  });
}

export function useReplayControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cmd: ReplayCommand) => api().controlReplay(MISSION_ID, cmd),
    onSuccess: (data) => {
      qc.setQueryData(["replay", MISSION_ID], data);
    },
  });
}

export function useReviewEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReviewRequest }) => api().reviewEvent(id, body),
    onSuccess: (data) => {
      qc.setQueryData(["event", data.event.event_id], data.event);
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["mission"] });
      qc.invalidateQueries({ queryKey: ["report"] });
    },
  });
}

export function useResetDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api().resetDemo(MISSION_ID),
    onSuccess: () => qc.invalidateQueries(),
  });
}

/** The Danube gauge data is 2021 (organiser); the 2026 mission is shown against this replay date. */
export const DANUBE_REPLAY_DATE = "2021-10-01";

export function useDanubeGauges(enabled = true) {
  return useQuery({
    queryKey: ["danube-profile", DANUBE_REPLAY_DATE],
    queryFn: () => api().getDanubeProfile(DANUBE_REPLAY_DATE),
    enabled,
    staleTime: Infinity,
  });
}

export function useDanubePoint(lat: number | undefined, lon: number | undefined) {
  return useQuery({
    queryKey: ["danube-point", lat, lon, DANUBE_REPLAY_DATE],
    queryFn: () => api().getDanubePoint(lat!, lon!, DANUBE_REPLAY_DATE),
    enabled: lat != null && lon != null,
    staleTime: Infinity,
  });
}
