import { useEffect, useRef, useState } from "react";
import { Rating } from "react-simple-star-rating";
import { messageFromAi, messageFromUser } from "./components";
import { getAllQuestionsFromRatingTable, updateRating } from "~/db/functions";
import { db } from "~/db/db";
import type { IRatingRow } from "./types";

// provides `loaderData` to the component
// export async function loader({ params }: Route.LoaderArgs) {
// }

// constants
const tooltipArray = ["Terrible", "Bad", "Average", "Great", "Awesome"];

export const Chatbot = ({ userId }: { userId: number }) => {
  const [allQuestions, setAllQuestions] = useState<IRatingRow[]>([]);
  const [rating, setRating] = useState<{ [key: number]: number }>({}); // {key = ratingId, value = rating}
  const [currentRating, setCurrentRating] = useState<number>(0); // just to reset

  let unratedQuestions = allQuestions.filter((q) => q.rating === 0);
  let ratedQuestions = allQuestions.filter((q) => q.rating !== 0);

  // ratings
  const handleRating = (
    ratingId: number,
    rating: number,
    isUnratedBefore: boolean = false
  ) => {
    console.log(ratingId, rating);
    setRating((prev) => ({ ...prev, [ratingId]: rating }));
    if (isUnratedBefore) {
      setCurrentRating(rating);
    }
  };

  const submitRating = async (
    ratingId: number,
    isUnratedBefore: boolean = false
  ) => {
    try {
      const newRating = rating[ratingId];
      await updateRating(db, newRating, ratingId);

      // set new questions state so dn to fetch from db
      setAllQuestions((prev) =>
        prev.map((p) => (p.id === ratingId ? { ...p, rating: newRating } : p))
      );

      if (isUnratedBefore && unratedQuestions.length > 1) {
        const firstElement = unratedQuestions.shift(); // remove the first entry
        ratedQuestions = [...ratedQuestions, firstElement as IRatingRow];
        setCurrentRating(0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!userId) return;
      const result = await getAllQuestionsFromRatingTable(db, userId);
      setAllQuestions(result);
      const allRatings = result.reduce((acc, item) => {
        acc[item.id] = item.rating;
        return acc;
      }, {} as Record<number, number>);
      setRating(allRatings);
    };

    fetchQuestions();
  }, [userId]);

  return (
    <div className="p-5 w-full h-full flex flex-col">
      {/* heading */}
      <div className="flex flex-col space-y-1.5 pb-6">
        <h2 className="font-semibold text-lg tracking-tight">Mr Rango Rater</h2>
        <p className="text-sm text-[#6b7280]">
          this is a chatbot for getting ratings on any tourist related
          activities
        </p>
      </div>

      {/* chat container */}
      <ChatContainer
        ratedQuestions={ratedQuestions}
        unratedQuestions={unratedQuestions}
        handleRating={handleRating}
        submitRating={submitRating}
      />

      <div className="sticky bottom-0 bg-white pt-2">
        <form
          className="flex items-center justify-center w-full space-x-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitRating(unratedQuestions[0].id, true);
          }}
        >
          {unratedQuestions.length > 0 && (
            <Rating
              onClick={(rate: number) =>
                handleRating(unratedQuestions[0].id, rate, true)
              }
              initialValue={currentRating}
              SVGclassName="inline"
              showTooltip
              tooltipArray={tooltipArray}
            />
          )}

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium text-[#f9fafb] disabled:pointer-events-none disabled:opacity-50 bg-black hover:bg-[#111827E6] h-10 px-4 py-2"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

const ChatContainer = ({
  ratedQuestions,
  unratedQuestions,
  handleRating,
  submitRating,
}: {
  ratedQuestions: IRatingRow[];
  unratedQuestions: IRatingRow[];
  handleRating: (
    ratingId: number,
    rating: number,
    isUnratedBefore: boolean
  ) => void;
  submitRating: (ratingId: number, isUnratedBefore: boolean) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Scroll to bottom whenever messages change
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [ratedQuestions, unratedQuestions]);

  return (
    <div
      ref={containerRef}
      style={{
        overflowY: "auto",
        border: "1px solid #ccc",
        padding: "10px",
      }}
    >
      <div className="flex-1 overflow-auto mb-4">
        <div className="bg-yellow-100 p-5 rounded-lg">
          <div className="flex flex-col space-y-1.5 pb-6">
            <h2 className="font-semibold text-lg tracking-tight">
              Previously rated
            </h2>
            <p className="text-sm text-[#6b7280]">
              you can update ratings by clicking on the rating stars and
              clicking submit
            </p>
          </div>
          {ratedQuestions.map((q) => (
            <div key={q.id}>
              {messageFromAi(q.question)}
              {messageFromUser(
                `previous rating: ${q.rating} / 5`,
                <div className="flex flex-row gap-5 items-center">
                  <Rating
                    initialValue={q.rating}
                    SVGclassName="inline"
                    onClick={(rate: number) => handleRating(q.id, rate, false)}
                  />
                  <button
                    onClick={() => submitRating(q.id, false)}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium text-[#f9fafb] disabled:pointer-events-none disabled:opacity-50 bg-black hover:bg-[#111827E6] h-10 px-4 py-2"
                  >
                    Submit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 bg-lime-100 p-5 rounded-lg">
          <div className="flex flex-col space-y-1.5 pb-3">
            <h2 className="font-semibold text-lg tracking-tight">
              Please rate!
            </h2>

            {/* TODO: animate this */}
          </div>
          {unratedQuestions.length > 0 &&
            messageFromAi(unratedQuestions[0].question)}
        </div>
      </div>
    </div>
  );
};

/* <input
//   className="flex h-10 w-full rounded-md border border-[#e5e7eb] px-3 py-2 text-sm placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#9ca3af] disabled:cursor-not-allowed disabled:opacity-50 text-[#030712] focus-visible:ring-offset-2"
//   placeholder="Type your message"
//   //value={userInput}
//   //onChange={(e) => setUserInput(e.target.value)}
//   disabled
// />
// */
