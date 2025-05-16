import { type RouteConfig, index, route } from "@react-router/dev/routes";

// react router v7 tutorial https://www.youtube.com/watch?v=LSMAKdYG2lA
export default [
  index("routes/home.tsx"),
  route("welcome", "routes/welcome.tsx"),
  route("analytics", "routes/analytics.tsx"),
] satisfies RouteConfig;
