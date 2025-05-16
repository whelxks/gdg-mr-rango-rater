import { z } from 'zod';

const ZQuestionTopicSchema = z.object({
    question: z.string(),
    topic: z.string()
});
const ZQuestionTopicResponseSchema = z.array(ZQuestionTopicSchema);

const ZRatingRowSchema = z.object({
    id: z.number(),
    user_id: z.number(),
    activity_id: z.number(),
    rating: z.number(),
    question: z.string(),
    topic: z.string(),
});

const ZRatingActivitySchema = ZRatingRowSchema.merge(z.object({
    activity: z.string()
}));

export type IQuestionTopic = z.infer<typeof ZQuestionTopicSchema>
export type IQuestionTopicResponse = z.infer<typeof ZQuestionTopicResponseSchema>
export type IRatingRow = z.infer<typeof ZRatingRowSchema>
export type IRatingActivity = z.infer<typeof ZRatingActivitySchema>