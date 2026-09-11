import { GoogleGenAI } from "@google/genai";
import * as z from "zod";

const client = new GoogleGenAI({apiKey: process.env.GOOGLE_API_KEY || ""});


type Message = {
    message: string;
    author: string;
    createdAt: Date;
}

const RESULT_PROMPT = `
   You are a Senior Technical Recruiter and Expert Interview Assessor. Analyze the provided interview transcript between the User and the Interviewer.

    Evaluate the User's performance based on the following criteria:
    1. Clarity and structure of communication.
    2. Accuracy, depth, and relevance of answers.
    3. Confidence and professional tone.

    Generate an objective score from 1.0 to 10.0. Provide highly specific, actionable feedback. You must explicitly mention at least one key strength and one critical area for improvement, referencing specific moments from the transcript.
    You must return a valid JSON object. 
    The JSON object must contain exactly two keys: "feedback" (a string) and "score" (a number).
    Example output:
    {
    "feedback": "Your communication was clear...",
    "score": 7.5
    }

    TRANSCRIPT TO EVALUATE:
    {{USER_TRANSCRIPT}}
`


const outputSchema = z.object({
    feedback: z.string().describe("Feedback for the user"),
    score: z.number().describe("Score out of 10 for their interview"),
});



export async function handleEndInterview(messages: Message[]){
    const interaction = await client.interactions.create({
        model: "gemini-3.5-flash-lite",
        input: RESULT_PROMPT.replace("{{USER_TRANSCRIPT}}", JSON.stringify(messages)),
        response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: {
                type: 'object',
                properties: {
                    feedback: { type: 'string', description: "Feedback for the user" },
                    score: { type: 'number', description: "Score out of 10 for their interview" }
                },
                required: ["feedback", "score"]
        }
        },
    });
    const outputText = interaction.output_text;
    if (!outputText) {
        throw new Error(`Gemini returned no text output: ${JSON.stringify(interaction)}`);
    }

    console.log(outputText);
    const result = outputSchema.parse(JSON.parse(outputText));
    console.log("end result", result);
    return result;
}

