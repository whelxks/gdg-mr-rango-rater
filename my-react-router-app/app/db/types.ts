import { z } from 'zod';

const ZRatingSchema = z.object({
    id: z.number(),
    userId: z.number(),
    activityId: z.number(),
    rating: z.number().min(1).max(5),
    question: z.string(),
    topic: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
});

export type IRating = z.infer<typeof ZRatingSchema>
