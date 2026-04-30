/**
 * 複数ターン design iteration のための session 状態管理。
 * session file は PID + timestamp を key とする JSON を /tmp に置く。
 */

import fs from "fs";
import path from "path";

export interface DesignSession {
  id: string;
  lastResponseId: string;
  originalBrief: string;
  feedbackHistory: string[];
  outputPaths: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * PID + timestamp で一意な session ID を生成。
 */
export function createSessionId(): string {
  return `${process.pid}-${Date.now()}`;
}

/**
 * session file の path を取得。
 */
export function sessionPath(sessionId: string): string {
  return path.join("/tmp", `design-session-${sessionId}.json`);
}

/**
 * 初回生成後に新規 session を作成。
 */
export function createSession(
  responseId: string,
  brief: string,
  outputPath: string,
): DesignSession {
  const id = createSessionId();
  const session: DesignSession = {
    id,
    lastResponseId: responseId,
    originalBrief: brief,
    feedbackHistory: [],
    outputPaths: [outputPath],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(sessionPath(id), JSON.stringify(session, null, 2), { mode: 0o600 });
  return session;
}

/**
 * disk から既存 session を読み出し。
 */
export function readSession(sessionFilePath: string): DesignSession {
  const content = fs.readFileSync(sessionFilePath, "utf-8");
  return JSON.parse(content);
}

/**
 * 新しい iteration data で session を更新。
 */
export function updateSession(
  session: DesignSession,
  responseId: string,
  feedback: string,
  outputPath: string,
): void {
  session.lastResponseId = responseId;
  session.feedbackHistory.push(feedback);
  session.outputPaths.push(outputPath);
  session.updatedAt = new Date().toISOString();

  fs.writeFileSync(sessionPath(session.id), JSON.stringify(session, null, 2));
}
