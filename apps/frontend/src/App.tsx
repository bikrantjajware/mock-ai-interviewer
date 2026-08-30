import "./styles/globals.css"
import { Form } from "./components/Form"
import { Interview } from "./components/Interview"
import { Results } from "./components/Results"
import { useState } from "react";
import { Toaster } from "sonner";
import { BrowserRouter, Routes, Route } from "react-router"


type PageTypes = "form" | "interview" | "results"

export function App() {

  const [page, setPage] = useState<PageTypes>("form")

  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <Toaster position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="" element={<Form/> } />
          <Route path="/interview/:interviewId" element={<Interview/> }/>
          <Route path="/results/:interviewId" element={<Results/> } />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
