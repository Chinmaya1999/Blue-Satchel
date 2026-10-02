import { useEffect, useRef, useState } from "react";
import api from "../api/axios.js";
import { usePoll } from "./usePoll.js";
import { playNotifySound } from "../utils/notifySound.js";

// For admins: how many customers are waiting for a reply. Plays a chime when a
// new message arrives and flags the tab title so it's noticed in the background.
export const useAdminSupportAlerts = (enabled, { alert = true } = {}) => {
  const [state, setState] = useState({ count: 0, messages: 0, latest: [] });
  const seen = useRef(null); // total waiting messages at the last poll
  const baseTitle = useRef(null);

  usePoll(
    () =>
      api
        .get("/admin/support/unread")
        .then(({ data }) => {
          if (alert && seen.current !== null && data.messages > seen.current) playNotifySound();
          seen.current = data.messages;
          setState(data);
        })
        .catch(() => {}),
    6000,
    enabled
  );

  useEffect(() => {
    if (!enabled || !alert) return undefined;
    if (baseTitle.current === null) baseTitle.current = document.title.replace(/^\(\d+\) /, "");
    document.title = state.messages ? `(${state.messages}) ${baseTitle.current}` : baseTitle.current;
    return undefined;
  }, [enabled, alert, state.messages]);

  return state;
};
