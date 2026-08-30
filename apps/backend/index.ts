import express, { json } from "express"
import { PreInterviewBody } from "./types"
import axios from "axios"
import cors from "cors"
import { scrapeGithub } from "./scrapers/github"
import { prisma } from "./db"
import { InterviewStatus } from "./generates/prisma/enums"
import crypto from "crypto";


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
  console.log("api_key",process.env.OPENAI_AI_KEY)

  try {
    const r = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_AI_KEY}`,
        "OpenAI-Safety-Identifier": safetyIdentifier
      },
      body: fd,
    });
    // Send back the SDP we received from the OpenAI REST API
    const sdp = await r.text();
    res.send(sdp);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});




app.listen(8000, () => {
      console.log(`🚀 Server running locally at http://localhost:${8000}`)
})