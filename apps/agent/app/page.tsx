"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type SubmitEvent,
} from "react";
import { useEveAgent } from "eve/react";
import { CircleAlert } from "lucide-react";

import { AgentReport } from "@/components/agent-report";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { extractLatestAssistantReport } from "@/lib/extract-latest-assistant-report";
import { extractStructuredFindings } from "@/lib/extract-structured-findings";
import { validateGitHubRepository } from "@/lib/repository";

const PLATFORM_URL_KEY = "openhacker.platformUrl";
const PLATFORM_TOKEN_KEY = "openhacker.platformToken";

type NextRunResponse =
  | {
      run: {
        id: string;
        repository: string;
      };
      project?: {
        fullName: string;
      };
    }
  | { run: null };

export default function Home() {
  const [repo, setRepo] = useState("");
  const [error, setError] = useState("");
  const [platformUrl, setPlatformUrl] = useState("https://openhacker.ai");
  const [platformToken, setPlatformToken] = useState("");
  const [platformStatus, setPlatformStatus] = useState("");
  const [platformError, setPlatformError] = useState("");
  const [autoPoll, setAutoPoll] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isPostingResult, setIsPostingResult] = useState(false);
  const [activePlatformRunId, setActivePlatformRunId] = useState("");
  const [syncedPlatformRunId, setSyncedPlatformRunId] = useState("");
  const agent = useEveAgent();

  const scanning = agent.status === "submitted" || agent.status === "streaming";
  const hasAgentError = agent.status === "error";
  const normalizedPlatformUrl = platformUrl.trim().replace(/\/+$/, "");
  const hasPlatformConnection = Boolean(
    normalizedPlatformUrl && platformToken.trim(),
  );

  const report = useMemo(() => {
    if (scanning) return "";
    return extractLatestAssistantReport(agent.data.messages);
  }, [agent.data.messages, scanning]);

  const displayError = useMemo(() => {
    if (error) return error;
    if (hasAgentError) return String(agent.error ?? "Something went wrong.");
    return "";
  }, [error, hasAgentError, agent.error]);

  useEffect(() => {
    const savedUrl = window.localStorage.getItem(PLATFORM_URL_KEY);
    const savedToken = window.localStorage.getItem(PLATFORM_TOKEN_KEY);

    if (savedUrl) {
      setPlatformUrl(savedUrl);
    }

    if (savedToken) {
      setPlatformToken(savedToken);
    }
  }, []);

  const onRepoChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setRepo(e.target.value);
    setError((prev) => (prev ? "" : prev));
  }, []);

  const runRepositoryScan = useCallback(
    (repository: string) => {
      agent.reset();
      agent.send({
        message: `Analyze the GitHub repository ${repository} for security vulnerabilities.`,
      });
    },
    [agent],
  );

  const onSubmit = useCallback(
    (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (scanning) return;

      const validation = validateGitHubRepository(repo);
      if (!validation.ok) {
        setError(validation.error);
        return;
      }

      setError("");
      setActivePlatformRunId("");
      setSyncedPlatformRunId("");
      runRepositoryScan(validation.repository);
    },
    [repo, runRepositoryScan, scanning],
  );

  const savePlatformConnection = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanUrl = platformUrl.trim().replace(/\/+$/, "");
    const cleanToken = platformToken.trim();

    window.localStorage.setItem(PLATFORM_URL_KEY, cleanUrl);
    window.localStorage.setItem(PLATFORM_TOKEN_KEY, cleanToken);
    setPlatformUrl(cleanUrl);
    setPlatformToken(cleanToken);
    setPlatformError("");
    setPlatformStatus("Platform connection saved.");
  }, [platformToken, platformUrl]);

  const claimNextRun = useCallback(async () => {
    if (
      scanning ||
      isClaiming ||
      activePlatformRunId ||
      !hasPlatformConnection
    ) {
      return;
    }

    setIsClaiming(true);
    setPlatformError("");

    try {
      const response = await fetch(
        new URL("/api/agent/runs/next", normalizedPlatformUrl),
        {
          headers: {
            authorization: `Bearer ${platformToken.trim()}`,
          },
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | NextRunResponse
        | { error?: string }
        | null;

      if (!response.ok) {
        const message =
          payload && "error" in payload && payload.error
            ? payload.error
            : "Could not claim the next run.";
        throw new Error(message);
      }

      if (!payload || !("run" in payload) || !payload.run) {
        setPlatformStatus("Connected. No pending platform runs.");
        return;
      }

      setPlatformStatus(`Claimed ${payload.run.repository}. Running Eve now.`);
      setActivePlatformRunId(payload.run.id);
      setSyncedPlatformRunId("");
      setRepo(payload.run.repository);
      runRepositoryScan(payload.run.repository);
    } catch (err) {
      setPlatformError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsClaiming(false);
    }
  }, [
    activePlatformRunId,
    hasPlatformConnection,
    isClaiming,
    normalizedPlatformUrl,
    platformToken,
    runRepositoryScan,
    scanning,
  ]);

  useEffect(() => {
    if (!autoPoll || !hasPlatformConnection) {
      return;
    }

    void claimNextRun();
    const intervalId = window.setInterval(() => {
      void claimNextRun();
    }, 15_000);

    return () => window.clearInterval(intervalId);
  }, [autoPoll, claimNextRun, hasPlatformConnection]);

  useEffect(() => {
    if (
      !activePlatformRunId ||
      !report ||
      syncedPlatformRunId === activePlatformRunId ||
      !hasPlatformConnection
    ) {
      return;
    }

    async function postResult() {
      setIsPostingResult(true);
      setSyncedPlatformRunId(activePlatformRunId);
      setPlatformError("");

      try {
        const response = await fetch(
          new URL(
            `/api/agent/runs/${activePlatformRunId}/result`,
            normalizedPlatformUrl,
          ),
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${platformToken.trim()}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              markdown: report,
              findings: extractStructuredFindings(report),
            }),
          },
        );
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? "Could not post the report.");
        }

        setPlatformStatus("Report synced to openhacker.ai.");
        setActivePlatformRunId("");
      } catch (err) {
        setPlatformError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsPostingResult(false);
      }
    }

    void postResult();
  }, [
    activePlatformRunId,
    hasPlatformConnection,
    normalizedPlatformUrl,
    platformToken,
    report,
    syncedPlatformRunId,
  ]);

  useEffect(() => {
    if (
      !activePlatformRunId ||
      !hasAgentError ||
      syncedPlatformRunId === activePlatformRunId ||
      !hasPlatformConnection
    ) {
      return;
    }

    async function postFailure() {
      setSyncedPlatformRunId(activePlatformRunId);

      try {
        await fetch(
          new URL(
            `/api/agent/runs/${activePlatformRunId}/failure`,
            normalizedPlatformUrl,
          ),
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${platformToken.trim()}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              error: String(agent.error ?? "Eve run failed."),
            }),
          },
        );
        setActivePlatformRunId("");
      } catch (err) {
        setPlatformError(err instanceof Error ? err.message : String(err));
      }
    }

    void postFailure();
  }, [
    activePlatformRunId,
    agent.error,
    hasAgentError,
    hasPlatformConnection,
    normalizedPlatformUrl,
    platformToken,
    syncedPlatformRunId,
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          openhacker
        </h1>
      </header>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Connect to openhacker.ai</CardTitle>
          <CardDescription>
            Paste the platform token from your team dashboard. This agent polls
            outbound for pending runs and sends reports back to that team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={savePlatformConnection}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                aria-label="Platform URL"
                onChange={(event) => setPlatformUrl(event.target.value)}
                placeholder="https://openhacker.ai"
                value={platformUrl}
              />
              <Input
                aria-label="Platform token"
                onChange={(event) => setPlatformToken(event.target.value)}
                placeholder="ohag_..."
                type="password"
                value={platformToken}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit">Save connection</Button>
              <Button
                disabled={!hasPlatformConnection || isClaiming || scanning}
                onClick={() => void claimNextRun()}
                type="button"
                variant="secondary"
              >
                {isClaiming ? "Checking" : "Check for work"}
              </Button>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  checked={autoPoll}
                  onChange={(event) => setAutoPoll(event.target.checked)}
                  type="checkbox"
                />
                Poll every 15s
              </label>
            </div>
          </form>
          {platformStatus ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {platformStatus}
              {isPostingResult ? " Syncing report..." : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Manual local scan</CardTitle>
          <CardDescription>owner/name or full GitHub URL</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_auto]"
            onSubmit={onSubmit}
          >
            <Input
              type="text"
              value={repo}
              onChange={onRepoChange}
              placeholder="owner/repo"
              aria-label="GitHub repository"
              aria-invalid={Boolean(error)}
            />
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={scanning || !repo.trim()}
            >
              {scanning ? "Running" : "Analyze"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {scanning || report ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardDescription>Report</CardDescription>
          </CardHeader>
          <CardContent>
            {report ? (
              <AgentReport markdown={report} />
            ) : (
              <p className="text-sm text-muted-foreground">hacking...</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {displayError ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      ) : null}

      {platformError ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{platformError}</AlertDescription>
        </Alert>
      ) : null}
    </main>
  );
}
