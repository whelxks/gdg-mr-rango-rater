// google sign in - tutorials
// https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid#load_the_client_library
// https://www.youtube.com/watch?v=rrSfsxFq0Dw
// https://www.npmjs.com/package/@react-oauth/google

// add relevant calendar scopes
// https://console.cloud.google.com/auth/scopes?inv=1&invt=Abxdug&project=gdg-test-11

// add your account as test user > audience
// cannot use dev email for this project as a test user
// https://stackoverflow.com/questions/75454425/access-blocked-project-has-not-completed-the-google-verification-process

import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { insertActivitiesAndRatings, insertUser } from "~/db/functions";
import { db } from "~/db/db";
import { useNavigate, useOutletContext } from "react-router";
import type { AppRouteContext } from "~/types";
import { askGeminiToFilterEvents } from "~/chatbot/gemini";
import { setWithExpiry } from "~/chatbot/functions";

export const SignIn = () => {
  const navigate = useNavigate();
  const { setUserId } = useOutletContext<AppRouteContext>();

  const getUserEmail = async (accessToken: string) => {
    try {
      const userInfoResponse = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!!userInfoResponse.data.email) {
        const userId = insertUser(db, userInfoResponse.data.email);
        return userId;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch user info", error);
    }
  };

  const fetchCalendarEvents = async (accessToken: string) => {
    // only one month before noe
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    const timeMin = oneMonthAgo.toISOString();
    const timeMax = now.toISOString();

    try {
      const response = await axios.get(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: "startTime",
          },
        }
      );
      const events = response.data.items || [];
      const summaryOfFilteredEvents = events
        .filter((e: { eventType: string }) => e.eventType === "fromGmail")
        .map((f: { summary: string }) => f.summary);
      return summaryOfFilteredEvents;
    } catch (error) {
      console.error("Failed to fetch events", error);
    }
  };

  // not using <GoogleLogin /> component because i need implicit flow
  // using that only gives {credential: string, clientId: string, select_by: "btn"}
  const login = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      //   console.log(codeResponse);
      const accessToken = codeResponse.access_token;
      if (accessToken) {
        const userId = await getUserEmail(accessToken) ?? '';
        const userIdNum = Number(userId);
        setUserId(userIdNum || null);

        // TODO: encrypt or replace with more secure method
        setWithExpiry("Mr_rango_rater_user_id", `${userId}`);

        if (!!userIdNum) {
          const events: string[] = await fetchCalendarEvents(accessToken);
          const filteredActivities = await askGeminiToFilterEvents(events);
          const activityIdArr = await insertActivitiesAndRatings(
            db,
            filteredActivities,
            userIdNum
          );

          // only navigate after everything
          if (activityIdArr) {
            navigate("/");
          }
        }
      } else {
        console.error("No access token received");
      }
    },
    flow: "implicit",
    scope: "https://www.googleapis.com/auth/calendar.readonly", // Add this line
  });

  return (
    <div className="p-5 w-full h-full flex flex-col justify-center">
      <button
        className="flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white py-2 px-4 text-sm text-slate-600 shadow-sm transition-all hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
        onClick={() => login()}
      >
        <img
          src="https://developers.google.com/identity/images/g-logo.png"
          alt="Google"
          className="h-5 w-5"
        />
        <span>Sign in with Google</span>
      </button>
    </div>
  );
};
