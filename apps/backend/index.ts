import express, { json } from "express"
import { PreInterviewBody } from "./types"
import axios from "axios"
import cors from "cors"
import { scrapeGithub } from "./scrapers/github"
import { prisma } from "./db"
import { InterviewStatus } from "./generates/prisma/enums"

const app = express()
app.use(express.json())
app.use(cors())
app.use(express.text({ type: ["application/sdp", "text/plain"] }));



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





app.listen(8000, () => {
      console.log(`🚀 Server running locally at http://localhost:${8000}`)
})