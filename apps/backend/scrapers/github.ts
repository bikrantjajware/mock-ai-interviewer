import axios from "axios"
import { HttpsProxyAgent } from "https-proxy-agent"
import type { any } from "zod"


const GITHUB_REPO_KEYS = ['name', 'full_name', 'description', 'language', 'topics', 'html_url', 'created_at', 'pushed_at', 'star_gazers']

const host = "gw.dataimpulse.com"
const port = 823
const httpsAgent = new HttpsProxyAgent(`https://${process.env.BACKEND_PROXY_USER}:${process.env.BACKEND_PROXY_PASSWORD}@${host}:${port}`)

export async function scrapeGithub(username: string) {
    const userRepos = await axios.request({
        url: `https://api.github.com/users/${username}/repos`,
        // httpsAgent
    })
    console.log("user_repos")
    
    const filteredRepos = userRepos.data.filter((repo:any) => repo?.owner?.login == username).map( (repo:any) => {
        const filteredRepo: any = {};
        
        GITHUB_REPO_KEYS.forEach((key) => {
            filteredRepo[key] = repo[key];
        });
        return filteredRepo
    })
    console.log(filteredRepos)
    return filteredRepos

}