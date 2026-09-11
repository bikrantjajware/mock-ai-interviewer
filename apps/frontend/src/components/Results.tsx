import { BACKEND_URL } from "@/lib/config";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

type Result = {
  feedback: string;
  score: number;
  conversation: {
    message: string;
    author: string;
    createdAt?: string | Date;
  }[];
};

const formatTimestamp = (value?: string | Date) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export function Results() {
  const { interviewId } = useParams();
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!interviewId) {
      setError("Missing interview id.");
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchResult = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${BACKEND_URL}/api/v1/interview/result/${interviewId}`);

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || `Failed to load result (${response.status})`);
        }

        const data: Result = await response.json();

        if (isMounted) {
          setResult(data);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load interview result.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchResult();

    return () => {
      isMounted = false;
    };
  }, [interviewId]);

  if (!interviewId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <Card className="w-full max-w-xl border-red-200 bg-white">
          <CardContent className="p-6 text-center text-red-600">
            <p className="text-lg font-semibold">Interview result is unavailable.</p>
            <p className="mt-2 text-sm text-slate-600">No interview id was found in the route.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        {loading ? (
          <Card className="border-slate-200 bg-white">
            <CardContent className="flex min-h-40 items-center justify-center text-slate-600">
              Loading your interview result...
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-red-200 bg-white">
            <CardHeader>
              <CardTitle className="text-red-600">Unable to load the result</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : result ? (
          <>
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-700 text-white">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Interview score</p>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-5xl font-bold tracking-tight">{result.score}</span>
                      <span className="text-lg text-slate-300">/ 10</span>
                    </div>
                  </div>

                  <div className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-200">
                    {result.score >= 8
                      ? "Strong performance"
                      : result.score >= 6
                        ? "Solid effort"
                        : result.score >= 4
                          ? "Needs improvement"
                          : "Needs more practice"}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Feedback</p>
                  <p className="whitespace-pre-wrap text-base leading-7 text-slate-700">{result.feedback}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Conversation transcript</CardTitle>
                <CardDescription>Review how the interview unfolded.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 p-6">
                {result.conversation.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                    No transcript available for this interview.
                  </div>
                ) : (
                  result.conversation.map((entry, index) => {
                    const isUser = entry.author?.toLowerCase() === "user";
                    const authorLabel = isUser ? "You" : "AI";

                    return (
                      <div
                        key={`${entry.author}-${index}-${entry.message.slice(0, 20)}`}
                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${isUser ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                          <div className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${isUser ? "text-sky-100" : "text-slate-500"}`}>
                            {authorLabel}
                          </div>
                          <p className="whitespace-pre-wrap leading-7">{entry.message}</p>
                          {entry.createdAt ? (
                            <div className={`mt-2 text-[10px] ${isUser ? "text-sky-100" : "text-slate-500"}`}>
                              {formatTimestamp(entry.createdAt)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}