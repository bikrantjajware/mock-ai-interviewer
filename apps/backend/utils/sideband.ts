import WebSocket from "ws";

export async function initSideband(callId: string | undefined, interviewId: string) {
    if (!callId) {
        throw new Error("OpenAI callId is missing; cannot initialize sideband websocket.");
    }

    const url = "wss://api.openai.com/v1/realtime?call_id=" + callId;
    const ws = new WebSocket(url, {
        headers: {
            Authorization: "Bearer " + process.env.OPENAI_API_KEY,
        },
    });

    const role = "software engineer";
    const systemPrompt = `You are an expert HR interviewer for the ${role} position. Greet the candidate warmly, mention the role, and ask the first question tailored to this position. Keep your responses concise, professional, and conversational. Wait for the candidate's response before asking follow-up questions or moving to the next topic.`;

    await new Promise<void>((resolve, reject) => {
        const onOpen = () => {
            cleanup();
            resolve();
        };

        const onError = (error: Error) => {
            cleanup();
            reject(error);
        };
        const cleanup = () => {
            ws.off("open", onOpen);
            ws.off("error", onError);
        };

        ws.once("open", onOpen);
        ws.once("error", onError);
    });

    ws.send(
        JSON.stringify({
            type: "session.update",
            session: {
                type: "realtime",
                model: "gpt-realtime-2.1",
                instructions: systemPrompt,
            },
        })
    );

    ws.on("message", function incoming(message) {
        const parsed = JSON.parse(message.toString());
        if(parsed.type == "response.done"){
            let contents: {type: string, transcript: string}[] = [];
            parsed.response.output.map((x:any) => contents = [...contents, ...x.content]);
            const assistantMessage = contents.filter(x => x.type === "output_audio").map(x => x.transcript).join(" ");
        }
    });

    ws.on("close", (code, reason) => {
        console.log("OpenAI sideband closed", { interviewId, code, reason: reason.toString() });
    });

    ws.on("error", (error) => {
        console.error("OpenAI sideband websocket error", { interviewId, error });
    });
}