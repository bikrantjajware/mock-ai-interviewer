import express, { json } from "express"
import { PreInterviewBody } from "./types"
import axios from "axios"
import cors from "cors"
import { scrapeGithub } from "./scrapers/github"
import { prisma } from "./db"
import { InterviewStatus } from "./generates/prisma/enums"
import crypto from "crypto";
import { initSideband } from "./utils/sideband"
import { handleEndInterview } from "./utils/result"
import { WebSocketServer, WebSocket } from "ws"


const app = express()
app.use(express.json())
app.use(cors())
app.use(express.text({ type: ["application/sdp", "text/plain"] })); // for SDP response from OpenAI

const sessionConfig = JSON.stringify({
  type: "realtime",
  model: "gpt-realtime-2.1",
  audio: { output: { voice: "marin" } },
});



app.get('/health', (req,res) =>{

    res.json({ health: 'server is healthy' })
})

const server = app.listen(8000, () => {
      console.log(`🚀 Server running locally at http://localhost:${8000}`)
})

const wss = new WebSocketServer({ server });



app.post('/api/v1/pre-interview', async (req,res) => {
    console.log("start")
    
    const { success, data} = PreInterviewBody.safeParse(req.body)
    
    if (!success){
        res.status(411).json({
            message: "Incorrect Body"
        })
        return
    }
    console.log("validation")
    
    const githubUsername = data.github.trim().split('/').filter(Boolean).pop() || ''
    // const linkedinUsername = data.linkedin.trim().split('/').filter(Boolean).pop()
    console.log("github", githubUsername)

    const githubScrapedData = await scrapeGithub(githubUsername)
    console.log("scrape")
    
    // res.json({ github: githubScrapedData })

    const interview = await prisma.interview.create({
        data:{
            githubMetaData: JSON.stringify(githubScrapedData),
            status: InterviewStatus.Pre
        }
    })
    res.json({ id: interview.id , message: 'interview created successfully '})
    // TODO: add later, linkedin scraping is harder
    // scraping Linkedin profile


})


// An endpoint which creates a Realtime API session.
app.post("/session", async (req, res) => {
  const fd = new FormData();

  const interviewId = req.headers['x-interview-id'] as string

  const safetyIdentifier = crypto
  .createHash("sha256")
  .update(interviewId)
  .digest("hex");



  fd.set("sdp", req.body);
  fd.set("session", sessionConfig);
  // console.log("api_key",process.env.OPENAI_API_KEY)

  try {
    const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Safety-Identifier": safetyIdentifier
      },
      body: fd,
    });
    // Send back the SDP we received from the OpenAI REST API
    const sdp = await sdpResponse.text();

    // # setup server --> OpenAI sideband
    // Location: /v1/realtime/calls/rtc_123456
    const location = sdpResponse.headers.get("Location");
    const callId = location?.split("/").pop();
    // console.log("callId", callId);

    res.send(sdp);
    await initSideband(callId, interviewId)
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});


app.post('/api/v1/end-interview', async (req, res) => {
	const interviewId = req.body?.interviewId as string
	if (!interviewId){
		res.status(400).json({ message: 'Missing interviewId' })
		return
	}
  const interview = await prisma.interview.findUnique({
		where: { id: interviewId },
		include: { conversation: {
      orderBy: { createdAt: 'asc' }
    } }
	})
	if (!interview){
		res.status(404).json({ message: 'Interview not found' })
		return
	}
  if (interview.status === InterviewStatus.Done) {
    res.json({ message: 'Interview already ended' })
		return
	}

  const claim = await prisma.interview.updateMany({
    where: {
      id: interviewId,
      status: { not: InterviewStatus.Done }
    },
    data: { status: InterviewStatus.Done }
  })
  if (claim.count === 0) {
    res.status(202).json({ message: 'Interview analysis is already done' })
    return
  }

	const messages = interview.conversation.map( msg => {
		return {
			message: msg.message,
			author: msg.author,
			createdAt: msg.createdAt
		}
	})
  try {
    const result = await handleEndInterview(messages)

    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        feedback: result.feedback,
        score: result.score
      }
    })

    res.json({ message: 'Interview ended successfully' })
  } catch (error) {
    await prisma.interview.update({
      where: { id: interviewId },
      data: { status: interview.status }
    })
    console.error('Failed to analyze interview:', error)
    res.status(500).json({ message: 'Failed to analyze interview' })
  }

})



app.get('/api/v1/interview/result/:interviewId', async (req, res) => {

	// TODO: add ownership check for interviewId
	const interviewId = req.params.interviewId

	const interview = await prisma.interview.findUnique({
		where: { id: interviewId },
		include: { conversation: {
			orderBy: { createdAt: 'asc' }
		} }
	})

	if (!interview || interview.status !== InterviewStatus.Done || !interview.feedback) {
		res.status(404).json({ message: 'Interview result not found' })
		return
	}

	const conversation = interview.conversation.map(msg => ({
		message: msg.message,
		author: msg.author,
		createdAt: msg.createdAt
	}));

	res.json({ feedback: interview.feedback, score: interview.score, conversation })

})


wss.on('connection', async (browserWs, req) => {
  console.log('Browser connected via WebSocket');

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const interviewId = url.searchParams.get("interviewId");
  // TODO: handle interview id securely
  if (!interviewId) {
    browserWs.close(1008, "Missing interviewId");
    return;
  }

  try {

    const dgWs = new WebSocket("wss://api.deepgram.com/v1/listen?model=nova-3&language=en-US",
      {
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      },
    });

    const pendingAudio: Buffer[] = [];

    browserWs.on("message", (message: Buffer) => {
      console.log("🔥 Browser audio:", message.length);

      if (dgWs.readyState === WebSocket.OPEN) {
        dgWs.send(message);
      } else if (dgWs.readyState === WebSocket.CONNECTING) {
        pendingAudio.push(message); //this fixed the deepgram transcript issue
      }
    });

    dgWs.on("open", () => {
      for (const message of pendingAudio) {
        dgWs.send(message);
      }
      pendingAudio.length = 0;
    });


    dgWs.on("message", async (data) => {
        const received = JSON.parse(data.toString());

        console.log("🔥 Deepgram:", received);

        const transcript =
          received.channel?.alternatives?.[0]?.transcript;

        if (
          transcript?.trim() && browserWs.readyState === WebSocket.OPEN
        ) {
          console.log({ transcript })
          browserWs.send(
            JSON.stringify({
              type: "transcript",
              text: transcript,
            })
          );
          await prisma.message.create({
            data:{
              interviewId: interviewId,
              author: 'user',
              message: transcript,
            }
          })
          console.log("transcript", transcript)
        }
      });

    dgWs.on("error", (err) => {
      console.error("🔥 Deepgram error:", err);
    });

    dgWs.on("close", (code, reason) => {
      console.log(
        "🔥 Deepgram closed:",
        code,
        reason.toString()
      );
    });

    browserWs.on("close", () => {
      console.log("Browser disconnected");

      if (dgWs.readyState === WebSocket.OPEN) {
        dgWs.close();
      }
    });
  
  } catch (error) {
      console.error('Failed to initialize Deepgram Client:', error);
  }

});
