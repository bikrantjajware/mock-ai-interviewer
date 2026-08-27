import z from "zod"


export const PreInterviewBody = z.object({
    github: z.string(),
    // linkedin: z.string()
})