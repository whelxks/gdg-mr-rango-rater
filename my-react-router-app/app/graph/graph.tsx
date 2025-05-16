import { useEffect, useState } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { getAllRatings } from "~/db/functions";
import { db } from "~/db/db";
type IActivityCard = {
  topic: string;
  rating: number;
  activity: string;
};

type GroupedTopic = {
  total: number;
  count: number;
};

type Output = {
  [key: number]: IActivityCard[];
};

export const Graph = () => {
  const [ratings, setRatings] = useState<Output>([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      const result = await getAllRatings(db);
      const ratedQuestions = result.filter((q) => q.rating !== 0);

      const grouped: {
        [activityId: number]: {
          activity: string;
          topics: {
            [topic: string]: GroupedTopic;
          };
        };
      } = {};

      ratedQuestions.forEach(({ activity_id, activity, topic, rating }) => {
        if (!grouped[activity_id]) {
          grouped[activity_id] = {
            activity,
            topics: {},
          };
        }

        if (!grouped[activity_id].topics[topic]) {
          grouped[activity_id].topics[topic] = { total: 0, count: 0 };
        }

        grouped[activity_id].topics[topic].total += rating;
        grouped[activity_id].topics[topic].count += 1;
      });

      const output: Output = {};
      for (const [activityIdStr, { activity, topics }] of Object.entries(
        grouped
      )) {
        const activityId = Number(activityIdStr);
        output[activityId] = Object.entries(topics).map(
          ([topic, { total, count }]) => ({
            topic: topic,
            rating: parseFloat((total / count).toFixed(2)),
            activity,
          })
        );
      }

      // const output = Object.entries(grouped).reduce((acc, [activityId, { activity, topics }]) => {
      //   (acc)[activityId] = Object.entries(topics).map(([topic, { total, count }]) => ({
      //     name: topic,
      //     rating: parseFloat((total / count).toFixed(2)),
      //     activity: activity
      //   }));
      //   return acc;
      // }, {});
      setRatings(output);
    };

    fetchQuestions();
  }, []);

  return (
    <div className="p-5 w-full h-full flex flex-col">
      {/* heading */}
      <div className="flex flex-col space-y-1.5 pb-5">
        <h2 className="font-semibold text-lg tracking-tight">Admin</h2>
        <p className="text-sm text-[#6b7280]">
          summary of average ratings for all rated activities
        </p>
      </div>

      {/* content */}
      {Object.keys(ratings).length > 0 ? (
        <div className="flex flex-col gap-5">
          {Object.entries(ratings).map(([key, value]) => (
            <ActivityCard key={key} data={value} />
          ))}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <Spin />
        </div>
      )}
    </div>
  );
};

const ActivityCard = ({ data }: { data: IActivityCard[] }) => {
  const averageRatingForActivity =
    data.reduce((sum, review) => sum + review.rating, 0) / data.length;

  return (
    <div className="flex p-10 bg-[#c3cbf4] rounded-lg gap-10">
      <div className="flex flex-col gap-5">
        <h2 className="font-semibold text-lg tracking-tight">
          {data[0].activity}
        </h2>
        <h1 className="font-bold text-3xl tracking-tight">
          Average Rating: {averageRatingForActivity}/5
        </h1>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart width={150} height={40} data={data}>
          <XAxis dataKey="topic" tick={false} interval={0} />
          <YAxis dataKey="rating" hide />
          <Tooltip />
          <Bar dataKey="rating" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const Spin = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      className="aspect-square animate-spin w-8 text-[#2037b1]"
    >
      <path
        d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
        opacity="0.3"
        fill="currentColor"
      />
      <path
        fill="currentColor"
        d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"
      />
    </svg>
  );
};
