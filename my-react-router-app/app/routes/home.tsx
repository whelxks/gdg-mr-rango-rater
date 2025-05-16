import type { Route } from "./+types/home";
import { Chatbot } from '../chatbot/chatbot';
import { useOutletContext } from "react-router";
import { SignIn } from "~/signIn/signIn";
import type { AppRouteContext } from "~/types";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New Rating App" },
    { name: "Description", content: "Mr Rango Rater will give you prompts!" },
  ];
}

export default function Home() {
  const { userId } = useOutletContext<AppRouteContext>();
  return !userId ? <SignIn /> : <Chatbot userId={userId} />;
}
